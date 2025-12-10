-- Fix database encoding for Turkish characters
-- Run this script to ensure UTF-8 encoding is properly set

-- Check current database encoding
SELECT datname, pg_encoding_to_char(encoding) as encoding 
FROM pg_database 
WHERE datname = 'grocery_matcher';

-- Set client encoding to UTF8 (if not already set)
SET client_encoding TO 'UTF8';

-- Verify client encoding
SHOW client_encoding;

-- Check table encoding (PostgreSQL uses database encoding for all tables)
SELECT 
    schemaname,
    tablename,
    pg_encoding_to_char(encoding) as encoding
FROM pg_tables t
JOIN pg_database d ON d.datname = current_database()
WHERE tablename = 'market_products';

-- Note: If the database was created with wrong encoding, you may need to:
-- 1. Export data
-- 2. Drop and recreate database with UTF-8
-- 3. Re-import data
-- 
-- To recreate database with proper encoding:
-- DROP DATABASE grocery_matcher;
-- CREATE DATABASE grocery_matcher WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';

