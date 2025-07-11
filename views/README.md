# CBT Workbook

CBT Workbook is a self-hosted web application to help users practice Cognitive Behavioral Therapy (CBT) techniques: track mood, record and reflect on automatic thoughts, maintain a gratitude journal, and take BDI assessments. It is intended for personal use, education, or as a starting point for clinicians and developers building mental-health tooling.

Key goals: privacy, simplicity, and extensibility.

## Features

- User registration, login, and secure session management
- Mood tracking with daily entries and simple trend views
- Thought records (automatic thoughts, evidence for/against, alternative thoughts)
- Gratitude journal for daily positive reflections
- Beck Depression Inventory (BDI) assessment and result history
- Image attachments for journal entries (per-user storage)
- Server-side rendering with Liquid templates and responsive UI via Tailwind CSS
- Security-focused defaults (Helmet, CSP nonces, secure cookies)

## Tech stack

- Node.js + Express
- PostgreSQL (session & app data)
- LiquidJS templates
- Tailwind CSS + PostCSS
- Multer for uploads
- connect-pg-simple for session storage
- Small JS sprinkles (Alpine.js / HTMX) for progressive enhancement

## Quick start (development)

Prerequisites:
- Node.js (v18+ recommended)
- PostgreSQL

1. Clone the repo and install dependencies

   git clone <repo-url>
   cd cbt-workbook
   npm install

2. Configure environment

   Copy `.env.example` to `.env` and update values. Typical variables:
   - DATABASE_URL (Postgres connection)
   - SESSION_SECRET (strong random string)
   - NODE_ENV (development|production)
   - PORT (optional, default 3000)
   - UPLOAD_DIR (optional)

3. Prepare the database

   Run migrations or the provided setup script. Example:

   npm run migrate

4. Build CSS

   npm run buildcss

5. Start (development)

   npm run dev

Open http://127.0.0.1:3000 in your browser.

Notes for production:
- Use a process manager (pm2, systemd) and reverse proxy (nginx).
- Ensure HTTPS and secure cookie settings.
- Store uploads on dedicated storage if required and restrict access.

## Useful scripts

- `npm run dev` — Start the app in development (auto-reload)
- `npm run buildcss` — Build Tailwind CSS
- `npm run watchcss` — Rebuild CSS on change
- `npm run migrate` — Run DB migrations
- `npm run reset-db` — Reset DB (destructive)

## Project layout

- [server.js] — entry point
- [routes/] — Express route handlers
- [views/] — LiquidJS templates
- [public/] — static assets
- [uploads/] — user uploads (not in git)
- [migrations/] — DB migration scripts
- [utils/] — helper modules


## Environment variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — secret for session cookies (use a long random value)
- `NODE_ENV` — `production` or `development`
- `PORT` — HTTP port (default: 3000)
- `LISTEN_ADDRESS` — host to bind (default: 127.0.0.1)
- `SESSION_MAX_AGE` — session lifetime in ms
- `UPLOAD_DIR` / `UPLOAD_PATH` — where uploads are stored

## Security & privacy notes

- This project is intended to be self-hosted. Treat user data as sensitive.
- Use HTTPS in production and set `secure` on cookies.
- Review third-party dependencies regularly and rotate secrets when needed.

## Contributing

Contributions, issues, and suggestions are welcome. Please open an issue to discuss large changes first. Keep changes focused and add tests where applicable.

## License

This project is distributed under the BSD 3-Clause "New" or "Revised" License. See [LICENSE](C:/Users/Shobhit Sharma/.vscode/cbt-workbook/LICENSE) for details.

---

Last updated: 2025-07-11
