-- tables.sql
-- HARD RESET: drop & recreate the public schema (wipes ALL tables, views, fkeys, etc.)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SET search_path TO public;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    google_id     TEXT UNIQUE NOT NULL,
    email         TEXT,
    display_name  TEXT NOT NULL,
    avatar_url    TEXT,
    bio           TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);

-- =========================
-- LOOKUP: MOVEMENT TYPES
-- =========================
CREATE TABLE movement_types (
    id        SERIAL PRIMARY KEY,
    type_name TEXT UNIQUE NOT NULL
);

-- =========================
-- MOVEMENTS
-- =========================
CREATE TABLE movements (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id),
    brand            TEXT,
    model            TEXT,
    movement_type_id INT REFERENCES movement_types(id),
    price            NUMERIC(10,2),
    image_url        TEXT,
    power_reserve    TEXT,   -- e.g., '40 hours'
    accuracy         TEXT,   -- optional
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- CASES
-- =========================
CREATE TABLE cases (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    brand       TEXT,
    model       TEXT,
    price       NUMERIC(10,2),
    image_url   TEXT,
    material    TEXT,               -- e.g., '316L Stainless Steel'
    dimension1  NUMERIC(10,2),      -- width (mm)
    dimension2  NUMERIC(10,2),      -- lug-to-lug (mm)
    dimension3  NUMERIC(10,2),      -- thickness (mm)
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- DIALS
-- =========================
CREATE TABLE dials (
    id           SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id),
    brand        TEXT,
    model        TEXT,
    price        NUMERIC(10,2),
    image_url    TEXT,
    color        TEXT,
    material     TEXT,
    diameter_mm  NUMERIC(10,2),
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- STRAPS
-- =========================
CREATE TABLE straps (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    brand       TEXT,
    model       TEXT,
    price       NUMERIC(10,2),
    image_url   TEXT,
    color       TEXT,
    material    TEXT,
    width_mm    NUMERIC(10,2),
    length_mm   NUMERIC(10,2),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- HANDS
-- =========================
CREATE TABLE hands (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    brand       TEXT,
    model       TEXT,
    price       NUMERIC(10,2),
    image_url   TEXT,
    color       TEXT,
    material    TEXT,
    type_       TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- CROWNS
-- =========================
CREATE TABLE crowns (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    brand       TEXT,
    model       TEXT,
    price       NUMERIC(10,2),
    image_url   TEXT,
    color       TEXT,
    material    TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- BUILDS
-- =========================
CREATE TABLE builds (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movements_id  INT REFERENCES movements(id) ON DELETE SET NULL,
    cases_id      INT REFERENCES cases(id)     ON DELETE SET NULL,
    dials_id      INT REFERENCES dials(id)     ON DELETE SET NULL,
    straps_id     INT REFERENCES straps(id)    ON DELETE SET NULL,
    hands_id      INT REFERENCES hands(id)     ON DELETE SET NULL,
    crowns_id     INT REFERENCES crowns(id)    ON DELETE SET NULL,
    total_price   NUMERIC(100,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_builds_user ON builds(user_id);

-- =========================
-- SEEDS
-- =========================
INSERT INTO movement_types (type_name) VALUES
  ('Automatic'),
  ('Manual Mechanical'),
  ('Quartz'),
  ('Mecaquartz'),
  ('Micro-rotor')
ON CONFLICT (type_name) DO NOTHING;
