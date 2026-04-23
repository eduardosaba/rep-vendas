-- Add slug to profiles and seller_id to orders for representative links
BEGIN;

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);

-- Add seller reference on orders
ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);

COMMIT;
