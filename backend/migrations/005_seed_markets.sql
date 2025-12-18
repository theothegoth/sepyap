-- Seed markets table with Turkish grocery markets
INSERT INTO markets (name, base_url, delivery_regions, min_order_amount, delivery_fee, free_delivery_threshold)
VALUES
  ('Migros', 'https://www.migros.com.tr', NULL, 0, NULL, NULL),
  ('A101', 'https://www.a101.com.tr', NULL, 0, NULL, NULL),
  ('CarrefourSA', 'https://www.carrefoursa.com', NULL, 0, NULL, NULL),
  ('Getir', 'https://www.getir.com', NULL, 0, NULL, NULL),
  ('Şok', 'https://www.sokmarket.com.tr', NULL, 0, NULL, NULL),
  ('Happy Center', 'https://www.happycenter.com.tr', NULL, 0, NULL, NULL),
  ('Macro Center', 'https://www.macrocenter.com.tr', NULL, 0, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

