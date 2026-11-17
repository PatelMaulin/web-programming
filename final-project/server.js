// Express serves only public assets; database files and source code stay private.
const express = require("express");
const session = require("express-session");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const scrypt = promisify(crypto.scrypt);
const app = express();
const production = process.env.NODE_ENV === "production";
if (production && !process.env.SESSION_SECRET)
  throw new Error("Set SESSION_SECRET in production.");
const dbPath =
  process.env.DB_FILE || path.join(__dirname, "data", "cricket.sqlite");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY COLLATE NOCASE, email TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, favorite_format TEXT NOT NULL DEFAULT 'Not selected')",
);
app.disable("x-powered-by");
if (production) app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: 3600000,
    },
  }),
);
app.use(express.static(path.join(__dirname, "public")));
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const template = fs.readFileSync(path.join(__dirname, "layout.html"), "utf8");
function render(res, title, content, status = 200) {
  res
    .status(status)
    .send(
      template
        .replace("{{title}}", escapeHtml(title))
        .replace("{{content}}", content),
    );
}
function message(res, title, text, href, label, status = 200) {
  render(
    res,
    title,
    `<section class="auth panel"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p><a class="button" href="${href}">${label}</a></section>`,
    status,
  );
}
function authenticated(req, res, next) {
  if (!req.session.user)
    return message(
      res,
      "Sign in first",
      "Your profile is available after login.",
      "/login.html",
      "Sign in",
      401,
    );
  next();
}
// Random per-user salts and asynchronous scrypt protect stored passwords.
app.post(["/register", "/signup"], async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (
      typeof username !== "string" ||
      !/^\w{3,30}$/.test(username) ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return message(
        res,
        "Check your details",
        "Use a 3–30 character username (letters, numbers, underscores), a valid email, and an 8–128 character password.",
        "/register.html",
        "Try again",
        400,
      );
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = (await scrypt(password, salt, 64)).toString("hex");
    try {
      db.prepare(
        "INSERT INTO users(username,email,password_hash,salt) VALUES(?,?,?,?)",
      ).run(username, email, hash, salt);
    } catch (err) {
      if (
        err.code === "ERR_SQLITE_ERROR" &&
        String(err.message).includes("UNIQUE")
      )
        return message(
          res,
          "Username taken",
          "Choose another username.",
          "/register.html",
          "Try again",
          409,
        );
      throw err;
    }
    message(
      res,
      "You have successfully registered",
      "Your club account is ready.",
      "/login.html",
      "Login here",
    );
  } catch (err) {
    next(err);
  }
});
app.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length > 30 ||
      password.length > 128
    )
      return message(
        res,
        "Login unsuccessful",
        "The login credentials were incorrect.",
        "/login.html",
        "Try again",
        401,
      );
    const user = db
      .prepare("SELECT * FROM users WHERE username=?")
      .get(username);
    const hash = await scrypt(
      password,
      user?.salt || "invalid-account-salt",
      64,
    );
    if (
      !user ||
      !crypto.timingSafeEqual(hash, Buffer.from(user.password_hash, "hex"))
    )
      return message(
        res,
        "Login unsuccessful",
        "The login credentials were incorrect.",
        "/login.html",
        "Try again",
        401,
      );
    // Rotate the session identifier on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user.username;
      req.session.csrf = crypto.randomBytes(24).toString("hex");
      req.session.save((err) => {
        if (err) return next(err);
        message(
          res,
          "You have logged in successfully",
          `Welcome, ${user.username}.`,
          "/profile",
          "View profile",
        );
      });
    });
  } catch (err) {
    next(err);
  }
});
app.get("/profile", authenticated, (req, res) => {
  res.set("Cache-Control", "no-store");
  const user = db
    .prepare("SELECT username,favorite_format FROM users WHERE username=?")
    .get(req.session.user);
  render(
    res,
    "My club",
    `<section class="auth panel"><p class="eyebrow">YOUR CLUB PROFILE</p><h1>Welcome, ${escapeHtml(user.username)}.</h1><p>Favorite format: <strong>${escapeHtml(user.favorite_format)}</strong></p><form method="post" action="/profile"><input type="hidden" name="csrf" value="${req.session.csrf}"><label for="favorite">Choose your favorite format</label><select id="favorite" name="favorite">${["Test", "ODI", "T20"].map((f) => `<option${f === user.favorite_format ? " selected" : ""}>${f}</option>`).join("")}</select><button>Save preference</button></form><p><a href="/logout">Logout</a></p></section>`,
  );
});
// Validate both the session token and allowed values before updating stored data.
app.post("/profile", authenticated, (req, res) => {
  if (req.body.csrf !== req.session.csrf)
    return message(
      res,
      "Please try again",
      "Reload your profile before saving.",
      "/profile",
      "Back to profile",
      403,
    );
  if (!["Test", "ODI", "T20"].includes(req.body.favorite))
    return message(
      res,
      "Invalid format",
      "Choose Test, ODI, or T20.",
      "/profile",
      "Back to profile",
      400,
    );
  db.prepare("UPDATE users SET favorite_format=? WHERE username=?").run(
    req.body.favorite,
    req.session.user,
  );
  res.redirect(303, "/profile");
});
app.get("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("connect.sid");
    message(
      res,
      "You have logged out",
      "Your session has ended.",
      "/login.html",
      "Login again",
    );
  });
});
app.use((req, res) =>
  message(
    res,
    "Page not found",
    "Explore the club from the home page.",
    "/",
    "Back home",
    404,
  ),
);
app.use((err, req, res, next) => {
  console.error(err.message);
  message(
    res,
    "Something went wrong",
    "Please try again shortly.",
    "/",
    "Back home",
    500,
  );
});
if (require.main === module)
  app.listen(process.env.PORT || 3000, () =>
    console.log("Cricket Club running on port " + (process.env.PORT || 3000)),
  );
module.exports = { app, db };
