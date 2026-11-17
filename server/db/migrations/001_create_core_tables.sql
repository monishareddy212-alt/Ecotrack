-- EcoTrack MySQL Schema (3NF)
-- Five core tables: users, activity_types, emission_factors, activity_logs, monthly_goals

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_activity_types_category_name UNIQUE (category, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  CONSTRAINT fk_emission_factors_activity_type FOREIGN KEY (activity_type_id) REFERENCES activity_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  emission_factor_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  calculated_co2e DECIMAL(18,6) NOT NULL,
  activity_date DATE NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_logs_factor FOREIGN KEY (emission_factor_id) REFERENCES emission_factors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monthly_goals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  goal_month DATE NOT NULL,
  target_co2e DECIMAL(14,3) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_monthly_goals_user_month UNIQUE (user_id, goal_month),
  CONSTRAINT fk_monthly_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relational query and constraint indexes
CREATE INDEX idx_activity_types_category_active
  ON activity_types (category, is_active);

CREATE INDEX idx_emission_factors_type_effective
  ON emission_factors (activity_type_id, effective_date DESC);

CREATE INDEX idx_activity_logs_user_date
  ON activity_logs (user_id, activity_date DESC);

CREATE INDEX idx_activity_logs_factor_id
  ON activity_logs (emission_factor_id);

CREATE INDEX idx_activity_logs_user_co2e
  ON activity_logs (user_id, calculated_co2e DESC);

CREATE INDEX idx_activity_logs_user_recent
  ON activity_logs (user_id, activity_date DESC, created_at DESC, id DESC);

CREATE INDEX idx_monthly_goals_user_month
  ON monthly_goals (user_id, goal_month DESC);
