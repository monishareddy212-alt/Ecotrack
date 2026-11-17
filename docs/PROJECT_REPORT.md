# EcoTrack — Carbon Emission & Sustainability Tracker
## College DBMS Mini-Project Report

---

## 1. Project Title
**EcoTrack — Carbon Emission & Sustainability Tracker**

---

## 2. Abstract
EcoTrack is a full-stack relational Database Management System (DBMS) web application designed to help individuals record everyday carbon-emitting activities, compute estimated greenhouse gas emissions (`kg CO2e`), analyze monthly and daily sustainability patterns, manage monthly emission budgets, review rule-based reduction recommendations, and export filtered CSV reports.

Built using React, TypeScript, Tailwind CSS, Recharts, Node.js, Express.js, and PostgreSQL (Neon PostgreSQL compatible), EcoTrack replaces fragile spreadsheets and unverified local-only estimators with a normalized Third Normal Form (3NF) relational schema. Every calculation uses documented national and international emission factors stored in PostgreSQL (`emission_factors`) and preserves an auditable link from each user record (`activity_logs`) to the exact conversion factor applied at the time of entry. All user accounts, sessions, activity logs, and monthly goals are isolated per authenticated user and queried through parameterized SQL.

*(Scope disclaimer: EcoTrack calculates **estimated emissions from your recorded activities** using configured conversion factors and does not claim to compute a complete life-cycle personal carbon footprint.)*

---

## 3. Introduction
Understanding personal environmental impact requires turning everyday actions—such as driving a car, riding a bus, consuming household electricity, or using LPG cooking fuel—into consistent quantitative metrics. While public conversion factors exist from institutions such as the Central Electricity Authority (CEA), the India GHG Program, the IPCC, and UK DESNZ/Defra, ordinary users rarely have a structured database that stores these factors cleanly, applies accurate arithmetic, prevents historical recalculation errors when factors change, and tracks progress against monthly targets.

EcoTrack solves this as an applied DBMS project. It combines an approachable sustainability dashboard with core relational database engineering principles: identity primary keys, foreign key referential integrity, unique and check constraints, composite B-tree indexing, server-side SQL aggregation (`SUM`, `AVG`, `COUNT`, `GROUP BY`, `DATE_TRUNC`), transactional updates (`BEGIN` / `COMMIT` / `ROLLBACK`), and PostgreSQL-backed user sessions.

---

## 4. Problem Statement
Students and households attempting to monitor daily carbon emissions commonly face four issues:
1. **Manual Calculation Errors**: Multiplying activity quantities (`km`, `kWh`, `kg`) by conversion factors manually in spreadsheets introduces unit mismatches and rounding errors.
2. **Loss of Historical Provenance**: When grid or fuel emission factors are updated for a new year, flat spreadsheets either overwrite past months' totals or lose track of which source factor produced an older number.
3. **Lack of Data Isolation & Persistence**: Browser-only prototypes using `localStorage` lose data across devices and cannot enforce multi-user isolation, referential constraints, or server-side session security.
4. **Disconnected Analytics**: Users lack a unified system that connects raw activity entries directly to monthly comparisons, category breakdowns, monthly budget tracking, and clean CSV exports.

---

## 5. Project Objectives
1. Design and implement a normalized (1NF -> 2NF -> 3NF) PostgreSQL relational schema with five core academic tables (`users`, `activity_types`, `emission_factors`, `activity_logs`, `monthly_goals`) plus transactional SQL migrations.
2. Implement real session-based authentication using bcrypt password hashing, PostgreSQL session persistence (`connect-pg-simple`), CSRF tokens, and strict user ownership isolation.
3. Build a server-side fixed-point carbon calculator (`Quantity × Emission Factor`) using documented official emission factors and honest availability handling when regional factors are unconfigured.
4. Deliver dynamic Dashboard KPIs and Recharts analytics powered directly by PostgreSQL aggregations (`SUM`, `COUNT`, `DATE_TRUNC`, `INNER JOIN`, `GROUP BY`).
5. Provide monthly sustainability goal tracking (`monthly_goals`), deterministic rule-based recommendations, advanced activity filtering, profile management, and formula-safe CSV exports.
6. Package the repository cleanly for GitHub CI testing and single-service Render deployment connected to Neon PostgreSQL.

---

## 6. Existing System Limitations
- **Spreadsheets (Excel / Google Sheets)**: Prone to accidental formula deletion, weak relational normalization, no concurrent user authentication, and risk of spreadsheet formula injection when exporting untrusted text.
- **Static Online Calculators**: Typically run one-off estimates without persistent historical storage, CRUD editing, monthly comparisons, or database-backed target monitoring.
- **Non-Relational / Browser-Only Prototypes**: Lack ACID transactions, foreign key `RESTRICT`/`CASCADE` protection, and verifiable database audit trails.

---

## 7. Proposed System
EcoTrack introduces a unified full-stack web architecture:
- **Normalized PostgreSQL Backend**: Stores users, activity catalog items, versioned emission factors, calculated activity logs, and monthly goals with strict SQL constraints.
- **Deterministic Server-Side Calculation**: Prevents client tampering by performing `Quantity × Emission Factor` on Express using `BigInt` scaled decimal arithmetic (`NUMERIC(18,6)`).
- **Real-Time Aggregation & Visualization**: Queries PostgreSQL directly for monthly totals, elapsed calendar-day averages, 6-month and 12-month bar charts, daily calendar charts, and category donut charts.
- **Single-Service Production Deployment**: Serves both the compiled React Single Page Application (`dist/`) and `/api/*` endpoints from one Express server deployed on Render.

---

## 8. Technology Stack

| Layer | Technology | Role in EcoTrack |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript | Component UI and strict static type safety |
| **Build & Styling** | Vite 8, Tailwind CSS v4 | Fast bundling and responsive EcoTrack theme |
| **Charts & Icons** | Recharts, Lucide React | Interactive bar/donut charts and accessible SVG icons |
| **Routing** | React Router v7 | Protected SPA navigation (`/`, `/add-activity`, `/history`, `/analytics`, `/goals`) |
| **Backend** | Node.js, Express 4 | REST API (`/api/*`), session management, security middleware |
| **Security** | `bcryptjs`, `express-session`, `connect-pg-simple`, `express-rate-limit` | Password hashing, PostgreSQL sessions, CSRF checks, auth rate limiting |
| **Database** | PostgreSQL (Neon PostgreSQL), `node-postgres` (`pg`) | Relational persistence, parameterized SQL, ACID transactions |
| **Hosting & CI** | GitHub, GitHub Actions, Render Web Service | Automated PostgreSQL CI tests and single-service production hosting |

---

## 9. System Architecture
EcoTrack follows a three-tier client–server–database architecture deployed as one cohesive web service:

```text
[ Browser (React 19 + Recharts SPA) ]
        |  HTTPS (HTTP-only session cookie + X-CSRF-Token)
        v
[ Render Node.js Web Service (Express 4 on 0.0.0.0:$PORT) ]
   |-- Static Assets (dist/index.html + Vite bundle)
   |-- Security Middleware (Helmet-equivalent headers, CSRF, Rate Limit)
   |-- REST API Routes (/api/auth, /api/activities, /api/analytics, /api/goals, /api/recommendations, /api/reports, /api/profile)
        |  TLS Parameterized SQL via pg.Pool
        v
[ Neon PostgreSQL (5 Academic Tables + session + schema_migrations) ]
```

---

## 10. Functional Requirements
1. **Authentication & Profile**: Register new accounts, validate email format and uniqueness, log in/out, persist sessions across page refreshes, protect private routes, and update user display names (`full_name`).
2. **Activity Logging & CRUD**: Select category (`Transportation`, `Energy`, `Lifestyle`), select activity type with locked measurement unit, enter positive quantity and valid calendar date, compute `calculated_co2e` on the backend, list with pagination/search/filters, view details with factor provenance, edit, and delete.
3. **Dashboard & Analytics**: Compute monthly emissions, daily calendar average, previous-month percentage comparison, 6M/12M monthly trends, daily calendar breakdown (including leap-year Feb 29), category shares, highest emission category, and 5 most recent entries.
4. **Goals & Recommendations**: Create, update, and delete one sustainability target per user per month; classify progress (`Within Target`, `Approaching Target`, `At Target`, `Target Exceeded`); generate deterministic rule-based sustainability recommendations.
5. **Reports & CSV Export**: Generate monthly category summary JSON reports and download UTF-8 CSV exports reflecting active filters with formula-injection protection.

---

## 11. Nonfunctional Requirements
- **Security**: Bcrypt password hashing (cost 12), `HttpOnly` + `SameSite=Lax` + `Secure` (production) cookies, session regeneration on login, CSRF token verification on state-changing routes, strict `user_id` ownership checks, parameterized SQL (`$1, $2`), and security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **Accuracy**: Zero floating-point drift in carbon arithmetic via `BigInt` fixed-point scaling (`NUMERIC(18,6)` storage) and documented emission factor citations.
- **Performance**: Database-side SQL `SUM`/`COUNT`/`GROUP BY` aggregations, composite B-tree indexes (`idx_activity_logs_user_date`, `idx_activity_logs_user_recent`, `idx_activity_logs_user_co2e`), server-side pagination, and bounded CSV exports (`5,000` rows max).
- **Usability & Responsiveness**: Clean visual hierarchy accessible across `1440px` desktop, `1024px` laptop, `768px` tablet, and `375px` mobile screens with keyboard focus rings and empty/loading/error states.

---

## 12. ER Diagram
EcoTrack models four primary One-to-Many (`1:N`) relationships across five tables:

```text
users (1) ──────< (N) activity_logs (N) >────── (1) emission_factors (N) >────── (1) activity_types
  |
  └──────< (N) monthly_goals
```

- `users` to `activity_logs`: `1:N` (`ON DELETE CASCADE`)
- `users` to `monthly_goals`: `1:N` (`ON DELETE CASCADE`)
- `activity_types` to `emission_factors`: `1:N` (`ON DELETE RESTRICT`)
- `emission_factors` to `activity_logs`: `1:N` (`ON DELETE RESTRICT`)

*(See `docs/ER_DIAGRAM.md` for full Mermaid and ASCII diagrams.)*

---

## 13. Relational Schema
- `users` (**id**, full_name, email, password_hash, created_at)
- `activity_types` (**id**, category, name, unit, is_active)
- `emission_factors` (**id**, *activity_type_id*, factor_kg_co2e_per_unit, unit, source, source_url, reference_year, effective_date, geographic_scope, notes, created_at)
- `activity_logs` (**id**, *user_id*, *emission_factor_id*, quantity, calculated_co2e, activity_date, created_at)
- `monthly_goals` (**id**, *user_id*, goal_month, target_co2e, created_at)

---

## 14. Table Descriptions
1. **`users`**: Stores registered accounts (`id`, `full_name`, lowercase-trimmed unique `email`, salted `password_hash`, `created_at`).
2. **`activity_types`**: Catalog of supported activities (`Transportation`, `Energy`, `Lifestyle`), names, and canonical units (`km`, `kWh`, `kg`, `meals`).
3. **`emission_factors`**: Versioned `kg CO2e/unit` conversion factors with publication source, URL, reference year, effective date, geographic scope, and methodological notes.
4. **`activity_logs`**: User activity entries referencing `user_id` and the exact `emission_factor_id` used to calculate `calculated_co2e`.
5. **`monthly_goals`**: User monthly emission ceilings (`target_co2e`) anchored strictly to the first day of each month (`goal_month`).
6. **Infrastructure Tables** (separate from academic entities): `schema_migrations` (tracks executed SQL migrations) and `session` (persists Express sessions for `connect-pg-simple`).

---

## 15. Primary Keys
Every table uses a surrogate `BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` named `id`:
- `users.id`
- `activity_types.id`
- `emission_factors.id`
- `activity_logs.id`
- `monthly_goals.id`

---

## 16. Foreign Keys
1. `emission_factors.activity_type_id` -> `activity_types(id)` (`ON DELETE RESTRICT`)
2. `activity_logs.user_id` -> `users(id)` (`ON DELETE CASCADE`)
3. `activity_logs.emission_factor_id` -> `emission_factors(id)` (`ON DELETE RESTRICT`)
4. `monthly_goals.user_id` -> `users(id)` (`ON DELETE CASCADE`)

---

## 17. Relationships
- **`ON DELETE CASCADE` on user ownership**: Deleting a user removes their private `activity_logs` and `monthly_goals` automatically.
- **`ON DELETE RESTRICT` on factor provenance**: Deleting an activity log never deletes its `emission_factor`, and PostgreSQL rejects deleting any `emission_factor` or `activity_type` referenced by existing activity logs—guaranteeing audit integrity.

---

## 18. Database Normalization
- **1NF (First Normal Form)**: All columns contain atomic scalar values (no comma-separated lists or nested arrays), and every table defines a primary key.
- **2NF (Second Normal Form)**: Every table has a single-column surrogate primary key (`id`), so partial dependencies on composite primary keys cannot occur.
- **3NF (Third Normal Form)**: No non-key attribute depends transitively on another non-key attribute. `activity_logs` stores `emission_factor_id` instead of duplicating `category`, `name`, `unit`, or `source`; `emission_factors` stores `activity_type_id` instead of duplicating `category` or `name`.
- **Controlled Audit Snapshot**: `activity_logs.calculated_co2e` stores the pre-computed `NUMERIC(18,6)` emission value alongside `emission_factor_id` as an immutable financial-style audit snapshot so analytics queries execute quickly without recalculating every historical row on read.

---

## 19. SQL Query Examples
EcoTrack executes real parameterized SQL across all operations (see `docs/SQL_QUERIES.md` for all 13 documented examples):
- `INNER JOIN` reconstructing `activity_logs -> emission_factors -> activity_types` for Activity History and CSV exports.
- `SUM(calculated_co2e)` and `COUNT(*)` with half-open calendar bounds (`activity_date >= $2::date AND activity_date < $3::date`) for Dashboard KPIs.
- `DATE_TRUNC('month', activity_date)` + `GROUP BY` for 6-month and 12-month emission trends.
- `LEFT JOIN monthly_goals` with `activity_logs` so goals with zero activities still report `0 kg CO2e` used.
- `SELECT ... FOR UPDATE` inside `withTransaction()` when updating activity records safely.

---

## 20. Carbon Calculation Method
$$\text{Estimated Carbon Emissions (kg CO}_2\text{e)} = \text{Activity Quantity} \times \text{Emission Factor}$$

1. **Factor Selection**: The backend queries `emission_factors` where `activity_type_id = $1 AND effective_date <= $2::date ORDER BY effective_date DESC, id DESC LIMIT 1`.
2. **Exact Arithmetic**: `server/utils/carbonCalculator.ts` scales inputs to fixed-point `BigInt` integers (`quantity × 10^3`, `factor × 10^8`), multiplies cleanly without binary floating-point inaccuracy, and formats `NUMERIC(18,6)`.
3. **Seeded Verified Factors**:
   - `Car Travel`: `0.14 kg CO2e/km` (India GHG Program 2015, Hatchback `<1400 cc` Gasoline, 8% uplift)
   - `Motorcycle Travel`: `0.0516 kg CO2e/km` (India GHG Program 2015, Two-wheelers Petrol)
   - `Bus Travel`: `0.01516 kg CO2e/km` (India GHG Program 2015, Intracity Bus passenger-km)
   - `Metro Travel`: `0.0286 kg CO2e/km` (UK DESNZ / Defra 2024 Light rail & tram proxy)
   - `Electricity Consumption`: `0.727 kg CO2e/kWh` (CEA India CO₂ Baseline Database v20.0, FY 2023–24)
   - `LPG Cooking Gas`: `2.98463 kg CO2e/kg` (2006 IPCC Guidelines Vol. 2 Ch. 2)
4. **Honest Factor Boundaries**: `Plant-Based Meal` and `Meat-Based Meal` remain intentionally unseeded because published dietary LCA studies vary widely by region and portion size. The UI clearly flags meal estimates as unavailable/approximate without fabricated constants, and `POST /api/activities` returns HTTP `422`.

---

## 21. Module Descriptions
- **Authentication & Profile (`AuthContext`, `authRoutes`, `profileRoutes`, `authService`)**: Registration, login, session persistence, CSRF protection, and full-name profile updates.
- **Activity Logging & History (`AddActivityPage`, `ActivityHistoryPage`, `activityRoutes`, `activityService`)**: Dynamic catalog loading, server-side carbon math, pagination, filtering (`category`, `activityTypeId`, `startDate`, `endDate`, `minEmissions`, `maxEmissions`, `search`), edit modal with historical factor preservation, and delete confirmation.
- **Dashboard & Analytics (`DashboardPage`, `AnalyticsPage`, `analyticsRoutes`, `analyticsService`)**: KPI cards, 6M/12M trend charts, daily calendar charts, category donut breakdown, highest emission category, and monthly comparisons.
- **Goals, Recommendations & Reports (`GoalsSettingsPage`, `goalRoutes`, `recommendationRoutes`, `reportRoutes`)**: Monthly goal CRUD, deterministic rule engine (`recommendationEngine.ts`), monthly JSON summaries, and UTF-8 BOM CSV exports (`csvExport.ts`).

---

## 22. UI Screenshots
Inside the Google AI Studio build container, `DATABASE_URL` (PostgreSQL) was not provisioned, so browser verification covered public authentication UI screens (`/login`, `/register`) directly while authenticated screens require a live Neon PostgreSQL instance.

**Screenshots Students Should Capture After Live Render + Neon Deployment**:
1. Login Page (`/login`) and Registration Page (`/register`)
2. Sustainability Dashboard (`/`) showing populated KPIs, 6M/12M bar chart, Category Donut chart, and Recent Activities
3. Record New Activity (`/add-activity`) showing live backend calculation preview & cited emission factor
4. Activity History (`/history`) with filters applied, Detail Modal, and Edit Modal
5. Carbon Analytics (`/analytics`) showing Daily Emission Trend and Category Summary Table
6. Sustainability Goals & Settings (`/goals`) showing Monthly Target progress bar, Sustainability Tips, and Profile settings
7. Mobile (`375px`) responsive view of Dashboard & Navigation drawer

---

## 23. Testing Methodology
EcoTrack uses a multi-layered testing strategy:
1. **Static Verification**: TypeScript strict type-checking (`npm run lint`) and Vite + esbuild production bundling (`npm run build`).
2. **Pure Logic Unit Tests (`node:test` + `tsx`)**: Automated validation of email/password rules, fixed-point carbon calculations, calendar bounds (including leap-year Feb 29 and year-end transitions), goal thresholds, recommendation rules, and CSV formula-injection escaping.
3. **PostgreSQL & HTTP Integration Tests (`server/tests/integration.test.ts`)**: End-to-end API tests verifying migrations, idempotent seeding, SQL `CHECK`/`UNIQUE` constraints, CSRF enforcement, session cookies, Activity CRUD, Analytics calculations, Goals CRUD, CSV export, and two-user cross-account ownership isolation (`404` on foreign records). Automated in CI via `.github/workflows/ci.yml` with `postgres:16-alpine`.
4. **Browser & Responsive UI Verification (`playwright-cli`)**: Headless Chromium checks across `1440px`, `1024px`, `768px`, and `375px` viewports for zero console errors and zero horizontal overflow.

---

## 24. Actual Test Results
All unit tests, TypeScript checks, production build checks, live `/api/health` checks, and headless Chromium layout checks executed cleanly after Phase 6 edits. PostgreSQL-dependent integration tests skip gracefully in environments lacking `DATABASE_URL` and are ready to execute against Neon PostgreSQL or in GitHub Actions CI. *(See `docs/TEST_REPORT.md` for exact executed commands, counts, and environment scope.)*

---

## 25. Deployment Architecture
EcoTrack deploys as **one Render Node.js Web Service** (`render.yaml`):
- **Build Command**: `npm ci && npm run build` (compiles React SPA to `dist/` and bundles `server.ts` to `server.js`).
- **Start Command**: `npm start` (`NODE_ENV=production node server.js`, binding to `0.0.0.0:$PORT`).
- **Database**: Neon PostgreSQL (`DATABASE_URL` stored only in Render Environment Variables; automatic TLS enabled).
- **Migrations**: Executed manually before deployment from an authorized local terminal or secure CI runner (`npm run db:migrate && npm run db:seed`), avoiding Render Free Tier limitations on shell/pre-deploy hooks.

---

## 26. Limitations
1. **Unseeded Meal Factors**: `Plant-Based Meal` and `Meat-Based Meal` require verified regional LCA factors before logging in `activity_logs`.
2. **Single Reporting Timezone**: Daily average calculations use `Asia/Kolkata` as the fixed calendar timezone rather than a per-user timezone setting.
3. **Render Free Tier Cold Starts**: Free Render Web Services spin down after 15 minutes of inactivity, causing an initial 30–50 second wake-up delay on the first request.
4. **CSV Row Cap**: CSV exports are capped at `5,000` rows per request (`HTTP 413` above limit) to protect free-tier server memory.
5. **No Self-Service Password Reset**: Email-based password reset tokens are outside the six-phase college mini-project scope.

---

## 27. Future Enhancements
- Add verified regional dietary emission factors (`emission_factors`) with meal-portion selectors.
- Support per-user timezone selection stored in `users` for global reporting calendars.
- Implement password reset workflows and optional multi-factor authentication.
- Add multi-currency / household utility bill OCR or batch CSV import validation.
- Support annual sustainability PDF summaries directly from PostgreSQL report aggregates.

---

## 28. Conclusion
EcoTrack successfully demonstrates how relational DBMS engineering transforms sustainability tracking into a reliable, auditable, and scalable web application. By combining PostgreSQL 3NF schema design, ACID transactions, exact server-side decimal math, session security, and clean React/Recharts visualizations, the project fulfills all academic DBMS objectives while staying practical for single-service Render and Neon deployment.

---

## 29. References
1. **PostgreSQL Documentation (v16)** — Relational Constraints, Transactions, Indexes, and `NUMERIC` types: https://www.postgresql.org/docs/
2. **Central Electricity Authority (CEA), Ministry of Power, Govt. of India** — *CO₂ Baseline Database for the Indian Power Sector, User Guide Version 20.0 (FY 2023–24)*: https://cea.nic.in/
3. **India GHG Program** — *India Specific Road Transport Emission Factors (2015)*: https://indiaghgp.org/
4. **2006 IPCC Guidelines for National Greenhouse Gas Inventories**, Volume 2: Energy, Chapter 2 (Stationary Combustion): https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html
5. **UK Department for Energy Security and Net Zero (DESNZ) / Defra** — *Greenhouse Gas Reporting: Conversion Factors 2024*: https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting
6. **OWASP Cheat Sheet Series** — *Cross-Site Request Forgery, Session Management, Password Storage, and CSV Injection*: https://cheatsheetseries.owasp.org/
7. **Render & Neon Documentation** — Node.js Web Service & Serverless PostgreSQL TLS Guides: https://render.com/docs and https://neon.tech/docs
