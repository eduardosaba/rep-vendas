-- Add columns to store catalog PDF link and visibility
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS catalog_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS show_pdf_catalog BOOLEAN DEFAULT false;

-- Social networks and WhatsApp
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;

-- Optional: you can run this in Supabase SQL editor.
