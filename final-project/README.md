# The Cricket Club — Maulin Patel

A responsive cricket website for Web Programming. The original cricket topic is now shared across the homepage, History, Players, Learn, About, registration, login, and profile pages.

## Run

Requires **Node.js 24 or newer**. SQLite is included with Node; no separate database server is needed.

```sh
npm ci
npm start
```

Open http://localhost:3000. Register a username, email, and password, log in, then visit **My club**. Save your favorite format and log out. Your account and preference remain in `data/cricket.sqlite` across server restarts. Sessions use the development memory store and end when the server restarts.

Optionally export `SESSION_SECRET`, `PORT`, or `DB_FILE` before starting. `.env.example` documents the variables; `.env` files are not automatically loaded. Production requires a stable `SESSION_SECRET`, HTTPS, and a persistent session store before public deployment. This version is intended for a local class demonstration.

## Features

- Semantic HTML, shared navigation, responsive CSS Grid/Flexbox, keyboard focus and skip link.
- CSS-variable light/dark themes with vanilla JavaScript and saved preference.
- Player-role filter and accessible beginner quiz.
- `POST /register`: validated username, email, and password; duplicate-name feedback.
- `POST /login`: asynchronous scrypt password verification and session rotation.
- `GET /profile`: authenticated username display and saved favorite cricket format.
- `POST /profile`: validated preference update with session CSRF token.
- `GET /logout`: destroys the session and clears its cookie.
- Parameterized SQLite queries, unique random password salts, private database/source files.

## Source layout

`public/` is the directory served by Express. Root HTML/CSS/JS copies allow the informational pages to open as static files or on GitHub Pages; update both copies together. Accounts and profiles require the Node server and do not work on GitHub Pages. Existing ZIPs, `README.txt`, `schema.sql`, and `style.css` are historical assignment artifacts, not used by this application. The old MySQL student/GPA sample has been replaced by a cricket-specific SQLite account table created automatically by `server.js`.

## Verification

```sh
npm run check
npm test
```

Integration tests exercise registration, duplicate usernames, bad credentials, profile protection, CSRF rejection, saved preferences, logout, public assets, and private-file boundaries using a temporary database.

## Class demonstration

1. Open Home, History, Players, Learn, and About.
2. Filter player roles; answer the quiz.
3. Toggle dark mode and navigate to another page.
4. Register, demonstrate a failed login, then log in successfully.
5. Show your username on My club, save T20, and reload.
6. Log out and show that `/profile` requires a login.

The course Final Project page was checked November 16, 2026: due December 1 at 11:59 p.m. No detailed instructions were displayed there. Confirm any separately supplied proposal/rubric and hosting requirements before final submission. Submit the repository or commit link and any live server URL required by the instructor.
