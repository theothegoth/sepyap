-- Clean up products with corrupted Turkish characters
-- These were saved before the database encoding fix

-- Find products with corrupted Turkish characters (ASCII versions)
-- Common patterns: ü->u, ş->s, ı->i, ğ->g, ç->c

-- Option 1: Delete all corrupted products (recommended if you can re-scan)
-- DELETE FROM market_products 
-- WHERE title ~ '[a-z]' 
--   AND (
--     title LIKE '%ust%' OR  -- erust instead of erüst
--     title LIKE '%ayiklanmis%' OR  -- ayiklanmis instead of ayıklanmış
--     title LIKE '%tabagi%' OR  -- tabagi instead of tabağı
--     title LIKE '%cikolatali%' OR  -- cikolatali instead of çikolatalı
--     title LIKE '%cikolata%' OR  -- cikolata instead of çikolata
--     title LIKE '%muz%' AND title NOT LIKE '%Muz%'  -- lowercase muz
--   );

-- Option 2: Just delete products with obvious corruption patterns
DELETE FROM market_products 
WHERE title LIKE '%Erust%' OR 
      title LIKE '%Ayiklanmis%' OR
      title LIKE '%Tabagi%' OR
      title LIKE '%Cikolatali%' OR
      title LIKE '%Cikolata%';

-- Check remaining products
SELECT COUNT(*) as remaining_products FROM market_products;

-- Verify no corrupted titles remain
SELECT title FROM market_products 
WHERE title ~ '[a-z]' 
  AND (title LIKE '%ust%' OR title LIKE '%ayiklanmis%' OR title LIKE '%tabagi%')
LIMIT 10;

