-- ============================================================
-- MIGRAÇÃO: Arquitetura de Herança de Identidade Visual
-- Data: 2026-04-23
-- 
-- Hierarquia de dados (quem manda em quem):
--   companies  →  Identidade visual da Distribuidora (base)
--   settings   →  Personalização do Representante (sobrescreve companies)
--   public_catalogs → Índice técnico: apenas slug + is_active
-- ============================================================

-- ----------------------------------------------------------------
-- PASSO 1: Garantir que a tabela settings tem todos os campos
--          necessários para guardar a personalização do vendedor
-- ----------------------------------------------------------------
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS representative_name     TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url            TEXT,
  ADD COLUMN IF NOT EXISTS show_top_benefit_bar    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS top_benefit_text        TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_mode        TEXT DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS top_benefit_speed       TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS top_benefit_animation   TEXT DEFAULT 'scroll_left',
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color    TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_text_color  TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_height      INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_text_size   INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit   TEXT DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS top_benefit_image_align TEXT DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS top_benefit_text_align  TEXT DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS show_installments       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_installments        INTEGER,
  ADD COLUMN IF NOT EXISTS show_sale_price         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_cost_price         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_unlock_mode       TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cash_price_discount_percent DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS enable_stock_management BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_allow_backorder  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS banners                 TEXT[],
  ADD COLUMN IF NOT EXISTS banners_mobile          TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_urls            TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_title           TEXT,
  ADD COLUMN IF NOT EXISTS gallery_subtitle        TEXT,
  ADD COLUMN IF NOT EXISTS gallery_title_color     TEXT,
  ADD COLUMN IF NOT EXISTS gallery_subtitle_color  TEXT,
  ADD COLUMN IF NOT EXISTS font_family             TEXT,
  ADD COLUMN IF NOT EXISTS font_url                TEXT,
  ADD COLUMN IF NOT EXISTS cover_image             TEXT,
  ADD COLUMN IF NOT EXISTS headline                TEXT,
  ADD COLUMN IF NOT EXISTS welcome_text            TEXT,
  ADD COLUMN IF NOT EXISTS about_text              TEXT,
  ADD COLUMN IF NOT EXISTS footer_background_color TEXT,
  ADD COLUMN IF NOT EXISTS footer_text_color       TEXT,
  ADD COLUMN IF NOT EXISTS footer_message          TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url            TEXT,
  ADD COLUMN IF NOT EXISTS share_banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS price_password_hash     TEXT,
  ADD COLUMN IF NOT EXISTS is_active               BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS catalog_slug            TEXT;

-- ----------------------------------------------------------------
-- PASSO 2: Garantir que companies tem os campos de identidade visual
-- ----------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS primary_color           TEXT DEFAULT '#b9722e',
  ADD COLUMN IF NOT EXISTS secondary_color         TEXT,
  ADD COLUMN IF NOT EXISTS logo_url                TEXT,
  ADD COLUMN IF NOT EXISTS cover_image             TEXT,
  ADD COLUMN IF NOT EXISTS headline                TEXT,
  ADD COLUMN IF NOT EXISTS welcome_text            TEXT,
  ADD COLUMN IF NOT EXISTS about_text              TEXT,
  ADD COLUMN IF NOT EXISTS footer_message          TEXT,
  ADD COLUMN IF NOT EXISTS footer_background_color TEXT,
  ADD COLUMN IF NOT EXISTS footer_text_color       TEXT,
  ADD COLUMN IF NOT EXISTS font_family             TEXT,
  ADD COLUMN IF NOT EXISTS font_url                TEXT,
  ADD COLUMN IF NOT EXISTS banners                 TEXT[],
  ADD COLUMN IF NOT EXISTS banners_mobile          TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_urls            TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_title           TEXT,
  ADD COLUMN IF NOT EXISTS gallery_subtitle        TEXT,
  ADD COLUMN IF NOT EXISTS gallery_title_color     TEXT,
  ADD COLUMN IF NOT EXISTS gallery_subtitle_color  TEXT,
  ADD COLUMN IF NOT EXISTS show_top_benefit_bar    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS top_benefit_text        TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color    TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_text_color  TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_height      INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_text_size   INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_mode        TEXT DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS top_benefit_speed       TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS top_benefit_animation   TEXT DEFAULT 'scroll_left',
  ADD COLUMN IF NOT EXISTS top_benefit_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit   TEXT DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS top_benefit_image_align TEXT DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS top_benefit_text_align  TEXT DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS show_installments       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_installments        INTEGER,
  ADD COLUMN IF NOT EXISTS show_sale_price         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_cost_price         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_unlock_mode       TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enable_stock_management BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_allow_backorder  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS og_image_url            TEXT,
  ADD COLUMN IF NOT EXISTS share_banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS phone                   TEXT,
  ADD COLUMN IF NOT EXISTS email                   TEXT;

-- ----------------------------------------------------------------
-- PASSO 3: public_catalogs — simplificar para índice técnico
-- (Mantemos as colunas por compatibilidade, mas paramos de usá-las
--  para design — o catálogo lê de settings/companies via herança)
-- ----------------------------------------------------------------
-- Garante que as colunas essenciais existem
ALTER TABLE public.public_catalogs
  ADD COLUMN IF NOT EXISTS catalog_slug TEXT,
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_password_hash TEXT;

-- Unique index no slug (se não existir)
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_catalogs_catalog_slug
  ON public.public_catalogs(catalog_slug)
  WHERE catalog_slug IS NOT NULL;

-- ----------------------------------------------------------------
-- PASSO 4: Copiar dados de public_catalogs → settings
--          (mapeamento correto das colunas reais de public_catalogs)
-- ----------------------------------------------------------------
UPDATE public.settings s
SET
  -- Cores: public_catalogs usa 'secondary_color' como cor primária da marca
  primary_color         = COALESCE(s.primary_color,     pc.secondary_color),
  -- Logo
  logo_url              = COALESCE(s.logo_url,          pc.single_brand_logo_url),
  -- Banners: extraídos do JSONB store_banner_meta (pc não tem coluna banners TEXT[])
  banners               = COALESCE(
                            s.banners,
                            CASE
                              WHEN pc.store_banner_meta IS NOT NULL
                               AND jsonb_typeof(pc.store_banner_meta->'banners') = 'array'
                              THEN ARRAY(SELECT jsonb_array_elements_text(pc.store_banner_meta->'banners'))
                              ELSE NULL
                            END
                          ),
  banners_mobile        = COALESCE(s.banners_mobile,    pc.banners_mobile),
  phone                 = COALESCE(s.phone,             pc.phone),
  show_installments     = COALESCE(s.show_installments, pc.show_installments),
  show_sale_price       = COALESCE(s.show_sale_price,   pc.show_sale_price),
  show_cost_price       = COALESCE(s.show_cost_price,   pc.show_cost_price),
  price_unlock_mode     = COALESCE(s.price_unlock_mode, pc.price_unlock_mode),
  price_password_hash   = COALESCE(s.price_password_hash, pc.price_password_hash),
  enable_stock_management = COALESCE(s.enable_stock_management, pc.enable_stock_management),
  catalog_slug          = COALESCE(s.catalog_slug,      pc.catalog_slug),
  is_active             = COALESCE(s.is_active,         pc.is_active)
FROM public.public_catalogs pc
WHERE s.user_id = pc.user_id
  AND pc.user_id IS NOT NULL;

-- ----------------------------------------------------------------
-- PASSO 5: Copiar dados de public_catalogs → companies
--          (via admin_company/master da empresa — join correto por profiles)
-- ----------------------------------------------------------------
UPDATE public.companies c
SET
  -- Cores: public_catalogs usa 'secondary_color' como cor primária da marca
  primary_color         = COALESCE(c.primary_color,     pc.secondary_color),
  -- Logo da empresa vem do logo de marca única do catálogo do admin
  logo_url              = COALESCE(c.logo_url,          pc.single_brand_logo_url),
  -- Banners: extraídos do JSONB store_banner_meta (pc não tem coluna banners TEXT[])
  banners               = COALESCE(
                            c.banners,
                            CASE
                              WHEN pc.store_banner_meta IS NOT NULL
                               AND jsonb_typeof(pc.store_banner_meta->'banners') = 'array'
                              THEN ARRAY(SELECT jsonb_array_elements_text(pc.store_banner_meta->'banners'))
                              ELSE NULL
                            END
                          ),
  banners_mobile        = COALESCE(c.banners_mobile,    pc.banners_mobile),
  phone                 = COALESCE(c.phone,             pc.phone),
  show_installments     = COALESCE(c.show_installments, pc.show_installments),
  show_sale_price       = COALESCE(c.show_sale_price,   pc.show_sale_price),
  show_cost_price       = COALESCE(c.show_cost_price,   pc.show_cost_price),
  price_unlock_mode     = COALESCE(c.price_unlock_mode, pc.price_unlock_mode),
  enable_stock_management = COALESCE(c.enable_stock_management, pc.enable_stock_management)
FROM public.public_catalogs pc
JOIN public.profiles p ON p.id = pc.user_id
WHERE p.company_id = c.id
  AND p.role IN ('admin_company', 'master')
  AND pc.user_id IS NOT NULL;

-- ----------------------------------------------------------------
-- PASSO 6: RLS — garantir que service role bypassa as policies
--          (já ocorre por padrão no Supabase com service_role key)
-- ----------------------------------------------------------------

-- Verificar se as policies de settings permitem UPDATE por user_id
-- (a policy padrão "Users can update their own settings" já deve cobrir isso)
-- Se não existir, criar:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'settings' AND policyname = 'Users can upsert their own settings'
  ) THEN
    CREATE POLICY "Users can upsert their own settings" ON public.settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- PASSO 7: Copiar logos de public_catalogs → settings e companies
--          (single_brand_logo_url é o campo real das logos na pc)
--          COALESCE: só preenche se o destino ainda estiver vazio
-- ----------------------------------------------------------------

-- Representantes individuais e vinculados: logo vai para settings
UPDATE public.settings s
SET logo_url = COALESCE(s.logo_url, pc.single_brand_logo_url)
FROM public.public_catalogs pc
WHERE s.user_id = pc.user_id
  AND pc.single_brand_logo_url IS NOT NULL
  AND pc.single_brand_logo_url <> '';

-- Admin da empresa: logo vai para companies (identidade da distribuidora)
UPDATE public.companies c
SET logo_url = COALESCE(c.logo_url, pc.single_brand_logo_url)
FROM public.public_catalogs pc
JOIN public.profiles p ON p.id = pc.user_id
WHERE p.company_id = c.id
  AND p.role IN ('admin_company', 'master')
  AND pc.single_brand_logo_url IS NOT NULL
  AND pc.single_brand_logo_url <> '';

-- ----------------------------------------------------------------
-- PASSO 8: Backfill public_catalogs.catalog_slug ← settings.catalog_slug
--          A PASSO 3 adicionou a coluna (vazia). A PASSO 4 copiava
--          pc.catalog_slug → settings, mas pc.catalog_slug estava NULL.
--          settings.catalog_slug já tinha os slugs dos usuários.
--          Este passo preenche public_catalogs.catalog_slug corretamente.
-- ----------------------------------------------------------------

UPDATE public.public_catalogs pc
SET catalog_slug = s.catalog_slug
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND s.catalog_slug IS NOT NULL
  AND s.catalog_slug <> ''
  AND pc.catalog_slug IS NULL;

-- Fallback final: usa profiles.slug quando settings.catalog_slug também é NULL
-- (garante que a URL /catalogo/<profile_slug> continue funcionando)
UPDATE public.public_catalogs pc
SET catalog_slug = p.slug
FROM public.profiles p
WHERE pc.user_id = p.id
  AND p.slug IS NOT NULL
  AND p.slug <> ''
  AND pc.catalog_slug IS NULL;

-- Garantir que is_active está consistente (não NULL)
UPDATE public.public_catalogs
SET is_active = true
WHERE is_active IS NULL;

-- ----------------------------------------------------------------
-- PASSO 8b: Adicionar public_catalogs.logo_url e populá-la
--           O código legado de produção lê catalog.logo_url.
--           Como a coluna não existe, precisamos criá-la e
--           copiá-la de single_brand_logo_url para compatibilidade.
-- ----------------------------------------------------------------
ALTER TABLE public.public_catalogs
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

UPDATE public.public_catalogs
SET logo_url = COALESCE(logo_url, single_brand_logo_url)
WHERE single_brand_logo_url IS NOT NULL
  AND single_brand_logo_url <> '';

-- Fonte definitiva: settings.logo_url (onde TabAppearance salva o upload)
-- single_brand_logo_url pode estar vazio; settings.logo_url é sempre populado ao salvar
UPDATE public.public_catalogs pc
SET logo_url = COALESCE(pc.logo_url, s.logo_url)
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND s.logo_url IS NOT NULL
  AND s.logo_url <> ''
  AND (pc.logo_url IS NULL OR pc.logo_url = '');

-- Backfill store_name se estiver vazio, usando representative_name ou name de settings
UPDATE public.public_catalogs pc
SET store_name = COALESCE(pc.store_name, s.representative_name, s.name)
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND (pc.store_name IS NULL OR pc.store_name = '')
  AND (s.representative_name IS NOT NULL OR s.name IS NOT NULL);

-- ============================================================
-- VERIFICAÇÃO FINAL (rode para confirmar a migração)
-- ============================================================
-- SELECT 
--   pc.user_id,
--   pc.catalog_slug,
--   pc.logo_url,
--   pc.single_brand_logo_url,
--   pc.store_name,
--   pc.is_active
-- FROM public.public_catalogs pc
-- ORDER BY pc.user_id
-- LIMIT 20;
