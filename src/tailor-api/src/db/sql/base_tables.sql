DROP TABLE IF EXISTS builds CASCADE;
DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS dials CASCADE;
DROP TABLE IF EXISTS straps CASCADE;
DROP TABLE IF EXISTS hands CASCADE;
DROP TABLE IF EXISTS crowns CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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


CREATE TABLE IF NOT EXISTS movements(
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    movement_type_id INT REFERENCES movement_types(ID)
    price REAL, --check
    image_url TEXT,
    power_reserve TEXT, --ex:., “40 hours”
    accuracy TEXT, --optional
    description TEXT,     
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS movement_types(
    ID SERIAL PRIMARY KEY,
    type_name TEXT UNIQUE NOT NULL, --ex: "Automatic", "Manual Mechanical", "Quartz"                     
);

INSERT INTO movement_types (type_name) VALUES
('Automatic'),
('Manual Mechanical'),
('Quartz'),
('Mecaquartz'),
('Micro-rotor');

CREATE TABLE IF NOT EXISTS cases(
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    price REAL, --check
    image_url TEXT,
    material TEXT, --e.g., "316L Stainless Steel"
    dimension1   NUMERIC(10,2),  -- width
    dimension2   NUMERIC(10,2),  -- lug-to-lug
    dimension3   NUMERIC(10,2),  -- thickness
    description TEXT,    
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS dials(
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    diameter_mm REAL, --e.g., 40.0
    description TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS straps(
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    width_mm REAL, -- ex: 20.0
    length_mm REAL, --optional size dimension
    description TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS hands( --may have to change to different kinds of hands ENUM
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    type_ TEXT, --add more later
    description TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS crowns(
    ID SERIAL PRIMARY KEY,
    user_id REFERENCES users(ID),
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    description TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

CREATE TABLE IF NOT EXISTS builds( --IF NOT EXISTS
    ID SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movements_id INT REFERENCES movements(ID) ON DELETE SET NULL,
    cases_id INT REFERENCES cases(ID) ON DELETE SET NULL,
    dials_id INT REFERENCES dials(ID) ON DELETE SET NULL,
    straps_id INT REFERENCES straps(ID) ON DELETE SET NULL,
    hands_id INT REFERENCES hands(ID) ON DELETE SET NULL,
    crowns_id INT REFERENCES crowns(ID) ON DELETE SET NULL,
    total_price DECIMAL(100,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published BOOLEAN NOT NULL DEFAULT FALSE --either published or priate (T or F) Could add share via link privacy later.
);

CREATE INDEX idx_builds_user ON builds(user_id);


