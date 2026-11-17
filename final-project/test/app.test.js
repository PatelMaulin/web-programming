// Integration tests run against an isolated temporary database and a real HTTP server.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cricket-test-"));
process.env.DB_FILE = path.join(dir, "test.sqlite");
const { app, db } = require("../server");
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
let cookie = "";
async function request(url, data) {
  const res = await fetch(base + url, {
    method: data ? "POST" : "GET",
    headers: {
      ...(data ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? new URLSearchParams(data) : undefined,
    redirect: "manual",
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: res.status, text: await res.text(), headers: res.headers };
}
after(() => {
  server.close();
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test("complete account and preference lifecycle", async () => {
  assert.equal((await request("/profile")).status, 401);
  assert.equal(
    (
      await request("/register", {
        username: "x",
        email: "bad",
        password: "short",
      })
    ).status,
    400,
  );
  const account = {
    username: "cricketfan",
    email: "fan@example.com",
    password: "cricket-strong-123",
  };
  assert.equal((await request("/register", account)).status, 200);
  assert.equal((await request("/register", account)).status, 409);
  const record = db.prepare("SELECT * FROM users").get();
  assert.notEqual(record.password_hash, account.password);
  assert.equal(record.salt.length, 32);
  assert.equal(
    (await request("/login", { username: account.username, password: "wrong" }))
      .status,
    401,
  );
  assert.equal((await request("/login", account)).status, 200);
  let profile = await request("/profile");
  assert.match(profile.text, /Welcome, cricketfan/);
  const csrf = profile.text.match(/name="csrf" value="([^"]+)"/)[1];
  assert.equal(
    (await request("/profile", { favorite: "T20", csrf: "wrong" })).status,
    403,
  );
  assert.equal(
    (await request("/profile", { favorite: "bad", csrf })).status,
    400,
  );
  assert.equal(
    (await request("/profile", { favorite: "T20", csrf })).status,
    303,
  );
  assert.match((await request("/profile")).text, /<strong>T20<\/strong>/);
  const oldCookie = cookie;
  assert.equal((await request("/logout")).status, 200);
  cookie = oldCookie;
  assert.equal((await request("/profile")).status, 401);
  // Persistence belongs to the user record, not just their session.
  await request("/login", account);
  assert.match((await request("/profile")).text, /<strong>T20<\/strong>/);
});
test("public pages, assets, and private file boundaries", async () => {
  for (const url of [
    "/",
    "/history.html",
    "/players.html",
    "/learn.html",
    "/about.html",
    "/login.html",
    "/register.html",
    "/styles.css",
    "/script.js",
    "/cricket_match.svg",
    "/cricket_history.svg",
    "/cricket_player.svg",
  ])
    assert.equal((await request(url)).status, 200, url);
  for (const url of ["/server.js", "/.env", "/data/cricket.sqlite", "/missing"])
    assert.equal((await request(url)).status, 404, url);
});
