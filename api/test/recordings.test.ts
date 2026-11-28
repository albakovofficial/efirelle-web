import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

describe("Записи эфиров и клипы", () => {
  let t: TestApp;
  let owner: TestUser;
  let fan: TestUser;
  let playback: Server;
  const requests: URL[] = [];

  before(async () => {
    t = await createTestApp();
    owner = await registerUser(t.app, { username: "kai", displayName: "Кай" });
    fan = await registerUser(t.app);
    // Подменяем сервер записей MediaMTX: отдаёт «MP4» на любой отрезок.
    playback = createServer((request, response) => {
      requests.push(new URL(request.url ?? "/", "http://localhost"));
      response.end(Buffer.alloc(4096, 1));
    });
    await new Promise<void>((resolve) => playback.listen(0, "127.0.0.1", resolve));
    t.ctx.config.playbackUrl = `http://127.0.0.1:${(playback.address() as AddressInfo).port}`;
  });
  after(async () => {
    playback.close();
    await t.close();
  });

  it("клип можно сделать только во время эфира", async () => {
    const response = await t.app.inject({ method: "POST", url: "/api/channels/kai/clips", headers: auth(fan), payload: { title: "Момент" } });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "not_live");
  });

  it("клип вырезается из записи и становится файлом", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/kai" });
    await t.ctx.db.pool.query("UPDATE channels SET live_since = now() - interval '5 minutes' WHERE user_id = $1", [owner.id]);

    const created = await t.app.inject({ method: "POST", url: "/api/channels/kai/clips", headers: auth(fan), payload: { title: "Хедшот!" } });
    assert.equal(created.statusCode, 200);
    const clip = created.json().clip;
    assert.equal(clip.status, "processing");
    assert.equal(clip.durationSeconds, 30);

    // Запись дописывается — сразу клип не режется; «через 8 секунд» — режется.
    await t.ctx.db.pool.query("UPDATE clips SET created_at = now() - interval '1 minute' WHERE id = $1", [clip.id]);
    await t.services.recordings.processPending();

    const ready = (await t.app.inject({ method: "GET", url: `/api/clips/${clip.id}` })).json().clip;
    assert.equal(ready.status, "ready");
    assert.match(ready.url, /^https:\/\/efirelle\.test\/media\/clips\/[0-9a-f]{32}\.mp4$/);
    assert.equal(requests.at(-1)!.searchParams.get("path"), "live/kai");
    assert.equal(requests.at(-1)!.searchParams.get("duration"), "30");

    await t.app.inject({ method: "POST", url: `/api/clips/${clip.id}/view` });
    const home = (await t.app.inject({ method: "GET", url: "/api/home" })).json();
    assert.equal(home.clips[0].views, 1);
  });

  it("запись завершённого эфира появляется на странице канала", async () => {
    await t.ctx.db.pool.query("UPDATE stream_sessions SET started_at = now() - interval '10 minutes' WHERE channel_id = $1", [owner.id]);
    await t.app.inject({ method: "POST", url: "/api/internal/media/not-ready?path=live/kai" });
    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/kai/watch" })).json();
    assert.equal(watch.recordings.length, 1);
    assert.match(watch.recordings[0].url, /\/playback\/get\?path=live%2Fkai&start=/);
    assert.equal(watch.clips.length, 1);
  });

  it("удалить клип может автор клипа или канала, но не посторонний", async () => {
    const stranger = await registerUser(t.app);
    const clipId = (await t.app.inject({ method: "GET", url: "/api/channels/kai/watch" })).json().clips[0].id;
    const forbidden = await t.app.inject({ method: "DELETE", url: `/api/clips/${clipId}`, headers: auth(stranger) });
    assert.equal(forbidden.statusCode, 403);
    const removed = await t.app.inject({ method: "DELETE", url: `/api/clips/${clipId}`, headers: auth(owner) });
    assert.equal(removed.statusCode, 200);
  });
});
