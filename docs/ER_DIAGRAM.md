# EcoTrack — Entity-Relationship (ER) Diagram & Cardinality Guide

This document describes the relational entity model implemented in `server/db/migrations/001_create_core_tables.sql` and `003_emission_factor_metadata.sql`.

---

## 1. Mermaid ER Diagram

```mermaid
erDiagram
    USERS ||--o{ ACTIVITY_LOGS : "records (1:N)"
    USERS ||--o{ MONTHLY_GOALS : "sets (1:N)"
    ACTIVITY_TYPES ||--o{ EMISSION_FACTORS : "versioned by (1:N)"
    EMISSION_FACTORS ||--o{ ACTIVITY_LOGS : "used to calculate (1:N)"

    USERS {
        BIGINT id PK "Auto-increment identity"
        VARCHAR(150) full_name "NOT NULL, len >= 2"
        VARCHAR(255) email UK "NOT NULL, UNIQUE, normalized lowercase"
        TEXT password_hash "NOT NULL, bcrypt hash"
        TIMESTAMPTZ created_at "NOT NULL, DEFAULT NOW()"
    }

    ACTIVITY_TYPES {
        BIGINT id PK "Auto-increment identity"
        VARCHAR(50) category "Transportation | Energy | Lifestyle"
        VARCHAR(150) name "NOT NULL, UNIQUE(category, name)"
        VARCHAR(30) unit "km | kWh | kg | meals"
        BOOLEAN is_active "NOT NULL, DEFAULT TRUE"
    }

    EMISSION_FACTORS {
        BIGINT id PK "Auto-increment identity"
        BIGINT activity_type_id FK "NOT NULL -> activity_types.id"
        NUMERIC(16_8) factor_kg_co2e_per_unit "NOT NULL, >= 0"
        VARCHAR(30) unit "Optional override / metadata unit"
        TEXT source "NOT NULL, documented citation"
        TEXT source_url "Reference URL"
        INTEGER reference_year "Publication year"
        DATE effective_date "NOT NULL, effective start date"
        TEXT geographic_scope "Region / grid boundary"
        TEXT notes "Methodological assumptions"
        TIMESTAMPTZ created_at "NOT NULL, DEFAULT NOW()"
    }

    ACTIVITY_LOGS {
        BIGINT id PK "Auto-increment identity"
        BIGINT user_id FK "NOT NULL -> users.id (CASCADE)"
        BIGINT emission_factor_id FK "NOT NULL -> emission_factors.id (RESTRICT)"
        NUMERIC(14_3) quantity "NOT NULL, > 0"
        NUMERIC(18_6) calculated_co2e "NOT NULL, >= 0"
        DATE activity_date "NOT NULL"
        TIMESTAMPTZ created_at "NOT NULL, DEFAULT NOW()"
    }

    MONTHLY_GOALS {
        BIGINT id PK "Auto-increment identity"
        BIGINT user_id FK "NOT NULL -> users.id (CASCADE)"
        DATE goal_month "NOT NULL, Day = 1, UNIQUE(user_id, goal_month)"
        NUMERIC(14_3) target_co2e "NOT NULL, > 0"
        TIMESTAMPTZ created_at "NOT NULL, DEFAULT NOW()"
    }
```

---

## 2. ASCII Entity-Relationship Overview

```text
+-------------------+          1:N          +------------------------+
|       users       |---------------------->|     monthly_goals      |
|-------------------|  (ON DELETE CASCADE)  |------------------------|
| PK id             |                       | PK id                  |
|    full_name      |                       | FK user_id -> users.id |
| UK email          |                       |    goal_month (day=1)  |
|    password_hash  |                       |    target_co2e (> 0)   |
+-------------------+                       +------------------------+
          |
          | 1:N (ON DELETE CASCADE)
          v
+------------------------+       N:1       +---------------------------+       N:1       +-------------------+
|     activity_logs      |---------------->|     emission_factors      |---------------->|  activity_types   |
|------------------------|  (RESTRICT)     |---------------------------|  (RESTRICT)     |-------------------|
| PK id                  |                 | PK id                     |                 | PK id             |
| FK user_id             |                 | FK activity_type_id       |                 |    category       |
| FK emission_factor_id  |                 |    factor_kg_co2e_per_unit|                 |    name           |
|    quantity (> 0)      |                 |    source                 |                 |    unit           |
|    calculated_co2e     |                 |    effective_date         |                 |    is_active      |
|    activity_date       |                 +---------------------------+                 +-------------------+
+------------------------+
```

---

## 3. Relationship & Referential Integrity Rules

1. **`users` to `activity_logs` (One-to-Many)**:
   - One user can log zero, one, or many carbon activities (`user_id REFERENCES users(id) ON DELETE CASCADE`).
   - Deleting a user automatically removes their personal activity records while leaving shared `emission_factors` and `activity_types` untouched.
2. **`users` to `monthly_goals` (One-to-Many)**:
   - One user can configure at most one target per calendar month (`UNIQUE (user_id, goal_month)`), across many months (`ON DELETE CASCADE`).
3. **`activity_types` to `emission_factors` (One-to-Many)**:
   - Each activity type (e.g., `Car Travel`, `Electricity Consumption`) can have multiple historical factor versions over time differentiated by `effective_date` and `source` (`ON DELETE RESTRICT`).
4. **`emission_factors` to `activity_logs` (One-to-Many)**:
   - Every logged activity references the exact `emission_factor_id` used to calculate its `calculated_co2e` (`ON DELETE RESTRICT`).
   - Deleting an activity log **never** deletes its emission factor, and `ON DELETE RESTRICT` prevents deleting a factor that is already cited by historical user activity logs.

---

## 4. Infrastructure Tables (Non-Academic)

In addition to the five core domain tables above, two operational infrastructure tables exist:
- `schema_migrations`: Tracks applied `.sql` migration files (`version` PK, `applied_at`).
- `session`: Stores encrypted/serialized Express session JSON for `connect-pg-simple` (`sid` PK, `sess`, `expire`).
