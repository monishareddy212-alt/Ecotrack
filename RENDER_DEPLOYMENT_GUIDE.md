# Complete Render Production Deployment Guide for EcoTrack

This step-by-step guide explains how to deploy **EcoTrack** to **Render** as a **single unified service** (React 19 Frontend + Express Backend on one port) connected to a **free cloud MySQL database**.

---

## Architecture Overview

```mermaid
flowchart LR
    subgraph Cloud_Hosting ["Render Cloud Platform"]
        WebService["Render Web Service (Node.js)\n- Express API (:10000)\n- React 19 Frontend (dist/)\n- Auto-Migrations & Seeds on Boot"]
    end
    
    subgraph Cloud_Database ["Free Cloud MySQL"]
        MySQLDb[("MySQL 8+ Database\n(Aiven / Railway / PlanetScale)\n- Users & Sessions\n- Activity Logs & Goals\n- Verified Emission Factors")]
    end
    
    Browser["User Browser / Mobile"] -->|"HTTPS / Secure Cookies"| WebService
    WebService -->|"Encrypted SQL (SSL)"| MySQLDb
```

- **Single Service**: Express serves both the REST API (`/api/*`) and the compiled React 19 SPA from one port.
- **Zero-Configuration Migrations**: When deployed, the server automatically applies all SQL migrations and seeds the catalog on boot when `DATABASE_URL` is configured.
- **Cost**: **$0 / Free** (Render Free Web Service + Free Cloud MySQL).

---

## Prerequisites Checklist

Before you begin, ensure you have:
1. A **[GitHub](https://github.com/)** account.
2. A **[Render](https://render.com/)** account (sign in with your GitHub account).
3. A free **Cloud MySQL Database** (we provide a 2-minute setup guide below).

---

## Step 1: Provision a Free Cloud MySQL Database (2 Minutes)

EcoTrack works with any standard MySQL 8+ database. Choose **Option A (Aiven)** or **Option B (Railway)**.

### Option A: Aiven MySQL (Recommended — 100% Free Tier)

1. Sign up for free at **[aiven.io](https://aiven.io)**.
2. Click **Create Service**.
3. Select **MySQL** as the service type.
4. Select the **Free Plan** ($0/month).
5. Choose a cloud region (e.g., `AWS - Frankfurt` or `AWS - US East` — select one close to your Render region).
6. Click **Create Service**.
7. Once the service status turns **Running**:
   - Scroll down to the **Connection Information** tab.
   - Copy the **Service URI**. It looks like this:
     ```text
     mysql://avnadmin:your_password@mysql-example.aivencloud.com:12345/defaultdb?ssl={"rejectUnauthorized":true}
     ```
   - *Keep this URL handy for Step 3.*

---

### Option B: Railway MySQL (Alternative)

1. Sign up at **[railway.app](https://railway.app)**.
2. Click **New Project** &rarr; **Provision MySQL**.
3. Click on the MySQL tile &rarr; go to the **Connect** tab.
4. Copy the **MySQL URL** (`mysql://root:password@host:port/railway`).

---

## Step 2: Push Your Project to GitHub

If your project is not yet in a GitHub repository:

1. Open your terminal in the `ecotrack` root folder:
   ```bash
   git init
   git add .
   git commit -m "EcoTrack single-server MySQL production ready"
   git branch -M main
   ```

2. Create a new repository on [GitHub](https://github.com/new) named `ecotrack` (set it to **Public** or **Private**).

3. Link your local project to GitHub and push:
   ```bash
   git remote add origin https://github.com/<your-username>/ecotrack.git
   git push -u origin main
   ```

> [!NOTE]
> The included `.gitignore` already protects your local `.env`, `node_modules/`, and private credentials from ever being committed to GitHub.

---

## Step 3: Deploy on Render

You can deploy using either the **Manual Setup** (easiest) or the **Blueprint Setup**.

### Method 1: Manual Web Service Setup (Recommended)

1. Log in to the **[Render Dashboard](https://dashboard.render.com)**.
2. Click the **New +** button in the top navigation bar and select **Web Service**.
3. Select **Build and deploy from a Git repository** &rarr; click **Next**.
4. Choose your **`ecotrack`** repository from the list (grant Render GitHub permissions if needed).
5. Fill in the service configuration details:

| Field | Value to Enter | Explanation |
| :--- | :--- | :--- |
| **Name** | `ecotrack` | Name of your service (becomes `your-app.onrender.com`). |
| **Region** | Choose the region closest to your MySQL database | Minimizes database query latency. |
| **Branch** | `main` | Git branch to deploy. |
| **Runtime** | `Node` | Node.js execution environment. |
| **Build Command** | `npm install --include=dev && npm run build` | Installs dependencies including build tools and compiles frontend + server. |
| **Start Command** | `npm start` | Executes the production single server (`node server.js`). |
| **Instance Type** | `Free` | Render's $0/month free tier. |

6. Scroll down and expand **Advanced Settings**:
   - **Health Check Path**: Enter `/api/health`
   *(Render will ping this endpoint to verify your app is healthy before directing traffic to it).*

7. Under **Environment Variables**, click **Add Environment Variable** and enter the following 3 variables:

| Variable Key | Variable Value | Notes |
| :--- | :--- | :--- |
| **`NODE_ENV`** | `production` | Enables production caching, secure cookies, and SPA serving. |
| **`DATABASE_URL`** | *Paste your MySQL Service URI from Step 1* | Example: `mysql://user:pass@host:port/dbname` |
| **`SESSION_SECRET`** | *A random 64-character secret* | Generate one locally with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

8. Click **Deploy Web Service** at the bottom of the page.

---

### Method 2: Render Blueprint Setup (Using `render.yaml`)

Because this repository includes a pre-configured [`render.yaml`](./render.yaml):

1. In the Render Dashboard, click **New +** &rarr; **Blueprint**.
2. Connect your `ecotrack` repository.
3. Render automatically reads `render.yaml` and sets up the build, start commands, and health check.
4. When prompted, paste your **`DATABASE_URL`** from Step 1.
   *(The `SESSION_SECRET` will be generated automatically by Render!)*
5. Click **Apply**.

---

## Step 4: Monitor the Build & Startup Logs

Watch the live deployment log in your Render dashboard. You will see:

1. **Build Phase**:
   ```text
   ==> Running build command 'npm install --include=dev && npm run build'...
   vite v8.3.8 building client environment for production...
   ✓ 2086 modules transformed.
   dist/index.html                   1.44 kB
   dist/assets/index-*.css          29.05 kB
   dist/assets/index-*.js          798.44 kB
   server.js                       115.6 kB
   ==> Build successful!
   ```

2. **Server Boot Phase**:
   ```text
   ==> Starting service with 'npm start'...
   EcoTrack: Checking database schema and executing pending migrations...
   EcoTrack: Successfully applied 4 migration(s): 001_create_core_tables.sql, 002_create_session_table.sql...
   EcoTrack: Database verified with seed data (8 activity types, 6 emission factors).
   EcoTrack server listening on http://0.0.0.0:10000 (production)
   ```

3. **Health Check Phase**:
   ```text
   ==> Health check path /api/health returned 200 OK
   ==> Your service is live at: https://ecotrack-xxxx.onrender.com
   ```

> [!IMPORTANT]
> Because EcoTrack incorporates **automated startup migrations**, you **never** need to run interactive SSH commands or pay for Render Pre-Deploy hooks! The server creates all tables and seeds reference data automatically when it boots.

---

## Step 5: Live Acceptance Checklist (Verify Your Deployment)

Once your service status changes to **Live**, open your public URL (`https://your-service.onrender.com`) and verify:

- [ ] **1. Health Check**: Visit `https://your-service.onrender.com/api/health`. Confirm JSON response:
  ```json
  {
    "status": "ok",
    "service": "ecotrack-api",
    "phase": 6,
    "database": { "status": "connected" }
  }
  ```
- [ ] **2. Web Interface**: Open `https://your-service.onrender.com/`. The login page loads cleanly with modern styling.
- [ ] **3. User Registration**: Click **Create Account** and register a new user &rarr; automatically redirects to the Dashboard.
- [ ] **4. Session Persistence**: Press `F5` / Refresh the page &rarr; you remain logged in (session stored in MySQL).
- [ ] **5. Log an Activity**: Navigate to **Add Activity**, select `Car Travel`, enter `25` km, and submit &rarr; instant calculation shows `3.50 kg CO2e`.
- [ ] **6. Dashboard Analytics**: Open the **Dashboard** &rarr; KPIs, Monthly Trend chart, and Category Breakdown donut update with your logged activity.
- [ ] **7. Set a Monthly Goal**: Navigate to **Goals & Settings**, set a target of `100` kg for the current month &rarr; progress bar displays usage percentage.
- [ ] **8. View Smart Recommendations**: Open the **Recommendations** card &rarr; view tailored sustainability tips based on your highest emission category.
- [ ] **9. Download CSV Report**: Navigate to **Activity History**, click **Export CSV** &rarr; downloads a valid `.csv` file with your logged activities.
- [ ] **10. SPA Fallback**: Directly refresh `https://your-service.onrender.com/analytics` in your browser address bar &rarr; loads seamlessly via Express SPA routing without 404 errors.

---

## Troubleshooting & Frequently Asked Questions

### 1. Free Tier Cold Starts
- **Behavior**: On Render's Free tier, the web service automatically spins down (sleeps) after 15 minutes of inactivity.
- **Solution**: When accessing the app after it has been asleep, the first request may take 30–50 seconds to boot up. Subsequent requests will be instant.

### 2. MySQL SSL Certificate Issues
- **Symptom**: Logs show `SELF_SIGNED_CERT_IN_CHAIN` or `certificate verify failed`.
- **Solution**: In Render's **Environment Variables**, add:
  ```text
  DATABASE_SSL = no-verify
  ```
  *(Or append `?ssl={"rejectUnauthorized":false}` to your `DATABASE_URL`).*

### 3. Session Secret Error on Boot
- **Symptom**: `SESSION_SECRET must be configured with at least 32 characters in production`.
- **Solution**: Ensure your `SESSION_SECRET` environment variable in Render is at least 32 characters long.

### 4. Database Connection Refused
- **Symptom**: Health check returns `database: { "status": "error" }`.
- **Solution**:
  - Verify that your cloud MySQL service is **Running**.
  - In Aiven or Railway, check that **Public Networking / Access** is enabled so Render can connect over the internet.
  - Verify your database username and password in `DATABASE_URL`.

---

## Summary of Environment Variables for Render

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activates production optimizations and secure cookies. |
| `DATABASE_URL` | `mysql://<user>:<pass>@<host>:<port>/<db>` | Cloud MySQL connection string. |
| `SESSION_SECRET` | 32+ character random hex string | Signs session cookies securely. |
| `DATABASE_SSL` | *(Optional)* `no-verify` or `false` | Override SSL verification if using self-signed certs. |
| `PORT` | *(Leave empty)* | Render automatically injects `PORT=10000`. |
