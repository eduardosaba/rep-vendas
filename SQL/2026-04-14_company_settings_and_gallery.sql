-- Cria tabelas de configurações e galeria para empresas (distribuidoras)
BEGIN;

-- Tabela de configurações do site/catálogo por company
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  welcome_text TEXT DEFAULT 'Bem-vindo ao nosso portal de pedidos',
  hero_banner_url TEXT,
  about_us_content TEXT,
  shipping_policy_content TEXT,
  advantages_title TEXT DEFAULT 'Vantagens de ser nosso parceiro',
  advantages_content TEXT,
  brands_content TEXT,
  private_label_content TEXT,
  onboarding_steps JSONB,
  contact_info JSONB,
  gallery_urls TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company ON public.company_settings(company_id);

-- Tabela para páginas adicionais criadas pelo usuário
CREATE TABLE IF NOT EXISTS public.custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_pages_company ON public.custom_pages(company_id);

-- Tabela de galeria de imagens
CREATE TABLE IF NOT EXISTS public.company_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT DEFAULT 'geral',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_gallery_company ON public.company_gallery(company_id);

COMMIT;

-- Habilitar RLS e criar política idempotente para company_gallery
ALTER TABLE public.company_gallery ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'company_gallery_policy') THEN
    CREATE POLICY company_gallery_policy ON public.company_gallery
      FOR ALL
      USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END$$;
