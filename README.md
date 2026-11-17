# EcoTrack — Carbon Emission & Sustainability Tracker

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL 8+](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Express.js](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

> **Academic Coursework Project**: Database Management Systems (DBMS) & Full-Stack Web Application  
> **Domain**: Environmental Informatics, Carbon Accounting & Sustainability Analytics  
> **Key Architecture**: Unified Single-Server (Express serves React 19 SPA + RESTful API on a single port)

---

## Table of Contents

1. [Project Overview & Motivation](#1-project-overview--motivation)
2. [Key Highlights & Academic Relevance](#2-key-highlights--academic-relevance)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture (Unified Single Server)](#4-system-architecture-unified-single-server)
5. [Database Design & Normalization (3NF)](#5-database-design--normalization-3nf)
   - [Entity-Relationship (ER) Model](#entity-relationship-er-model)
   - [Relational Schema & Constraints](#relational-schema--constraints)
   - [Normalization Justification (1NF, 2NF, 3NF)](#normalization-justification-1nf-2nf-3nf)
6. [Core Functional Modules](#6-core-functional-modules)
7. [Mathematical Formulation & Emission Math](#7-mathematical-formulation--emission-math)
8. [Scientific Emission Factor Provenance](#8-scientific-emission-factor-provenance)
9. [Project Directory Structure](#9-project-directory-structure)
10. [Local Installation & Setup Guide](#10-local-installation--setup-guide)
11. [Production Deployment (Render Ready)](#11-production-deployment-render-ready)
12. [College Viva & Presentation Defense Guide](#12-college-viva--presentation-defense-guide)

---

## 1. Project Overview & Motivation

Climate change and greenhouse gas emissions are among the defining global challenges of our generation (UN Sustainable Development Goal 13: *Climate Action*). However, individuals often struggle to understand how everyday decisions—such as daily commutes, home electricity use, and cooking fuel consumption—translate into quantifiable environmental impact.

**EcoTrack** is a production-grade, relational DBMS web application designed to:
- Enable users to log daily activities across three core sectors: **Transportation**, **Energy**, and **Lifestyle**.
- Compute exact carbon emissions ($kg\text{ CO}_2\text{e}$) using **scientifically validated conversion factors** from government bodies and international agencies (IPCC, CEA India, UK DEFRA, US EPA).
- Present visual analytics including month-over-month comparisons, daily emission curves, and category breakdowns.
- Empower users to establish **monthly carbon reduction targets** with automated threshold detection.
- Provide **deterministic rule-based eco recommendations** to guide measurable behavioral changes.
- Export certified, audit-ready CSV activity reports protected against spreadsheet formula injection.

---

## 2. Key Highlights & Academic Relevance

- **Enterprise Relational Modeling**: Full 3NF normalization implemented in MySQL 8+ with the InnoDB storage engine, foreign keys (`ON DELETE CASCADE`, `ON DELETE RESTRICT`), unique constraints, and B-Tree indexes.
- **Unified Single Server**: Both the compiled React frontend (SPA) and Express REST API operate on a single port (`3000`), completely eliminating CORS latency, proxy overhead, and multi-service hosting costs.
- **Scientific Carbon Engine**: Implements server-side fixed-point calculation to completely prevent IEEE 754 floating-point drift, linked to historical versioned emission factors.
- **Multi-Layered Security**:
  - Email normalization (`LOWER(TRIM(email))`).
  - Bcrypt password hashing (cost factor 12).
  - MySQL-backed session store (`express-mysql-session`) with `HttpOnly`, `SameSite=Lax`, and `Secure` cookie flags.
  - Double-Submit CSRF token verification on all mutating requests (`POST`, `PUT`, `DELETE`).
  - Rate limiting on authentication routes (brute-force defense).
  - Strict SQL injection immunity via parameterized MySQL queries (`?`).

---

## 3. Technology Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Component-driven UI, declarative state hooks, and high-performance DOM reconciliation. |
| **Language** | **TypeScript 5.x** | End-to-end static type safety from database DTOs to UI components. |
| **Build & Tooling** | **Vite 8** | Sub-second Hot Module Replacement (HMR) and optimized Rolldown/ESBuild production bundling. |
| **Styling** | **Tailwind CSS v4** | Modern utility-first responsive styling with zero runtime CSS bundle overhead. |
| **Data Visualization** | **Recharts 3** | Responsive SVG charts (Bar charts for monthly trends, Donut charts for category shares). |
| **Icons** | **Lucide React** | Clean, accessible SVG iconography. |
| **Backend Runtime** | **Node.js 20+** | Non-blocking, event-driven JavaScript server environment. |
| **Web Server** | **Express 4.21** | Robust middleware ecosystem for RESTful API routing and static asset delivery. |
| **Database Engine** | **MySQL 8+ (InnoDB)** | ACID compliance, row-level locking, foreign key integrity, and relational indexing. |
| **Database Client** | **`mysql2/promise`** | High-performance MySQL driver with native connection pooling and async/await support. |
| **Session Management**| **`express-mysql-session`**| Server-side session storage persisted in MySQL (scalable across process restarts). |
| **Cryptography** | **`bcryptjs`** | Salted password hashing resistant to rainbow table and GPU attacks. |
| **Testing** | **`node:test` + `tsx`** | Native Node.js test runner for unit, integration, and security test suites. |

---

## 4. System Architecture (Unified Single Server)

EcoTrack adopts a **unified single-server architecture**, allowing the entire application to be packaged into a single deployable artifact:

```mermaid
flowchart TD
    Client["Client Browser (React 19 SPA)"]
    
    subgraph Express_Server ["Unified Express Server (:3000)"]
        direction TB
        SecurityMiddleware["Security Headers, JSON Parser, Trust Proxy"]
        SessionMiddleware["MySQL Session Store & CSRF Guard"]
        
        subgraph Routing_Layer ["Routing & Dispatch Layer"]
            ApiRouter["/api/* REST Endpoints\n(Auth, Activity, Analytics, Goals)"]
            StaticRouter["Static File Middleware\n(dist/assets/*.js, *.css)"]
            SpaFallback["SPA Fallback Route (*)\n(Serves dist/index.html)"]
        end
        
        subgraph Service_Layer ["Relational Business Logic"]
            ActivityService["Activity & Calculation Service"]
            AnalyticsService["Analytics Aggregation Service"]
            GoalService["Goal Tracking Service"]
            AuthService["Authentication Service"]
        end
    end
    
    Database[("MySQL 8+ Database\n(InnoDB Engine)")]
    
    Client -->|"HTTP Requests"| Express_Server
    Express_Server --> SecurityMiddleware
    SecurityMiddleware --> SessionMiddleware
    SessionMiddleware --> Routing_Layer
    
    ApiRouter --> Service_Layer
    Service_Layer -->|"Parameterized SQL (?)"| Database
    StaticRouter -->|"Direct Cacheable Assets"| Client
    SpaFallback -->|"Client Navigation"| Client
```

### Development vs. Production Execution

- **Development (`npm run dev`)**:
  Express dynamically embeds the **Vite Dev Server** as an internal middleware. API requests to `/api/*` are intercepted by Express routes, while all other requests trigger Vite's real-time compiler with Hot Module Replacement on `http://localhost:3000`.
- **Production (`npm start`)**:
  Vite pre-compiles static files into the `dist/` directory, while `server.ts` is bundled by `esbuild` into a standalone `server.js`. The Express server serves optimized static assets with cache headers, routes `/api/*` to the REST controllers, and provides client-side SPA routing fallback to `dist/index.html`.

---

## 5. Database Design & Normalization (3NF)

### Entity-Relationship (ER) Model

```mermaid
erDiagram
    USERS ||--o{ ACTIVITY_LOGS : "logs"
    USERS ||--o{ MONTHLY_GOALS : "defines"
    USERS ||--o{ SESSIONS : "authenticates"
    ACTIVITY_TYPES ||--o{ EMISSION_FACTORS : "has versions"
    EMISSION_FACTORS ||--o{ ACTIVITY_LOGS : "calibrates"

    USERS {
        bigint_unsigned id PK
        varchar_150 full_name
        varchar_255 email UK
        text password_hash
        datetime_6 created_at
    }

    ACTIVITY_TYPES {
        bigint_unsigned id PK
        varchar_50 category
        varchar_150 name UK
        varchar_30 unit
        boolean is_active
    }

    EMISSION_FACTORS {
        bigint_unsigned id PK
        bigint_unsigned activity_type_id FK
        decimal_16_8 factor_kg_co2e_per_unit
        varchar_30 unit
        text source
        text source_url
        int reference_year
        date effective_date
        datetime_6 created_at
    }

    ACTIVITY_LOGS {
        bigint_unsigned id PK
        bigint_unsigned user_id FK
        bigint_unsigned emission_factor_id FK
        decimal_14_3 quantity
        decimal_18_6 calculated_co2e
        date activity_date
        datetime_6 created_at
    }

    MONTHLY_GOALS {
        bigint_unsigned id PK
        bigint_unsigned user_id FK
        date goal_month UK
        decimal_14_3 target_co2e
        datetime_6 created_at
    }

    SESSIONS {
        varchar_128 session_id PK
        int_unsigned expires
        mediumtext data
    }
```

---

### Relational Schema & Constraints

#### 1. `users` Table
Stores registered user identities and credentials.
```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2. `activity_types` Table
Maintains catalog of supported carbon-emitting activities.
```sql
CREATE TABLE IF NOT EXISTS activity_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_activity_types_category_name UNIQUE (category, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 3. `emission_factors` Table
Stores versioned, documented emission conversion factors.
```sql
CREATE TABLE IF NOT EXISTS emission_factors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_type_id BIGINT UNSIGNED NOT NULL,
  factor_kg_co2e_per_unit DECIMAL(16,8) NOT NULL,
  unit VARCHAR(30) NULL,
  source TEXT NOT NULL,
  source_url TEXT NULL,
  reference_year INT NULL,
  effective_date DATE NOT NULL,
  geographic_scope TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_emission_factors_version UNIQUE (activity_type_id, effective_date, source(191)),
  CONSTRAINT fk_emission_factors_activity_type FOREIGN KEY (activity_type_id) 
    REFERENCES activity_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 4. `activity_logs` Table
The central transactional fact table storing user activities and calculated emissions.
```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  emission_factor_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  calculated_co2e DECIMAL(18,6) NOT NULL,
  activity_date DATE NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_factor FOREIGN KEY (emission_factor_id) 
    REFERENCES emission_factors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 5. `monthly_goals` Table
Tracks user-defined monthly reduction targets.
```sql
CREATE TABLE IF NOT EXISTS monthly_goals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  goal_month DATE NOT NULL,
  target_co2e DECIMAL(14,3) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_monthly_goals_user_month UNIQUE (user_id, goal_month),
  CONSTRAINT fk_monthly_goals_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Normalization Justification (1NF, 2NF, 3NF)

1. **First Normal Form (1NF)**:
   - All columns contain atomic values (single scalar value per cell).
   - Each table has a primary key (`id` or `session_id`).
   - No repeating groups or arrays are stored inside columns.
2. **Second Normal Form (2NF)**:
   - Complies with 1NF.
   - All non-key attributes are fully functionally dependent on the entire primary key (single-column surrogate keys prevent partial dependencies).
3. **Third Normal Form (3NF)**:
   - Complies with 2NF.
   - No transitive dependencies exist. For example, `activity_types` (name, category, default unit) are factored out of `emission_factors`. `activity_logs` only stores foreign keys to `users` and `emission_factors`, computing and storing the point-in-time calculation to preserve historical auditability without redundant storage of factor source notes.

---

## 6. Core Functional Modules

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          EcoTrack Modules                              │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ 1. Auth & Admin  │ 2. Activity Log  │ 3. Dashboard     │ 4. Analytics  │
│  - Secure Login  │  - Category Pick │  - Monthly KPIs  │  - Trend Chart│
│  - Registration  │  - Unit Match    │  - MoM Delta     │  - Daily Plot │
│  - Session Guard │  - Auto Math     │  - Recent Feed   │  - Donut Share│
├──────────────────┼──────────────────┼──────────────────┼───────────────┤
│ 5. Goals Tracker │ 6. Recommendations│ 7. CSV Reporter │ 8. Profile    │
│  - Monthly Target│  - Rule Engine   │  - Multi-Filter  │  - Name Update│
│  - Usage % Bar   │  - Actionable Tip│  - RFC-4180 CSV  │  - Security Me│
│  - 4 Statuses    │  - No AI Blackbox│  - Formula Guard │  - Logout     │
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

1. **Authentication & Session Security**:
   - Secure cookie session lifecycle with CSRF handshake (`GET /api/auth/csrf`).
   - Session store automatically tracks active sessions in the MySQL `sessions` table.
2. **Activity Logging & Real-Time Carbon Math**:
   - Dynamic activity type loading (`GET /api/activity-types`).
   - Interactive quantity input with real-time emissions estimate preview.
   - Persisted via database transaction (`POST /api/activities`).
3. **Interactive Sustainability Dashboard**:
   - Monthly total carbon emissions, active logging days, and daily emission average.
   - Month-over-Month comparison with percentage increase/decrease badge.
   - Category distribution donut chart and top 5 recent activities.
4. **Analytics & Trend Analysis**:
   - Trailing 6-month and 12-month interactive historical emission bar charts.
   - Complete daily calendar view for the selected month (1 to 28/29/30/31 days).
   - Category breakdown with percentage share of emissions.
5. **Goal Setting & Target Monitoring**:
   - Target setting per calendar month (`YYYY-MM-01`).
   - Real-time progress bar reflecting current emissions against the target.
   - Automated threshold status:
     - `Within Target` ($< 80\%$)
     - `Approaching Target` ($80\% - 99.9\%$)
     - `At Target` ($= 100\%$)
     - `Target Exceeded` ($> 100\%$)
6. **Deterministic Rule-Based Recommendations**:
   - Analyzes user's actual highest-emission category and goal status.
   - Returns tailored, actionable sustainability guidance without third-party black-box AI dependencies.
7. **Activity History & Certified CSV Export**:
   - Search by activity name, filter by category, date range, and emission bounds.
   - One-click CSV download (`GET /api/reports/export`) formatted with UTF-8 BOM, sanitized against formula injection (`=`, `+`, `-`, `@`).

---

## 7. Mathematical Formulation & Emission Math

### 1. Carbon Emission Formula
The carbon emissions generated by any logged activity are computed on the backend using:
$$\text{Calculated Emissions } (kg\text{ CO}_2\text{e}) = \text{Quantity} \times \text{Emission Factor}$$

*Example*: Driving a petrol car for $25\text{ km}$:
$$\text{Emissions} = 25\text{ km} \times 0.140\text{ kg CO}_2\text{e/km} = 3.500000\text{ kg CO}_2\text{e}$$

### 2. Daily Average Emissions
$$\text{Daily Average } (kg/\text{day}) = \frac{\text{Total Month Emissions}}{\text{Elapsed Calendar Days in Month}}$$

### 3. Month-over-Month (MoM) Percentage Delta
$$\Delta \% = \left(\frac{\text{Current Month Emissions} - \text{Previous Month Emissions}}{\text{Previous Month Emissions}}\right) \times 100$$

### 4. Goal Usage Percentage
$$\text{Usage } \% = \left(\frac{\text{Actual Emissions}}{\text{Target Emissions}}\right) \times 100$$

---

## 8. Scientific Emission Factor Provenance

All default factors in EcoTrack are sourced from verified governmental and scientific literature:

| Category | Activity Type | Unit | Emission Factor ($kg\text{ CO}_2\text{e/unit}$) | Primary Reference Source |
| :--- | :--- | :---: | :---: | :--- |
| **Energy** | Electricity Consumption | `kWh` | `0.72700000` | Central Electricity Authority (CEA), Ministry of Power, Govt. of India — *CO2 Baseline Database v20.0 (FY 2023-24)*. |
| **Energy** | LPG Cooking Gas | `kg` | `2.98463000` | 2006 IPCC Guidelines for National Greenhouse Gas Inventories (Vol. 2 Energy, Stationary Combustion). |
| **Transportation** | Car Travel (Petrol) | `km` | `0.14000000` | UK DEFRA / Department for Energy Security and Net Zero (DESNZ) GHG Conversion Factors (2024). |
| **Transportation** | Motorcycle Travel | `km` | `0.06500000` | UK DEFRA / DESNZ Average Motorcycle Emission Factors (2024). |
| **Transportation** | Bus Travel | `km` | `0.05000000` | UK DEFRA / DESNZ Local Public Transit Passenger-Kilometer Factors (2024). |
| **Transportation** | Metro Travel | `km` | `0.02500000` | Delhi Metro Rail Corporation (DMRC) / UK DEFRA Light Rail & Tram passenger-km conversion. |
| **Lifestyle** | Plant-Based Meal | `meals` | *Unseeded* | Configurable via regional Life Cycle Assessment (LCA) datasets. |
| **Lifestyle** | Meat-Based Meal | `meals` | *Unseeded* | Configurable via regional Life Cycle Assessment (LCA) datasets. |

---

## 9. Project Directory Structure

```text
ecotrack/
├── .github/workflows/ci.yml       # GitHub Actions automated build & test workflow
├── docs/                          # Academic reports, viva guides, and architecture documentation
├── public/                        # Static web assets (favicon, manifest)
├── server/                        # Express Backend & Relational Database Layer
│   ├── config/env.ts              # Environment loader & SSL resolution
│   ├── db/
│   │   ├── connection.ts          # MySQL pool, transaction wrapper, query normalization
│   │   ├── migrate.ts             # Migration runner for MySQL
│   │   ├── migrations/            # SQL migration scripts (001 to 004)
│   │   └── seeds/                 # Idempotent catalog and factor seeders
│   ├── middleware/                # requireAuth, csrf, rateLimit middlewares
│   ├── routes/                    # Express REST route handlers
│   ├── services/                  # Relational business logic & queries
│   ├── tests/                     # Integration and security test suites
│   └── utils/                     # Carbon math, date calculations, CSV builders
├── src/                           # React 19 Frontend Application
│   ├── components/                # Modular UI, cards, layout, charts
│   ├── context/                   # AuthContext for session management
│   ├── pages/                     # Dashboard, History, AddActivity, Analytics, Goals, Login, Register
│   ├── services/                  # Frontend apiClient with CSRF interceptor
│   └── types/                     # Shared TypeScript interfaces
├── index.html                     # Frontend SPA entrypoint
├── package.json                   # Dependencies, scripts, and Node engine specifications
├── render.yaml                    # Render Node.js Web Service Blueprint
├── server.ts                      # Unified server entrypoint (Vite dev middleware + Prod static serving)
├── tsconfig.json                  # Strict TypeScript compiler configuration
└── vite.config.ts                 # Vite bundler and Tailwind CSS plugins
```

---

## 10. Local Installation & Setup Guide

### Prerequisites
- **Node.js**: Version `20.0.0` or higher (`node -v`)
- **npm**: Version `9.0.0` or higher (`npm -v`)
- **MySQL**: Version `8.0` or higher (via MySQL Community Server, XAMPP, WampServer, or Docker)

### Step 1: Clone or Navigate to the Project
```bash
cd ecotrack-—-carbon-emission-&-sustainability-tracker
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```
Open `.env` and set your MySQL connection string and session secret:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://root:your_password@localhost:3306/ecotrack
SESSION_SECRET=12345678901234567890123456789012
```

### Step 4: Create MySQL Database
In your MySQL shell or MySQL Workbench:
```sql
CREATE DATABASE ecotrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 5: Start the Development Server
```bash
npm run dev
```
*(The server will automatically apply all database migrations and seed default activity types and emission factors on boot!)*

Open your browser and navigate to: **`http://localhost:3000`**

### Step 6: Verify Code Quality & Tests
```bash
npm run lint    # Type check with TypeScript compiler (0 errors)
npm test        # Run comprehensive unit & security test suite
npm run build   # Verify single-server production build bundle
```

---

## 11. Production Deployment (Render Ready)

EcoTrack is 100% production-ready for deployment on **[Render](https://render.com)** as a single Node.js Web Service.

> 📖 **Full Step-by-Step Guide**: See the comprehensive [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for detailed cloud MySQL setup (Aiven/Railway), environment configuration, and verification checklist.

### Render Deployment Steps
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New + &rarr; Web Service**.
3. Connect your GitHub repository.
4. Set the following build and start commands:
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your cloud MySQL connection string (from Aiven, PlanetScale, Railway, or AWS RDS).
   - `SESSION_SECRET`: A secure 32+ character random string.
6. Click **Deploy Web Service**. Render will build the React frontend, bundle the backend, run migrations on boot, and launch your application on a live HTTPS URL!

---

## 12. College Viva & Presentation Defense Guide

Here are the most frequently asked questions by college examiners and professors, along with clear answers:

#### Q1: Why did you choose MySQL over NoSQL (MongoDB)?
> *"Carbon accounting requires strict transactional consistency and relational integrity. In EcoTrack, activity logs reference specific emission factors and users. If an emission factor or user is modified, relational integrity ensures foreign key constraints are enforced (`ON DELETE RESTRICT` / `CASCADE`). Furthermore, relational aggregations (`SUM`, `COUNT`, `DATE_FORMAT`, `GROUP BY`) are optimized in MySQL using B-Tree indexes, making it ideal for financial and environmental ledger accounting."*

#### Q2: How does the "Single-Server" architecture work?
> *"Instead of running a separate Vite dev server on port 5173 and Express API on port 5000, our `server.ts` unifies both. In development, Vite runs as an internal middleware inside Express. In production, Vite pre-builds the React frontend to `dist/`, and Express serves those static files while handling `/api/*` routes. Any navigation route is caught by an Express SPA fallback that returns `index.html`. This eliminates CORS issues and reduces hosting requirements to a single server instance."*

#### Q3: Why use cookie sessions instead of JWT?
> *"JWTs stored in browser `localStorage` or `sessionStorage` are vulnerable to Cross-Site Scripting (XSS) attacks. EcoTrack uses HTTP-only, SameSite=Lax cookie-based sessions backed by MySQL (`express-mysql-session`). The session ID cannot be read by client-side JavaScript, and user sessions can be revoked immediately on logout by deleting the record in the database."*

#### Q4: How is SQL Injection prevented?
> *"All database interactions in EcoTrack utilize parameterized queries with `?` placeholders via `mysql2/promise`. User inputs are transmitted as separate data protocol packets to MySQL, completely preventing malicious SQL code injection."*

#### Q5: How do you prevent floating-point calculation errors?
> *"JavaScript numbers are IEEE 754 floating-point, which causes inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`). In EcoTrack, the carbon calculation engine converts numbers to fixed-point integers before multiplication and stores results as exact `DECIMAL(18,6)` columns in MySQL."*

#### Q6: What happens if an activity is edited? Does it change historical emission factor data?
> *"EcoTrack decouples `activity_types` from `emission_factors`. When a user updates an activity's quantity only, the application preserves the original `emission_factor_id` to guarantee historical calculation consistency. A new factor is only looked up if the activity date or category is changed."*

---

## License & Authorship

Developed for Academic Coursework Submission in Database Management Systems & Full-Stack Software Engineering.  
Built with precision using React 19, Node.js, Express, and MySQL 8+.
