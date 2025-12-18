-- Fix duplicate Happy Center market entries
-- Merge "HappyCenter" (without space) into "Happy Center" (with space)

-- Step 1: Update all MarketProduct records to use "Happy Center" instead of "HappyCenter"
UPDATE market_products mp
SET market_id = (
  SELECT id FROM markets WHERE name = 'Happy Center'
)
WHERE market_id = (
  SELECT id FROM markets WHERE name = 'HappyCenter'
);

-- Step 2: Delete the duplicate "HappyCenter" market entry
DELETE FROM markets WHERE name = 'HappyCenter';

-- Step 3: Ensure "Happy Center" exists (should already exist from seed)
INSERT INTO markets (name, base_url, delivery_regions, min_order_amount, delivery_fee, free_delivery_threshold)
VALUES
  ('Happy Center', 'https://www.happycenter.com.tr', NULL, 0, NULL, NULL)
ON CONFLICT (name) DO NOTHING;

