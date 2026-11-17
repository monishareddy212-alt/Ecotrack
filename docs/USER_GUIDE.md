# EcoTrack — User Guide

Welcome to **EcoTrack**, your personal Carbon Emission & Sustainability Tracker backed by PostgreSQL.

---

## 1. Creating an Account & Signing In
1. Open the EcoTrack web URL in your browser (unauthenticated visitors start on `/login`).
2. Click **Create account** (`/register`), enter your **Full name**, **Email address**, and a **Password** (minimum 8 characters), then click **Create Account**.
3. Sign in on `/login` with your registered credentials. Your session is stored securely in PostgreSQL via an HTTP-only cookie and persists across browser reloads.

---

## 2. Viewing Your Sustainability Dashboard (`/`)
- **Monthly Carbon Footprint**: Total `kg CO2e` calculated from your logged activities in the current month (`Asia/Kolkata` reporting calendar).
- **Daily Average Emissions**: Total monthly emissions divided by elapsed calendar days this month.
- **Monthly Target Card**: Shows your active monthly carbon budget (`monthly_goals`), percentage used, and status badge (`Within Target`, `Approaching Target`, `At Target`, or `Target Exceeded`).
- **vs. Previous Month**: Compares current month emissions against the previous calendar month (plus same-number-of-days pace).
- **Charts & Lists**: Toggle between **Last 6M** and **Last 12M** on the Monthly Emission Trend chart, inspect the Category Emission Breakdown donut chart, review your 5 most recent entries, check your Highest Emission Category, and read up to 3 **Sustainability Tips** tailored deterministically to your logged activities.

---

## 3. Recording a New Activity (`/add-activity`)
1. Choose a **Category** (`Transportation`, `Energy`, or `Lifestyle`).
2. Select an **Activity Type** (for example, `Car Travel`, `Bus Travel`, `Electricity Consumption`, `LPG Cooking Gas`).
3. The **Measurement Unit** (`km`, `kWh`, `kg`, or `meals`) locks automatically based on the catalog definition.
4. Enter a positive **Quantity** and choose the **Activity Date**, then click **Save Activity**.
5. EcoTrack calculates `Quantity × Emission Factor` on the server, saves the record to PostgreSQL, and displays the exact calculation along with the cited conversion factor source.
   - *Note*: `Plant-Based Meal` and `Meat-Based Meal` display an informational notice when no regional dietary factor is seeded in `emission_factors`.

---

## 4. Searching, Filtering, Editing, Deleting & Exporting History (`/history`)
- **Filters**: Narrow records by keyword search, category, activity type, date range (`Start Date` / `End Date`), emission range (`Min CO2e` / `Max CO2e`), and sort order. Summary KPI cards update automatically to match active filters.
- **Row Actions**:
  - **View**: Opens a detail modal showing the exact emission factor, citation source, geographic scope, and reference year.
  - **Edit**: Updates quantity, activity type, or date and recalculates emissions on the backend. (Editing quantity alone preserves the historical emission factor ID.)
  - **Delete**: Prompts for confirmation and permanently removes your entry.
- **Export CSV**: Click **Export CSV** to download a UTF-8 CSV spreadsheet containing all records matching your current filters (up to 5,000 rows per export).

---

## 5. Deep-Dive Carbon Analytics (`/analytics`)
- Use the **Period Filter** bar to switch **Month**, **Year**, and **6M / 12M** trajectory windows.
- Inspect the **Daily Emission Trend** bar chart (every calendar day of the selected month, including leap-year February 29), **Category Summary Table**, and the **Monthly Carbon Report** card with one-click **Download CSV Report**.

---

## 6. Sustainability Goals & Profile Settings (`/goals`)
- **Reporting Period Selector**: Switch Month/Year to inspect target usage (`>100%` displays the exact percentage while the bar fills to 100%).
- **Set / Edit / Delete Goals**: Create one monthly budget (`kg CO2e`) per calendar month, edit existing goals inline from **Goal History**, or remove targets safely via confirmation modal.
- **Personal Information & Profile Settings**: Update your **Full name** in PostgreSQL `users` (`Email address` is read-only) and view your **Member since** date.
