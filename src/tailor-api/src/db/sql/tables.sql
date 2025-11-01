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
    dimension1 REAL,
    dimension2 REAL,
    dimension3 REAL,
    description TEXT,     
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
);

CREATE TABLE IF NOT EXISTS builds( --IF NOT EXISTS
    ID SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(ID),
    movements_id INT REFERENCES movements(ID),
    cases_id INT REFERENCES cases(ID),
    dials_id INT REFERENCES dials(ID),
    straps_id INT REFERENCES straps(ID),
    hands_id INT REFERENCES hands(ID),
    crowns_id INT REFERENCES crowns(ID),
    total_price DECIMAL(100,2),
    time_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN --either published or priate (T or F) Could add share via link privacy later.
);

CREATE TABLE IF NOT EXISTS users( --check data type with Michael later on
    google_id TEXT,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP
    updated_at TIMESTAMP
);