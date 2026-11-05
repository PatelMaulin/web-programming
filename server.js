// Session-based login assignment. Based on the provided MySQL/Express example.
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse HTML form fields and serve login/register pages from /public.
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Save the session ID in a cookie; the username is stored server-side.
if (!process.env.SESSION_SECRET) {
  throw new Error('Set SESSION_SECRET before running the server.');
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000, secure: false }
}));

// Match the database used in the class example.
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.ROOTPASS || '',
  database: process.env.DB_NAME || 'paws',
  port: Number(process.env.DB_PORT || 3306)
});

// These settings preserve compatibility with the instructor's sample data.
// Classroom demonstration only: production code should use a unique salt per user
// and a stronger password hashing setup (e.g., scrypt/Argon2/bcrypt).
const salt = 'salt';
const hashRounds = 100;
const hashLength = 64;
function hashPassword(password) {
  return crypto.pbkdf2Sync(password, salt, hashRounds, hashLength, 'sha512').toString('hex');
}

// Escape user-controlled strings when adding them to HTML responses.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

// REGISTER: insert a new student and point them to the login page.
app.post('/signup', (req, res) => {
  const { userName, password, fname, lname, gpa } = req.body;
  if (!userName || !password || !fname || !lname || !Number.isFinite(Number(gpa))) {
    return res.status(400).send('Complete all fields. <a href="/register.html">Try again</a>');
  }
  const sql = 'INSERT INTO student (fname, lname, gpa, user_id, password, salt) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [fname, lname, Number(gpa), userName, hashPassword(password), salt], err => {
    if (err) {
      console.error('Signup error:', err.message);
      return res.status(500).send('Could not register. Please try another username.');
    }
    res.send('You have successfully registered! <a href="/login.html">Login here</a>');
  });
});

// LOGIN: validate credentials, then remember the username in a session.
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Enter username and password. <a href="/login.html">Try again</a>');
  }
  const sql = 'SELECT user_id, gpa FROM student WHERE user_id = ? AND password = ?';
  db.query(sql, [username, hashPassword(password)], (err, rows) => {
    if (err) {
      console.error('Login error:', err.message);
      return res.status(500).send('Login is temporarily unavailable.');
    }
    if (rows.length === 0) {
      return res.status(401).send('Incorrect username or password. <a href="/login.html">Try again</a>');
    }
    // Rotate the session ID when a user logs in, then store their username.
    req.session.regenerate(error => {
      if (error) return res.status(500).send('Could not start session.');
      req.session.user = { username: rows[0].user_id, gpa: rows[0].gpa };
      req.session.save(error => {
        if (error) return res.status(500).send('Could not save session.');
        res.send(`You have logged in successfully, ${escapeHtml(username)}! <a href="/profile">View profile</a>`);
      });
    });
  });
});

// PROFILE: the username appears on another page, but only if logged in.
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('You are not logged in. <a href="/login.html">Login here</a>');
  }
  const { username, gpa } = req.session.user;
  res.send(`
    <h1>My Profile</h1>
    <p>Welcome, ${escapeHtml(username)}!</p>
    <p>Your GPA: ${escapeHtml(gpa)}</p>
    <a href="/logout">Logout</a>
  `);
});

// LOGOUT: destroy the server session and clear the session cookie.
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Could not log out.');
    res.clearCookie('connect.sid');
    res.send('You have logged out successfully. <a href="/login.html">Login again</a>');
  });
});

app.listen(PORT, () => console.log(`Website running at http://localhost:${PORT}`));
