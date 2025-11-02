INSERT INTO dials (brand, model, price, description) VALUES
('Seiko','Sunburst Blue',29.99,'40mm dial'),
('Namoki','Matte Black',24.00,'40mm dial')
ON CONFLICT DO NOTHING;

INSERT INTO straps (brand, model, price, description) VALUES
('Barton','Silicone 20mm',19.00,'20mm quick-release')
ON CONFLICT DO NOTHING;
