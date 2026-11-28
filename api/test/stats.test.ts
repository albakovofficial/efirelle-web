import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

describe("Статистика канала", () => {
  let t: TestApp;
  let streamer: TestUser;
  let fan: TestUser;

  before(async () => {
    t = await createTestApp();
    streamer = await registerUser(t.app, { username: "numbers" });
    fan = await registerUser(t.app);
  });
  after(() => t.close());

  it("без эфиров — пустая лента и нули", async () => {
    const stats = (await t.app.inject({ method: "GET", url: "/api/studio/stats", headers: auth(streamer) })).json();
    assert.deepEqual(stats.streams, []);
    assert.equal(stats.summary.followers, 0);
    assert.equal(stats.summary.peak.viewers, 0);
  });

  it("прошедший эфир попадает в ленту с графиком и новыми подписчиками", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/numbers" });
    await t.ctx.db.pool.query("UPDATE stream_sessions SET started_at = now() - interval '10 minutes' WHERE channel_id = $1", [streamer.id]);
    await t.services.live.recordViewers();
    await t.app.inject({ method: "PUT", url: "/api/channels/numbers/follow", headers: auth(fan) });
    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/numbers" });

    const stats = (await t.app.inject({ method: "GET", url: "/api/studio/stats", headers: auth(streamer) })).json();
    assert.equal(stats.streams.length, 1);
    assert.ok(stats.streams[0].durationSeconds >= 600);
    assert.equal(stats.streams[0].newFollowers, 1);
    assert.equal(stats.streams[0].points.length, 1);
    assert.equal(stats.summary.followers, 1);
    assert.equal(stats.summary.newFollowers.week, 1);
    assert.ok(stats.summary.hoursLive.week > 0);
  });

  it("статистика — только своего канала", async () => {
    const anonymous = await t.app.inject({ method: "GET", url: "/api/studio/stats" });
    assert.equal(anonymous.statusCode, 401);
  });
});
