import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { auth, createTestApp, registerUser, streamKey, type TestApp, type TestUser } from "./helpers.js";

describe("Эфиры, подписки, прогнозы, модерация", () => {
  let t: TestApp;
  let streamer: TestUser;
  let viewer: TestUser;

  before(async () => {
    t = await createTestApp();
    streamer = await registerUser(t.app, { username: "timur", displayName: "Тимур Север" });
    viewer = await registerUser(t.app, { username: "anya", displayName: "Аня" });
  });
  after(async () => {
    await t.close();
  });

  test("медиасервер пускает в эфир только с верным ключом", async () => {
    const key = await streamKey(t.app, streamer);
    const authorize = (query: string) =>
      t.app.inject({ method: "POST", url: "/api/internal/media/auth", payload: { action: "publish", path: "live/timur", query } });
    assert.equal((await authorize(`key=${key}`)).statusCode, 200);
    assert.equal((await authorize("key=wrong")).statusCode, 401);

    const read = await t.app.inject({ method: "POST", url: "/api/internal/media/auth", payload: { action: "read", path: "live/timur" } });
    assert.equal(read.statusCode, 200);
  });

  test("служебные адреса недоступны снаружи", async () => {
    const response = await t.app.inject({
      method: "POST",
      url: "/api/internal/media/ready?path=live/timur",
      remoteAddress: "203.0.113.5",
    });
    assert.equal(response.statusCode, 403);
  });

  test("начало эфира: канал в списке идущих, есть ссылка на видео", async () => {
    await t.app.inject({ method: "PATCH", url: "/api/studio", headers: auth(streamer), payload: { title: "Финал сезона", categoryId: "strategy", tags: ["Русский"] } });
    const ready = await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/timur" });
    assert.equal(ready.statusCode, 200);

    const live = (await t.app.inject({ method: "GET", url: "/api/streams/live" })).json().streams;
    assert.equal(live.length, 1);
    assert.equal(live[0].title, "Финал сезона");
    assert.equal(live[0].category, "Стратегии");
    assert.equal(live[0].playbackUrl, "https://efirelle.test/hls/live/timur/index.m3u8");

    const category = (await t.app.inject({ method: "GET", url: "/api/categories/strategy" })).json();
    assert.equal(category.category.liveCount, 1);
  });

  test("подписка видна в отслеживаемых и на главной", async () => {
    const follow = await t.app.inject({ method: "PUT", url: "/api/channels/timur/follow", headers: auth(viewer) });
    assert.equal(follow.json().followers, 1);
    const following = (await t.app.inject({ method: "GET", url: "/api/me/following", headers: auth(viewer) })).json().channels;
    assert.equal(following[0].channel.slug, "timur");
    const home = (await t.app.inject({ method: "GET", url: "/api/home", headers: auth(viewer) })).json();
    assert.equal(home.following.length, 1);
    assert.equal(home.featured[0].channel.slug, "timur");
  });

  test("чат: мат не проходит, сообщение видно в истории", async () => {
    const bad = await t.app.inject({ method: "POST", url: "/api/channels/timur/chat", headers: auth(viewer), payload: { text: "ну ты сука" } });
    assert.equal(bad.json().error, "profanity");
    const ok = await t.app.inject({ method: "POST", url: "/api/channels/timur/chat", headers: auth(viewer), payload: { text: "Привет всем!" } });
    assert.equal(ok.statusCode, 201);
    const history = (await t.app.inject({ method: "GET", url: "/api/channels/timur/chat" })).json().messages;
    assert.equal(history.at(-1).text, "Привет всем!");
    assert.equal(history.at(-1).badge.type, "newcomer");
  });

  test("блокировка скрывает сообщения автора, жалоба попадает администратору", async () => {
    const history = (await t.app.inject({ method: "GET", url: "/api/channels/timur/chat" })).json().messages;
    const messageId = history.at(-1).id;

    await t.app.inject({ method: "PUT", url: "/api/me/blocks/anya", headers: auth(streamer) });
    const hidden = (await t.app.inject({ method: "GET", url: "/api/channels/timur/chat", headers: auth(streamer) })).json().messages;
    assert.equal(hidden.length, 0);

    const report = await t.app.inject({ method: "POST", url: `/api/chat/messages/${messageId}/report`, headers: auth(streamer), payload: { reason: "spam" } });
    assert.equal(report.statusCode, 201);

    const admin = await registerUser(t.app, { email: "admin@efirelle.test", username: "admin" });
    const reports = (await t.app.inject({ method: "GET", url: "/api/admin/reports", headers: auth(admin) })).json().reports;
    assert.equal(reports.length, 1);
    assert.equal(reports[0].messageText, "Привет всем!");

    const notAdmin = await t.app.inject({ method: "GET", url: "/api/admin/reports", headers: auth(viewer) });
    assert.equal(notAdmin.statusCode, 403);

    const resolve = await t.app.inject({ method: "POST", url: `/api/admin/reports/${reports[0].id}/resolve`, headers: auth(admin), payload: { action: "delete_message" } });
    assert.equal(resolve.statusCode, 200);
    const after = (await t.app.inject({ method: "GET", url: "/api/channels/timur/chat" })).json().messages;
    assert.equal(after.length, 0);
  });

  test("прогноз: голос один раз, верный ответ приносит искры", async () => {
    const created = await t.app.inject({
      method: "POST",
      url: "/api/studio/predictions",
      headers: auth(streamer),
      payload: { question: "Возьмёт финальную карту?", outcomes: ["Да", "Нет"], durationSeconds: 120 },
    });
    assert.equal(created.statusCode, 201);
    const prediction = created.json().prediction;
    const yes = prediction.outcomes[0].id;

    const vote = await t.app.inject({ method: "POST", url: `/api/predictions/${prediction.id}/vote`, headers: auth(viewer), payload: { outcomeId: yes } });
    assert.equal(vote.json().prediction.myOutcomeId, yes);
    const again = await t.app.inject({ method: "POST", url: `/api/predictions/${prediction.id}/vote`, headers: auth(viewer), payload: { outcomeId: yes } });
    assert.equal(again.json().error, "already_voted");

    await t.app.inject({ method: "POST", url: `/api/studio/predictions/${prediction.id}/resolve`, headers: auth(streamer), payload: { outcomeId: yes } });
    const me = (await t.app.inject({ method: "GET", url: "/api/me", headers: auth(viewer) })).json().user;
    assert.equal(me.sparks, 600);

    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/timur/watch" })).json();
    assert.equal(watch.prediction.status, "resolved");
    assert.ok(watch.markers.some((m: { kind: string }) => m.kind === "prediction"));
  });

  test("бан в чате: забаненный не может писать", async () => {
    const ban = await t.app.inject({ method: "POST", url: "/api/studio/bans", headers: auth(streamer), payload: { username: "anya", minutes: 10 } });
    assert.equal(ban.statusCode, 200);
    const send = await t.app.inject({ method: "POST", url: "/api/channels/timur/chat", headers: auth(viewer), payload: { text: "можно?" } });
    assert.equal(send.json().error, "chat_banned");
  });

  test("окончание эфира убирает канал из идущих", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/timur" });
    const live = (await t.app.inject({ method: "GET", url: "/api/streams/live" })).json().streams;
    assert.equal(live.length, 0);
    const channel = (await t.app.inject({ method: "GET", url: "/api/channels/timur" })).json();
    assert.equal(channel.stream, null);
  });

  test("поиск находит канал по имени без учёта регистра", async () => {
    const result = (await t.app.inject({ method: "GET", url: "/api/search?q=ТИМУР" })).json();
    assert.equal(result.channels[0].channel.slug, "timur");
  });
});
