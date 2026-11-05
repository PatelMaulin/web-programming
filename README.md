# Session-based login assignment

This is a commented Express + MySQL website based on the supplied classroom sample.

## Features
- `POST /signup`: register using the `student` table.
- `POST /login`: check credentials and save `req.session.user`.
- `GET /profile`: show the username on another page, only while logged in.
- `GET /logout`: destroy the session and clear the cookie.

## Run locally
1. Install Node.js and MySQL; if needed, create the sample table using `schema.sql`.
2. In this folder, run `npm install`.
3. Set environment variables in your terminal (use `.env.example` as a guide):
   - macOS/Linux: `export SESSION_SECRET='a-long-random-value'` and `export ROOTPASS='your-mysql-password'`
   - Windows PowerShell: `$env:SESSION_SECRET='a-long-random-value'` and `$env:ROOTPASS='your-mysql-password'`
4. Run `npm start`.
5. Open `http://localhost:3000/register.html` to create an account, or `/login.html` if you already have one.
6. Log in, click **View profile**, click **Logout**, then try `/profile` again to verify access is blocked.

## Submit on GitHub
Create a repository and upload `server.js`, `package.json`, `schema.sql`, `README.md`, `.gitignore`, and the `public/` directory. **Do not upload your MySQL password or session secret.** Copy your repository URL and submit that link to your instructor.

## Note
The password-hashing parameters reproduce the supplied classroom example for compatibility, but they are not appropriate for production. The default in-memory session store is also only for development, not production deployment.
