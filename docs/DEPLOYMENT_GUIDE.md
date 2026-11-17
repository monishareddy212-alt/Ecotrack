# EcoTrack — Render Production Deployment Guide

> 📖 **Quick Reference**: A clean, single-file deployment manual is also available at the root: [RENDER_DEPLOYMENT_GUIDE.md](../RENDER_DEPLOYMENT_GUIDE.md).

This guide documents how to push EcoTrack to GitHub, configure a free cloud **MySQL** database, deploy EcoTrack as **one Render Node.js Web Service** (frontend + backend unified), and verify the live deployment.

---

## 1. Preparing & Pushing to GitHub

1. **Verify sensitive files are ignored** (never commit `.env`, database credentials, `SESSION_SECRET`, `node_modules/`, `dist/`, or `server.js` — already configured in `.gitignore`).
2. **Initialize Git and push to `main`** (if pushing to a fresh repository):
   ```bash
   git init -b main
   git add .
   git status   # Confirm NO .env or secret files are staged
   git commit -m "EcoTrack production ready"
   git remote add origin https://github.com/<your-username>/<your-ecotrack-repo>.git
   git push -u origin main
   ```
3. **Verify GitHub Actions CI**:
   - Pushing to `main` automatically triggers `.github/workflows/ci.yml`, which spins up a `mysql:8.0` container, runs `npm ci`, `npm run lint`, `npm run build`, `npm run db:migrate`, `npm run db:seed`, and the full `npm test` suite.

---

## 2. Setting Up MySQL Database

EcoTrack works with any standard MySQL 8+ instance (cloud or local):

1. **Free Cloud MySQL Options**:
   - **Aiven MySQL** (Free tier available at [aiven.io](https://aiven.io))
   - **PlanetScale** ([planetscale.com](https://planetscale.com))
   - **Railway MySQL** ([railway.app](https://railway.app))
   - **Cleardb / AWS RDS MySQL**
2. **Local MySQL**:
   - If running locally, install MySQL Server (or XAMPP/WAMP) and create a database:
     ```sql
     CREATE DATABASE ecotrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
3. **Connection String Format**:
   ```text
   mysql://<user>:<password>@<host>:<port>/<dbname>
   ```
   For SSL-enabled cloud databases, append `?ssl={"rejectUnauthorized":true}` or set `DATABASE_SSL=false` / `DATABASE_SSL=no-verify` if needed.
4. **Keep `DATABASE_URL` strictly private**. Never paste it into Git commits, `README.md`, or `VITE_*` variables.

---

## 3. Safe Production Database Migrations & Auto-Boot Seeding

> **Render Free Tier Optimized**: Render's **Free Web Service** does **not** include interactive SSH/Shell access or the paid Pre-Deploy Command feature.
> EcoTrack solves this automatically: **whenever `DATABASE_URL` is configured, the server automatically applies any pending idempotent migrations and verifies essential catalog seeds (`activity_types` and `emission_factors`) during startup!**
> All migrations use `CREATE TABLE IF NOT EXISTS` and `schema_migrations` tracking, while seeds use `ON DUPLICATE KEY UPDATE`, guaranteeing zero data loss.

If you prefer to run migrations manually before starting the service or from a trusted local terminal:

1. **Review pending migrations** in `server/db/migrations/`:
   - `001_create_core_tables.sql`
   - `002_create_session_table.sql`
   - `003_emission_factor_metadata.sql`
   - `004_analytics_indexes.sql`
2. **Verify migrations locally/CI first**: Confirm all checks pass cleanly.
3. **Apply idempotent migrations to MySQL**:
   ```bash
   DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<dbname>" npm run db:migrate
   ```
4. **Seed official reference catalogs (`activity_types` + documented `emission_factors`)**:
   ```bash
   DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<dbname>" npm run db:seed
   ```
   - Both `db:migrate` and `db:seed` use `CREATE TABLE IF NOT EXISTS`, `schema_migrations` tracking, and `ON DUPLICATE KEY UPDATE` so re-running them never deletes real user data.
5. **Verify schema state** in your MySQL client / phpMyAdmin:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   SELECT COUNT(*) AS activity_types FROM activity_types;
   SELECT COUNT(*) AS emission_factors FROM emission_factors;
   ```

---

## 4. Deploying One Render Node.js Web Service

EcoTrack runs both the **React production build** (`dist/`) and the **Express API** (`/api/*`) inside a single Render Web Service.

### Option A: Render Dashboard Manual Setup
1. Log in to [Render](https://dashboard.render.com) -> **New +** -> **Web Service**.
2. Connect your GitHub EcoTrack repository and select branch **`main`**.
3. Configure the service settings:
   - **Runtime**: `Node`
   - **Instance Type**: `Free`
   - **Build Command**:
     ```bash
     npm ci && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Health Check Path**: `/api/health`
4. Add **Environment Variables** in the Render Dashboard:

| Key | Value / Guidance | Required |
| :--- | :--- | :---: |
| `NODE_ENV` | `production` | Yes |
| `DATABASE_URL` | Your MySQL `mysql://<user>:<password>@<host>:<port>/<dbname>` string | Yes |
| `SESSION_SECRET` | Random 64-hex-char string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) | Yes (`>= 32` chars) |
| `APP_URL` | Your assigned `https://<service>.onrender.com` URL (optional) | Optional |

*(Do **not** set `PORT` manually—Render injects `PORT` automatically and `server.ts` binds to `0.0.0.0:$PORT`.)*

### Option B: Render Blueprint (`render.yaml`)
A pre-validated `render.yaml` Blueprint is included at the repository root. You can choose **New + -> Blueprint** in Render, select the repo, and paste only `DATABASE_URL` when prompted (`SESSION_SECRET` auto-generates securely).

### Why Production Build Works on Render
- `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, and `esbuild` are listed in `package.json` `dependencies` with a synced `package-lock.json`, ensuring `npm ci && npm run build` succeeds even if `NODE_ENV=production` is set during the Render build phase.
- `server.ts` validates `SESSION_SECRET >= 32` characters on startup in production (`loadServerConfig()`), trusts 1 proxy hop (`app.set('trust proxy', 1)`), enables `Secure` cookies over Render HTTPS, and serves `dist/index.html` for all non-`/api` SPA routes.

---

## 5. Live Deployment Acceptance Checklist (18 Checks)

Once Render finishes deploying (allow ~30–50 seconds for free-tier cold start if idle), verify all 18 items on your live `https://<service>.onrender.com` URL:

1. [ ] `GET https://<service>.onrender.com/api/health` returns `200 OK` with `"status": "ok"` and `"database": { "status": "ok" }`.
2. [ ] Homepage loads `/login` with zero browser console errors.
3. [ ] Register a fresh user on `/register` -> lands on Dashboard (`/`).
4. [ ] Refresh browser (`F5`) -> user remains authenticated (PostgreSQL session persists).
5. [ ] Dashboard loads KPIs, Monthly Trend, Category Breakdown, and Recent Activities.
6. [ ] Create a supported activity (e.g., `Car Travel`, `25 km`) on `/add-activity` -> displays `3.50 kg CO2e` (`25 × 0.14`).
7. [ ] Open `/history` -> saved record appears from PostgreSQL.
8. [ ] Edit quantity to `50 km` -> emissions recalculate to `7.00 kg CO2e` using the preserved factor.
9. [ ] Refresh `/` -> Dashboard totals update accurately.
10. [ ] Open `/analytics` -> Monthly, Daily, and Category Breakdown charts match PostgreSQL data.
11. [ ] Set a monthly target on `/goals` -> progress bar updates; refresh persists target.
12. [ ] Click **Export CSV** on `/history` or `/analytics` -> `.csv` downloads with accurate totals and headers.
13. [ ] Delete the test activity -> Dashboard and Analytics totals return to baseline.
14. [ ] Click **Sign out** -> redirects to `/login`.
15. [ ] Attempt to visit `/`, `/history`, or `/api/activities` while logged out -> blocked (`401` / redirect to `/login`).
16. [ ] Direct browser navigation / refresh on `/analytics` or `/goals` resolves cleanly via Express SPA fallback (`dist/index.html`).
17. [ ] Test at `375px` mobile width -> sidebar drawer opens/closes, tables scroll safely inside containers, charts remain legible.
18. [ ] Inspect Render Logs -> zero unhandled exceptions or startup errors.
