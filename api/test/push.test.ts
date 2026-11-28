import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { alertOf, auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

/** Дождаться фоновой рассылки (она не задерживает ответ медиасерверу). */
async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 2000): Promise<void> {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeoutMs) throw new Error("Не дождались");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const token = (seed: string) => seed.repeat(64).slice(0, 64);

describe("Push-уведомления", () => {
  let t: TestApp;
  let streamer: TestUser;
  let fan: TestUser;
  let quiet: TestUser;

  before(async () => {
    t = await createTestApp();
    streamer = await registerUser(t.app, { username: "pushstar", displayName: "Звезда" });
    fan = await registerUser(t.app);
    quiet = await registerUser(t.app);
    for (const user of [fan, quiet]) {
      await t.app.inject({ method: "PUT", url: "/api/channels/pushstar/follow", headers: auth(user) });
    }
  });
  after(() => t.close());

  it("устройство привязывается к вошедшему пользователю", async () => {
    const anonymous = await t.app.inject({ method: "PUT", url: "/api/me/devices", payload: { token: token("a"), environment: "production" } });
    assert.equal(anonymous.statusCode, 401);

    const bad = await t.app.inject({ method: "PUT", url: "/api/me/devices", headers: auth(fan), payload: { token: "zzz", environment: "production" } });
    assert.equal(bad.statusCode, 400);

    for (const [user, seed] of [[fan, "a"], [quiet, "b"]] as const) {
      const response = await t.app.inject({
        method: "PUT",
        url: "/api/me/devices",
        headers: auth(user),
        payload: { token: token(seed).toUpperCase(), environment: "production" },
      });
      assert.equal(response.statusCode, 200);
    }
  });

  it("можно выключить уведомления о начале эфира", async () => {
    const off = await t.app.inject({ method: "PUT", url: "/api/me/notifications", headers: auth(quiet), payload: { live: false } });
    assert.deepEqual(off.json(), { live: false });
    const read = await t.app.inject({ method: "GET", url: "/api/me/notifications", headers: auth(quiet) });
    assert.deepEqual(read.json(), { live: false });
  });

  it("начало эфира уведомляет подписчиков, но не тех, кто выключил уведомления", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/pushstar" });
    await waitFor(() => t.pushes.length > 0);
    assert.equal(t.pushes.length, 1);
    assert.equal(t.pushes[0]!.device.token, token("a"));
    assert.equal(alertOf(t.pushes[0]!).title, "Звезда");
    assert.equal(alertOf(t.pushes[0]!).channel, "pushstar");
  });

  it("переподключение OBS не рассылает повторно", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/pushstar" });
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/pushstar" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(t.pushes.length, 1);
  });

  it("отключённое устройство забывается", async () => {
    t.pushResults.set(token("a"), "unregistered");
    await t.ctx.db.pool.query("UPDATE channels SET live_push_at = NULL WHERE user_id = $1", [streamer.id]);
    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/pushstar" });
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/pushstar" });
    await waitFor(async () => (await t.ctx.db.one("SELECT 1 FROM devices WHERE token = $1", [token("a")])) === null);
    assert.equal(t.pushes.length, 2);
  });

  it("ключ APNs задаёт только администратор и он не отдаётся обратно", async () => {
    const admin = await registerUser(t.app, { email: "admin@efirelle.test" });
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const payload = { keyId: "ABCDE12345", teamId: "LX28D9L98A", privateKey: pem };

    const forbidden = await t.app.inject({ method: "PUT", url: "/api/admin/push", headers: auth(fan), payload });
    assert.equal(forbidden.statusCode, 403);

    const wrong = await t.app.inject({ method: "PUT", url: "/api/admin/push", headers: auth(admin), payload: { ...payload, privateKey: "x".repeat(120) } });
    assert.equal(wrong.statusCode, 400);

    const saved = await t.app.inject({ method: "PUT", url: "/api/admin/push", headers: auth(admin), payload });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.json().configured, true);
    assert.equal(saved.json().keyId, "ABCDE12345");
    assert.equal(JSON.stringify(saved.json()).includes("PRIVATE"), false);
  });

  it("удаление аккаунта удаляет его устройства", async () => {
    await t.app.inject({ method: "PUT", url: "/api/me/devices", headers: auth(quiet), payload: { token: token("c"), environment: "sandbox" } });
    await t.app.inject({ method: "DELETE", url: "/api/me", headers: auth(quiet), payload: { password: "very-secret-1" } });
    assert.equal(await t.ctx.db.one("SELECT 1 FROM devices WHERE user_id = $1", [quiet.id]), null);
  });
});
