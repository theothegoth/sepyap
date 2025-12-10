-- Database optimization: Add indexes for frequently queried columns
-- This significantly improves query performance, especially for deduplication logic

-- Index on market_id (used in almost every query)
CREATE INDEX IF NOT EXISTS idx_market_products_market_id ON market_products(market_id);

-- Index on title (used for deduplication matching)
-- Using LOWER and TRIM for case-insensitive matching
CREATE INDEX IF NOT EXISTS idx_market_products_title_lower ON market_products(LOWER(TRIM(title)));

-- Index on URL (used for URL-based deduplication)
-- Partial index for non-null URLs
CREATE INDEX IF NOT EXISTS idx_market_products_url ON market_products(url) WHERE url IS NOT NULL;

-- Composite index for title + price + market_id (common deduplication query)
CREATE INDEX IF NOT EXISTS idx_market_products_title_price_market ON market_products(market_id, LOWER(TRIM(title)), price);

-- Index on last_seen (used for recent products queries)
CREATE INDEX IF NOT EXISTS idx_market_products_last_seen ON market_products(last_seen DESC);

-- Index on last_updated (used for change tracking)
CREATE INDEX IF NOT EXISTS idx_market_products_last_updated ON market_products(last_updated DESC);

-- Index on market name for market lookups
CREATE INDEX IF NOT EXISTS idx_markets_name_lower ON markets(LOWER(name));

-- Composite index for URL pattern matching (LIKE queries)
-- Note: PostgreSQL can use trigram indexes for better LIKE performance
-- Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_market_products_url_trgm ON market_products USING gin(url gin_trgm_ops);

