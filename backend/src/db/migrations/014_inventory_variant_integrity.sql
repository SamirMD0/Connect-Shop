-- Preserve variant identity and detect every inventory change, including purchases.
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS inventory_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION advance_inventory_version() RETURNS TRIGGER AS $$
BEGIN
  NEW.inventory_version := OLD.inventory_version;
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    NEW.inventory_version := OLD.inventory_version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_inventory_version ON products;
CREATE TRIGGER products_inventory_version BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION advance_inventory_version();
DROP TRIGGER IF EXISTS variants_inventory_version ON product_variants;
CREATE TRIGGER variants_inventory_version BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION advance_inventory_version();

-- Soft retirement is the normal removal path. Prevent physical deletion from
-- silently erasing the variant identity of historical order items.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'order_items'::regclass AND confrelid = 'product_variants'::regclass
      AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
        WHERE attrelid = 'order_items'::regclass AND attname = 'variant_id')]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE order_items DROP CONSTRAINT %I', constraint_name);
  END LOOP;
  ALTER TABLE order_items ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;
END;
$$;
