import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error("Не дождались");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const token = (seed: string) => seed.repeat(64).slice(0, 64);

describe("Live Activities", () => {
  let t: TestApp;
  let streamer: TestUser;
  let fan: TestUser;
  let other: TestUser;

  before(async () => {
    t = await createTestApp();
    streamer = await registerUser(t.app, { username: "island", displayName: "Остров" });
    fan = await registerUser(t.app);
    other = await registerUser(t.app);
    await t.app.inject({ method: "PUT", url: "/api/channels/island/follow", headers: auth(fan) });
    await t.app.inject({ method: "PUT", url: "/api/me/devices", headers: auth(fan), payload: { token: token("a"), environment: "production" } });
  });
  after(() => t.close());

  it("токен запуска сохраняется только для своего устройства", async () => {
    const foreign = await t.app.inject({
      method: "PUT",
      url: `/api/me/devices/${token("a")}/live-activity`,
      headers: auth(other),
      payload: { startToken: token("s") },
    });
    assert.equal(foreign.statusCode, 404);
    const own = await t.app.inject({
      method: "PUT",
      url: `/api/me/devices/${token("a")}/live-activity`,
      headers: auth(fan),
      payload: { startToken: token("s") },
    });
    assert.equal(own.statusCode, 200);
  });

  it("начало эфира запускает Live Activity вместо обычного уведомления", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/island" });
    await waitFor(() => t.pushes.length > 0);
    assert.equal(t.pushes.length, 1);
    const [{ device, push }] = t.pushes as [(typeof t.pushes)[number]];
    assert.equal(device.token, token("s"));
    assert.equal(push.type, "liveactivity");
    assert.equal(push.payload.aps.event, "start");
    assert.equal(push.payload.aps["attributes-type"], "LiveStreamAttributes");
    assert.deepEqual(push.payload.aps.attributes, { slug: "island", name: "Остров" });
  });

  it("запущенная активность получает зрителей и конец эфира", async () => {
    const saved = await t.app.inject({
      method: "PUT",
      url: "/api/me/live-activities",
      headers: auth(fan),
      payload: { token: token("c"), channel: "island", environment: "production" },
    });
    assert.equal(saved.statusCode, 200);

    await t.services.push.updateActivities();
    assert.equal(t.pushes.at(-1)!.push.payload.aps.event, "update");
    const count = t.pushes.length;
    await t.services.push.updateActivities();
    assert.equal(t.pushes.length, count, "без изменений обновление не уходит");

    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/island" });
    await waitFor(() => t.pushes.at(-1)!.push.payload.aps.event === "end");
    assert.equal(t.pushes.at(-1)!.device.token, token("c"));
    const left = await t.ctx.db.one("SELECT 1 FROM live_activities WHERE channel_id = $1", [streamer.id]);
    assert.equal(left, null);
  });

  it("выключенные Live Activities возвращают обычные уведомления", async () => {
    await t.app.inject({
      method: "PUT",
      url: `/api/me/devices/${token("a")}/live-activity`,
      headers: auth(fan),
      payload: { startToken: null },
    });
    await t.ctx.db.pool.query("UPDATE channels SET live_push_at = NULL WHERE user_id = $1", [streamer.id]);
    const count = t.pushes.length;
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/island" });
    await waitFor(() => t.pushes.length > count);
    assert.equal(t.pushes.at(-1)!.push.type, "alert");
    assert.equal(t.pushes.at(-1)!.device.token, token("a"));
  });
});
