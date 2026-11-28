import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import WebSocket from "ws";
import { createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

type Event = Record<string, unknown>;

/** Ждёт событие нужного типа (и, если задано, удовлетворяющее условию) из WebSocket. */
function nextEvent(socket: WebSocket, type: string, matches: (event: Event) => boolean = () => true): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Нет события ${type}`)), 3000);
    const onMessage = (data: WebSocket.RawData) => {
      const event = JSON.parse(String(data)) as Event;
      if (event.type !== type || !matches(event)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(event);
    };
    socket.on("message", onMessage);
  });
}

function connect(base: string, slug: string, user?: TestUser): Promise<WebSocket> {
  const socket = new WebSocket(`${base}/api/channels/${slug}/ws`, {
    headers: user ? { authorization: `Bearer ${user.token}` } : {},
  });
  return new Promise((resolve, reject) => {
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

describe("Чат в реальном времени", () => {
  let t: TestApp;
  let base: string;
  let author: TestUser;

  before(async () => {
    t = await createTestApp();
    await registerUser(t.app, { username: "host" });
    author = await registerUser(t.app, { username: "talker", displayName: "Говорун" });
    const address = await t.app.listen({ port: 0, host: "127.0.0.1" });
    base = address.replace("http", "ws");
  });
  after(async () => {
    await t.close();
  });

  test("зрители считаются, сообщение доходит до всех", async () => {
    const watcher = await connect(base, "host");
    const twoViewers = nextEvent(watcher, "viewers", (event) => event.count === 2);
    const writer = await connect(base, "host", author);
    await twoViewers;

    const received = nextEvent(watcher, "message");
    writer.send(JSON.stringify({ type: "send", text: "Всем привет" }));
    const event = await received;
    assert.equal((event.message as { text: string }).text, "Всем привет");
    assert.equal((event.message as { author: string }).author, "Говорун");

    watcher.close();
    writer.close();
  });

  test("аноним не может писать", async () => {
    const anonymous = await connect(base, "host");
    const error = nextEvent(anonymous, "error");
    anonymous.send(JSON.stringify({ type: "send", text: "я тут" }));
    assert.match(String((await error).message), /Войдите/);
    anonymous.close();
  });
});
