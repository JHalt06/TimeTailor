CREATE TABLE movements(
    ID SERIAL PRIMARY KEY,
    brand TEXT,
    model TEXT,
    type_ ENUM('Automatic', 'Manual Mechanical', 'Quartz', 'Mecaquartz'), --Movement type (e.g., “Quartz”, “Automatic”)
    price REAL, --check
    image_url TEXT,
    power_reserve TEXT, --e.g., “40 hours”
    accuracy TEXT, --optional
    description TEXT,     
);

CREATE TABLE cases(
    ID SERIAL PRIMARY KEY,
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

CREATE TABLE dials(
    ID SERIAL PRIMARY KEY,
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    diameter_mm REAL, --e.g., 40.0
    description TEXT,
);

CREATE TABLE straps(
    ID SERIAL PRIMARY KEY,
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

CREATE TABLE hands( --may have to change to different kinds of hands ENUM
    ID SERIAL PRIMARY KEY,
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    type_ ENUM('Sword', 'Baton', 'Cathedral') --add more later
    description TEXT,
);

CREATE TABLE crowns(
    ID SERIAL PRIMARY KEY,
    brand TEXT,
    model TEXT,
    price REAL, 
    image_url TEXT,
    color TEXT,
    material TEXT,
    description TEXT,
);