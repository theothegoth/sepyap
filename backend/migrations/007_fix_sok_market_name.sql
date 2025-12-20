-- Fix "Sok" market name to "Şok" (with Turkish character)
-- Update all MarketProduct records to use "Şok" instead of "Sok"
UPDATE market_products mp
SET market_id = (
  SELECT id FROM markets WHERE name = 'Şok'
)
WHERE market_id = (
  SELECT id FROM markets WHERE name = 'Sok'
);

-- Delete the duplicate "Sok" market entry if it exists
DELETE FROM markets WHERE name = 'Sok';

