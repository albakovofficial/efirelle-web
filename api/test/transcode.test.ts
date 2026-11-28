import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { auth, createTestApp, registerUser, type TestApp, type TestUser } from "./helpers.js";

describe("Качество эфира", () => {
  let t: TestApp;
  let admin: TestUser;
  let streamer: TestUser;

  before(async () => {
    t = await createTestApp();
    admin = await registerUser(t.app, { email: "admin@efirelle.test" });
    streamer = await registerUser(t.app, { username: "nika" });
  });
  after(() => t.close());

  it("перекодирование включает только администратор, по умолчанию оно выключено", async () => {
    const initial = await t.app.inject({ method: "GET", url: "/api/admin/transcode", headers: auth(admin) });
    assert.deepEqual(initial.json(), { enabled: false });
    const forbidden = await t.app.inject({ method: "PUT", url: "/api/admin/transcode", headers: auth(streamer), payload: { enabled: true } });
    assert.equal(forbidden.statusCode, 403);
  });

  it("варианты качества публикуются только с внутренним ключом", async () => {
    const outsider = await t.app.inject({
      method: "POST",
      url: "/api/internal/media/auth",
      payload: { action: "publish", path: "variants/nika/720", query: "key=guess" },
    });
    assert.equal(outsider.statusCode, 401);
  });

  it("без перекодирования у эфира одно качество — исходное", async () => {
    await t.app.inject({ method: "POST", url: "/api/internal/media/ready?path=live/nika" });
    const watch = (await t.app.inject({ method: "GET", url: "/api/channels/nika/watch" })).json();
    assert.deepEqual(
      watch.stream.qualities.map((q: { label: string }) => q.label),
      ["Источник"],
    );
    assert.equal(streamer.username, "nika");
  });
});
