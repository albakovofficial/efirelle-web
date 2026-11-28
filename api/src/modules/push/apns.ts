import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { connect, type ClientHttp2Session, type ClientHttp2Stream } from "node:http2";

/** Ключ APNs из Apple Developer → Keys (файл AuthKey_XXXX.p8). */
export interface ApnsCredentials {
  keyId: string;
  teamId: string;
  privateKey: string;
}

export interface PushDevice {
  token: string;
  environment: "production" | "sandbox";
}

/** Одно уведомление: что показать и как срочно. Содержимое собирается в payloads.ts. */
export interface ApnsPush {
  /** alert — обычное уведомление, liveactivity — Live Activity на экране блокировки и в Dynamic Island. */
  type: "alert" | "liveactivity";
  /** 10 — доставить сразу, 5 — когда удобно устройству (бережёт лимит обновлений Live Activity). */
  priority: 5 | 10;
  payload: { aps: Record<string, unknown> } & Record<string, unknown>;
}

/** unregistered — устройство больше не принимает уведомления, токен можно забыть. */
export type PushResult = "sent" | "unregistered" | "failed";

export interface PushSender {
  send(device: PushDevice, push: ApnsPush): Promise<PushResult>;
  close(): void;
}

const HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

/** Apple принимает токен авторизации не дольше часа; обновляем с запасом. */
const TOKEN_LIFETIME_MS = 50 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const UNREGISTERED_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"]);

/** Проверяет ключ заранее, чтобы в админке сразу сказать, что файл не тот. */
export function parsePrivateKey(pem: string): KeyObject {
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ec") throw new Error("Это не ключ APNs");
  return key;
}

/**
 * Отправка через HTTP/2 API Apple с авторизацией по ключу (JWT ES256).
 * `topic` — bundle id приложения; у Live Activity к нему добавляется «.push-type.liveactivity».
 */
export function createApnsSender(credentials: ApnsCredentials, topic: string): PushSender {
  const key = parsePrivateKey(credentials.privateKey);
  const sessions = new Map<string, ClientHttp2Session>();
  let jwt = { value: "", issuedAt: 0 };

  function authorization(): string {
    if (Date.now() - jwt.issuedAt > TOKEN_LIFETIME_MS) {
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const issuedAt = Date.now();
      const input = `${encode({ alg: "ES256", kid: credentials.keyId })}.${encode({ iss: credentials.teamId, iat: Math.floor(issuedAt / 1000) })}`;
      const signature = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
      jwt = { value: `${input}.${signature}`, issuedAt };
    }
    return `bearer ${jwt.value}`;
  }

  function session(host: string): ClientHttp2Session {
    const existing = sessions.get(host);
    if (existing && !existing.closed && !existing.destroyed) return existing;
    const created = connect(host);
    created.on("error", () => sessions.delete(host));
    created.on("close", () => sessions.delete(host));
    sessions.set(host, created);
    return created;
  }

  return {
    send(device, push) {
      const payload = JSON.stringify(push.payload);
      return new Promise<PushResult>((resolve) => {
        let request: ClientHttp2Stream;
        try {
          request = session(HOSTS[device.environment]).request({
            ":method": "POST",
            ":path": `/3/device/${device.token}`,
            authorization: authorization(),
            "apns-topic": push.type === "liveactivity" ? `${topic}.push-type.liveactivity` : topic,
            "apns-push-type": push.type,
            "apns-priority": String(push.priority),
            "content-type": "application/json",
          });
        } catch {
          resolve("failed");
          return;
        }
        let status = 0;
        let body = "";
        request.setTimeout(REQUEST_TIMEOUT_MS, () => request.close());
        request.on("response", (headers) => {
          status = Number(headers[":status"]);
        });
        request.setEncoding("utf8");
        request.on("data", (chunk: string) => {
          body += chunk;
        });
        request.on("end", () => {
          if (status === 200) return resolve("sent");
          const reason = (() => {
            try {
              return (JSON.parse(body) as { reason?: string }).reason ?? "";
            } catch {
              return "";
            }
          })();
          resolve(status === 410 || UNREGISTERED_REASONS.has(reason) ? "unregistered" : "failed");
        });
        request.on("error", () => resolve("failed"));
        request.end(payload);
      });
    },
    close() {
      for (const item of sessions.values()) item.close();
      sessions.clear();
    },
  };
}
