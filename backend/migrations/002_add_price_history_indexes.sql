-- Price History optimization: Add indexes for frequently queried columns

-- Index on market_product_id + recorded_at (for history queries)
CREATE INDEX IF NOT EXISTS idx_price_history_market_product_recorded ON price_history(market_product_id, recorded_at DESC);

-- Index on recorded_at (for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at DESC);

