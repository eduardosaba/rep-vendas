-- Migration: Create image_ref_counts table and triggers for basic image ref counting

BEGIN;

-- Table to hold reference counts per storage path
CREATE TABLE IF NOT EXISTS image_ref_counts (
  path text PRIMARY KEY,
  refs integer NOT NULL DEFAULT 0
);

-- Helper functions to increment/decrement counts
CREATE OR REPLACE FUNCTION public.inc_image_ref(p_path text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_path IS NULL OR p_path = '' THEN
    RETURN;
  END IF;
  INSERT INTO image_ref_counts(path, refs) VALUES (p_path, 1)
  ON CONFLICT (path) DO UPDATE SET refs = image_ref_counts.refs + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.dec_image_ref(p_path text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_path IS NULL OR p_path = '' THEN
    RETURN;
  END IF;
  UPDATE image_ref_counts SET refs = refs - 1 WHERE path = p_path;
  DELETE FROM image_ref_counts WHERE refs <= 0;
END;
$$;

-- Triggers for products table (basic handling for image_path)
CREATE OR REPLACE FUNCTION public.products_ref_count_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.inc_image_ref(NEW.image_path);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.dec_image_ref(OLD.image_path);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.image_path IS DISTINCT FROM NEW.image_path THEN
      PERFORM public.dec_image_ref(OLD.image_path);
      PERFORM public.inc_image_ref(NEW.image_path);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS products_ref_count ON products;
CREATE TRIGGER products_ref_count
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION public.products_ref_count_trg();

-- Triggers for product_images table (storage_path)
CREATE OR REPLACE FUNCTION public.product_images_ref_count_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.inc_image_ref(NEW.storage_path);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.dec_image_ref(OLD.storage_path);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.storage_path IS DISTINCT FROM NEW.storage_path THEN
      PERFORM public.dec_image_ref(OLD.storage_path);
      PERFORM public.inc_image_ref(NEW.storage_path);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS product_images_ref_count ON product_images;
CREATE TRIGGER product_images_ref_count
AFTER INSERT OR UPDATE OR DELETE ON product_images
FOR EACH ROW EXECUTE FUNCTION public.product_images_ref_count_trg();

COMMIT;
