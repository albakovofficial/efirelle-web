import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { auth, createTestApp, registerUser, type TestApp } from "./helpers.js";

describe("Аккаунты", () => {
  let t: TestApp;
  before(async () => {
    t = await createTestApp();
  });
  after(async () => {
    await t.close();
  });

  test("регистрация создаёт пользователя и канал, токен работает", async () => {
    const user = await registerUser(t.app, { username: "mira", displayName: "Мира Вольская" });
    const me = await t.app.inject({ method: "GET", url: "/api/me", headers: auth(user) });
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().user.username, "mira");
    assert.equal(me.json().user.sparks, 500);

    const channel = await t.app.inject({ method: "GET", url: "/api/channels/mira" });
    assert.equal(channel.statusCode, 200);
    assert.equal(channel.json().channel.initials, "МВ");
    assert.equal(channel.json().stream, null);
  });

  test("повторная почта и занятое имя канала отклоняются", async () => {
    await registerUser(t.app, { username: "kai", email: "kai@efirelle.test" });
    const sameEmail = await t.app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "KAI@efirelle.test", password: "very-secret-1", username: "kai2", displayName: "Кай" },
    });
    assert.equal(sameEmail.statusCode, 409);
    assert.equal(sameEmail.json().error, "email_taken");

    const sameName = await t.app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "other@efirelle.test", password: "very-secret-1", username: "kai", displayName: "Кай" },
    });
    assert.equal(sameName.json().error, "username_taken");
  });

  test("вход по паролю; неверный пароль — 401", async () => {
    await registerUser(t.app, { username: "login_user", email: "login@efirelle.test" });
    const ok = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "login@efirelle.test", password: "very-secret-1" } });
    assert.equal(ok.statusCode, 200);
    assert.ok(ok.json().token);
    assert.match(String(ok.headers["set-cookie"]), /efirelle_session=/);

    const bad = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "login@efirelle.test", password: "wrong-password" } });
    assert.equal(bad.statusCode, 401);
  });

  test("администратор назначается по почте из настроек", async () => {
    const admin = await registerUser(t.app, { username: "boss", email: "admin@efirelle.test" });
    const me = await t.app.inject({ method: "GET", url: "/api/me", headers: auth(admin) });
    assert.equal(me.json().user.role, "admin");
  });

  test("восстановление пароля кодом из письма", async () => {
    await registerUser(t.app, { username: "forgetful", email: "forgetful@efirelle.test" });
    const forgot = await t.app.inject({ method: "POST", url: "/api/auth/password/forgot", payload: { email: "forgetful@efirelle.test" } });
    assert.equal(forgot.statusCode, 200);
    const code = /(\d{6})/.exec(t.mails.at(-1)!.subject)![1];

    const wrong = await t.app.inject({
      method: "POST",
      url: "/api/auth/password/reset",
      payload: { email: "forgetful@efirelle.test", code: code === "000000" ? "111111" : "000000", password: "new-password-1" },
    });
    assert.equal(wrong.json().error, "code_invalid");

    const reset = await t.app.inject({
      method: "POST",
      url: "/api/auth/password/reset",
      payload: { email: "forgetful@efirelle.test", code, password: "new-password-1" },
    });
    assert.equal(reset.statusCode, 200);
    const login = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "forgetful@efirelle.test", password: "new-password-1" } });
    assert.equal(login.statusCode, 200);
  });

  test("изменения по cookie с чужого сайта отклоняются", async () => {
    const user = await registerUser(t.app);
    const response = await t.app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { cookie: `efirelle_session=${user.token}`, origin: "https://evil.example" },
    });
    assert.equal(response.statusCode, 403);
  });

  test("удаление аккаунта требует пароль и удаляет канал", async () => {
    const user = await registerUser(t.app, { username: "leaver" });
    const wrong = await t.app.inject({ method: "DELETE", url: "/api/me", headers: auth(user), payload: { password: "nope-nope" } });
    assert.equal(wrong.statusCode, 401);

    const ok = await t.app.inject({ method: "DELETE", url: "/api/me", headers: auth(user), payload: { password: "very-secret-1" } });
    assert.equal(ok.statusCode, 200);
    assert.equal((await t.app.inject({ method: "GET", url: "/api/me", headers: auth(user) })).statusCode, 401);
    assert.equal((await t.app.inject({ method: "GET", url: "/api/channels/leaver" })).statusCode, 404);
  });
});
