-- Fix "Sok" market name to "Şok" (with Turkish character)
-- Strategy: If "Şok" exists, move all MarketProducts from "Sok" to "Şok" and delete "Sok"
-- If "Şok" doesn't exist, rename "Sok" to "Şok"

DO $$
DECLARE
  sok_market_id INTEGER;
  sok_turkish_market_id INTEGER;
BEGIN
  -- Get IDs
  SELECT id INTO sok_market_id FROM markets WHERE name = 'Sok';
  SELECT id INTO sok_turkish_market_id FROM markets WHERE name = 'Şok';
  
  -- If both exist, move MarketProducts from "Sok" to "Şok" and delete "Sok"
  IF sok_market_id IS NOT NULL AND sok_turkish_market_id IS NOT NULL THEN
    UPDATE market_products
    SET market_id = sok_turkish_market_id
    WHERE market_id = sok_market_id;
    
    DELETE FROM markets WHERE id = sok_market_id;
    RAISE NOTICE 'Moved MarketProducts from "Sok" (id: %) to "Şok" (id: %) and deleted "Sok"', sok_market_id, sok_turkish_market_id;
  -- If only "Sok" exists, rename it to "Şok"
  ELSIF sok_market_id IS NOT NULL AND sok_turkish_market_id IS NULL THEN
    UPDATE markets SET name = 'Şok' WHERE id = sok_market_id;
    RAISE NOTICE 'Renamed "Sok" (id: %) to "Şok"', sok_market_id;
  -- If only "Şok" exists, do nothing (already correct)
  ELSIF sok_market_id IS NULL AND sok_turkish_market_id IS NOT NULL THEN
    RAISE NOTICE '"Şok" already exists, no action needed';
  -- If neither exists, do nothing
  ELSE
    RAISE NOTICE 'Neither "Sok" nor "Şok" exists, no action needed';
  END IF;
END $$;

