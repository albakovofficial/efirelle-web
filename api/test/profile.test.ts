import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { alertOf, auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

/** Минимальная настоящая PNG-картинка 1×1. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex",
);

describe("Страница канала, расписание, ответы и эмодзи", () => {
  let t: TestApp;
  let owner: TestUser;
  let fan: TestUser;

  before(async () => {
    t = await createTestApp();
    owner = await registerUser(t.app, { username: "mira", displayName: "Мира" });
    fan = await registerUser(t.app);
  });
  after(() => t.close());

  it("аватар и баннер принимаются только картинками", async () => {
    const fake = await t.app.inject({ method: "PUT", url: "/api/me/avatar", headers: { ...auth(owner), "content-type": "image/png" }, payload: Buffer.from("not an image") });
    assert.equal(fake.statusCode, 400);

    const avatar = await t.app.inject({ method: "PUT", url: "/api/me/avatar", headers: { ...auth(owner), "content-type": "image/png" }, payload: PNG });
    assert.equal(avatar.statusCode, 200);
    assert.match(avatar.json().avatarUrl, /^https:\/\/efirelle\.test\/media\/[0-9a-f]{32}\.png$/);

    const banner = await t.app.inject({ method: "PUT", url: "/api/studio/banner", headers: { ...auth(owner), "content-type": "image/png" }, payload: PNG });
    assert.equal(banner.statusCode, 200);

    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/mira/watch" })).json();
    assert.equal(watch.channel.avatarUrl, avatar.json().avatarUrl);
    assert.equal(watch.about.bannerUrl, banner.json().bannerUrl);
  });

  it("описание и ссылки канала проверяются", async () => {
    const badLink = await t.app.inject({
      method: "PATCH",
      url: "/api/studio/profile",
      headers: auth(owner),
      payload: { description: "Музыка по ночам", links: [{ title: "Сайт", url: "javascript:alert(1)" }] },
    });
    assert.equal(badLink.statusCode, 400);

    const saved = await t.app.inject({
      method: "PATCH",
      url: "/api/studio/profile",
      headers: auth(owner),
      payload: { description: "Музыка по ночам", links: [{ title: "Telegram", url: "https://t.me/mira" }] },
    });
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.json().links[0].url, "https://t.me/mira");
  });

  it("анонс эфира, напоминание и push перед началом", async () => {
    await t.app.inject({ method: "PUT", url: "/api/me/devices", headers: auth(fan), payload: { token: "f".repeat(64), environment: "production" } });
    const past = await t.app.inject({
      method: "POST",
      url: "/api/studio/schedule",
      headers: auth(owner),
      payload: { title: "Ночной рояль", categoryId: "music", startsAt: new Date(Date.now() - 60_000).toISOString() },
    });
    assert.equal(past.statusCode, 400);

    const created = await t.app.inject({
      method: "POST",
      url: "/api/studio/schedule",
      headers: auth(owner),
      payload: { title: "Ночной рояль", categoryId: "music", startsAt: new Date(Date.now() + 3 * 60_000).toISOString() },
    });
    assert.equal(created.statusCode, 200);
    const id = created.json().scheduled.id as string;

    const remind = await t.app.inject({ method: "PUT", url: `/api/schedule/${id}/remind`, headers: auth(fan) });
    assert.deepEqual(remind.json(), { isReminded: true, reminders: 1 });

    const home = (await t.app.inject({ method: "GET", url: "/api/home", headers: auth(fan) })).json();
    assert.equal(home.upcoming[0].title, "Ночной рояль");
    assert.equal(home.upcoming[0].isReminded, true);

    assert.equal(await t.services.schedule.sendDueReminders(), 1);
    assert.equal(alertOf(t.pushes.at(-1)!).title, "Мира скоро в эфире");
    assert.equal(await t.services.schedule.sendDueReminders(), 0);
  });

  it("ответ на сообщение несёт начало исходного текста", async () => {
    const first = await t.app.inject({ method: "POST", url: "/api/channels/mira/chat", headers: auth(owner), payload: { text: "Всем привет!" } });
    const original = first.json().message.id as string;
    const reply = await t.app.inject({ method: "POST", url: "/api/channels/mira/chat", headers: auth(fan), payload: { text: "@mira привет", replyTo: original } });
    assert.equal(reply.statusCode, 201);
    assert.deepEqual(reply.json().message.replyTo, { id: original, author: "Мира", text: "Всем привет!" });

    const missing = await t.app.inject({ method: "POST", url: "/api/channels/mira/chat", headers: auth(fan), payload: { text: "ещё", replyTo: "999999" } });
    assert.equal(missing.statusCode, 400);
  });

  it("эмодзи канала: код, лимиты и список в данных канала", async () => {
    const added = await t.app.inject({
      method: "POST",
      url: "/api/studio/emotes?code=Wave",
      headers: { ...auth(owner), "content-type": "image/png" },
      payload: PNG,
    });
    assert.equal(added.statusCode, 200);
    assert.equal(added.json().emote.code, "wave");

    const duplicate = await t.app.inject({
      method: "POST",
      url: "/api/studio/emotes?code=wave",
      headers: { ...auth(owner), "content-type": "image/png" },
      payload: PNG,
    });
    assert.equal(duplicate.statusCode, 409);

    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/mira/watch" })).json();
    assert.deepEqual(watch.emotes.map((e: { code: string }) => e.code), ["wave"]);

    const removed = await t.app.inject({ method: "DELETE", url: "/api/studio/emotes/wave", headers: auth(owner) });
    assert.equal(removed.statusCode, 200);
  });
});
