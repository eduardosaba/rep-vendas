-- Migration: create product_interactions table
CREATE TABLE IF NOT EXISTS product_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public_catalogs(id) ON DELETE CASCADE,
  interacted_at timestamptz DEFAULT now(),
  type text DEFAULT 'view'
);

CREATE INDEX IF NOT EXISTS idx_product_interactions_product ON product_interactions(product_id);
