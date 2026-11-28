import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

describe("Модерация чата", () => {
  let t: TestApp;
  let streamer: TestUser;
  let fan: TestUser;
  let stranger: TestUser;

  const say = (user: TestUser, text: string) =>
    t.app.inject({ method: "POST", url: "/api/channels/guard/chat", headers: auth(user), payload: { text } });

  before(async () => {
    t = await createTestApp();
    streamer = await registerUser(t.app, { username: "guard" });
    fan = await registerUser(t.app);
    stranger = await registerUser(t.app);
    await t.app.inject({ method: "PUT", url: "/api/channels/guard/follow", headers: auth(fan) });
  });
  after(() => t.close());

  it("по умолчанию ограничений нет", async () => {
    const settings = (await t.app.inject({ method: "GET", url: "/api/studio/moderation", headers: auth(streamer) })).json();
    assert.deepEqual(settings, { slowModeSeconds: 0, followersOnly: false, blockedWords: [], hiddenThisStream: 0 });
  });

  it("настройки проверяются и сразу видны зрителям", async () => {
    const wrong = await t.app.inject({ method: "PATCH", url: "/api/studio/moderation", headers: auth(streamer), payload: { slowModeSeconds: 7 } });
    assert.equal(wrong.statusCode, 400);
    const saved = await t.app.inject({
      method: "PATCH",
      url: "/api/studio/moderation",
      headers: auth(streamer),
      payload: { slowModeSeconds: 10, followersOnly: true, blockedWords: ["Казино", "казино", " ставки "] },
    });
    assert.deepEqual(saved.json().blockedWords, ["казино", "ставки"]);
    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/guard/watch" })).json();
    assert.deepEqual(watch.chatRules, { slowModeSeconds: 10, followersOnly: true });
  });

  it("не подписчик не может писать", async () => {
    const response = await say(stranger, "привет");
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, "followers_only");
  });

  it("медленный режим не даёт писать чаще", async () => {
    assert.equal((await say(fan, "привет")).statusCode, 201);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const again = await say(fan, "ещё раз");
    assert.equal(again.statusCode, 429);
    assert.equal(again.json().error, "slow_mode");
  });

  it("запрещённые слова не попадают в чат, автор пишет без ограничений", async () => {
    await t.app.inject({ method: "PATCH", url: "/api/studio/moderation", headers: auth(streamer), payload: { slowModeSeconds: 0 } });
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const blocked = await say(fan, "Заходите в КАЗИНО");
    assert.equal(blocked.statusCode, 400);
    assert.equal(blocked.json().error, "blocked_word");
    assert.equal((await say(streamer, "про казино здесь не пишем")).statusCode, 201);
  });
});
