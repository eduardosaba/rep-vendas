-- Migração: adiciona colunas de branding, textos e flags de exibição em `companies`
-- Execute no editor SQL do Supabase ou via psql: psql "$DATABASE_URL" -f <file>

BEGIN;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS primary_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS header_background_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS header_text_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS header_icon_bg_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS header_icon_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS about_text text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS welcome_text text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS headline text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image_fit text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image_height integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image_position text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image_offset_x integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cover_image_offset_y integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS share_banner_url text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS banners text[];

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS banners_mobile text[];

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS store_banner_meta jsonb;

-- Top benefit / anúncio superior
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS show_top_benefit_bar boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS show_top_info_bar boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_text text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_mode text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_speed text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_animation text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_text_color text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_height integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_text_size integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_image_url text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_image_align text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS top_benefit_text_align text;

-- Preços / exibição / parcelas
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS show_cost_price boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS show_sale_price boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS price_unlock_mode text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS price_password_hash text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS show_installments boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS max_installments integer;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS cash_price_discount_percent numeric;

-- Estoque / políticas
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS enable_stock_management boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS global_allow_backorder boolean;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS shipping_policy text;

-- Tipografia / fontes
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS font_family text;

ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS font_url text;

-- Audit
ALTER TABLE IF EXISTS public.companies
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

COMMIT;

-- Nota: esta migração adiciona colunas sem presets. Se desejar backfill com
-- valores vindos de `settings` ou `public_catalogs`, podemos gerar um script
-- adicional para copiar/atualizar as linhas existentes.
