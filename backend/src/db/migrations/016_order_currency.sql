-- Historical orders were denominated in USD; new orders snapshot store currency.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';
