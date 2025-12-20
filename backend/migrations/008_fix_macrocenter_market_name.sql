-- Fix "Macrocenter" market name to "Macro Center" (with space)
-- Strategy: If "Macro Center" exists, move all MarketProducts from "Macrocenter" to "Macro Center" and delete "Macrocenter"
-- If "Macro Center" doesn't exist, rename "Macrocenter" to "Macro Center"

DO $$
DECLARE
  macrocenter_market_id INTEGER;
  macro_center_market_id INTEGER;
BEGIN
  -- Get IDs
  SELECT id INTO macrocenter_market_id FROM markets WHERE name = 'Macrocenter';
  SELECT id INTO macro_center_market_id FROM markets WHERE name = 'Macro Center';
  
  -- If both exist, move MarketProducts from "Macrocenter" to "Macro Center" and delete "Macrocenter"
  IF macrocenter_market_id IS NOT NULL AND macro_center_market_id IS NOT NULL THEN
    UPDATE market_products
    SET market_id = macro_center_market_id
    WHERE market_id = macrocenter_market_id;
    
    DELETE FROM markets WHERE id = macrocenter_market_id;
    RAISE NOTICE 'Moved MarketProducts from "Macrocenter" (id: %) to "Macro Center" (id: %) and deleted "Macrocenter"', macrocenter_market_id, macro_center_market_id;
  -- If only "Macrocenter" exists, rename it to "Macro Center"
  ELSIF macrocenter_market_id IS NOT NULL AND macro_center_market_id IS NULL THEN
    UPDATE markets SET name = 'Macro Center' WHERE id = macrocenter_market_id;
    RAISE NOTICE 'Renamed "Macrocenter" (id: %) to "Macro Center"', macrocenter_market_id;
  -- If only "Macro Center" exists, do nothing (already correct)
  ELSIF macrocenter_market_id IS NULL AND macro_center_market_id IS NOT NULL THEN
    RAISE NOTICE '"Macro Center" already exists, no action needed';
  -- If neither exists, do nothing
  ELSE
    RAISE NOTICE 'Neither "Macrocenter" nor "Macro Center" exists, no action needed';
  END IF;
END $$;

