-- Add delivery fee fields to markets table

-- Add delivery_fee column (standard delivery fee)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) NULL;

-- Add free_delivery_threshold column (order amount for free delivery)
ALTER TABLE markets ADD COLUMN IF NOT EXISTS free_delivery_threshold DECIMAL(10,2) NULL;

-- Update existing markets with default values (can be customized later)
-- Default: 20 TL delivery fee, free above 200 TL
UPDATE markets SET 
  delivery_fee = 20.00,
  free_delivery_threshold = 200.00
WHERE delivery_fee IS NULL;

-- Note: Market-specific values should be updated based on actual delivery policies:
-- Example updates (uncomment and adjust based on actual market policies):
-- UPDATE markets SET delivery_fee = 15.00, free_delivery_threshold = 150.00 WHERE name = 'Getir';
-- UPDATE markets SET delivery_fee = 25.00, free_delivery_threshold = 250.00 WHERE name = 'Migros';
-- UPDATE markets SET delivery_fee = 20.00, free_delivery_threshold = 200.00 WHERE name = 'CarrefourSA';
-- UPDATE markets SET delivery_fee = 10.00, free_delivery_threshold = 100.00 WHERE name = 'A101';
-- UPDATE markets SET delivery_fee = 15.00, free_delivery_threshold = 150.00 WHERE name = 'Sok';
-- UPDATE markets SET delivery_fee = 20.00, free_delivery_threshold = 200.00 WHERE name = 'HappyCenter';
-- UPDATE markets SET delivery_fee = 20.00, free_delivery_threshold = 200.00 WHERE name = 'Macrocenter';

