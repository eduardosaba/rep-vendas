-- Cria a tabela public_catalogs usada para expor catálogos públicos por usuário
CREATE TABLE IF NOT EXISTS public.public_catalogs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,
  store_name text NOT NULL,
  logo_url text NULL,
  primary_color text NULL DEFAULT '#b9722e'::text,
  secondary_color text NULL DEFAULT '#0d1b2c'::text,
  header_background_color text NULL DEFAULT '#ffffff'::text,
  -- Flags de exibição de preço (copiadas de settings)
  show_sale_price boolean DEFAULT true,
  show_cost_price boolean DEFAULT false,
  -- Apenas um dos dois flags pode ser true ao mesmo tempo
  CONSTRAINT price_flags_exclusive CHECK (NOT (show_sale_price = true AND show_cost_price = true)),
  -- Gestão de estoque (se o lojista usa controle de estoque)
  enable_stock_management boolean DEFAULT false,
  -- Parcelamento
  show_installments boolean DEFAULT false,
  max_installments integer DEFAULT 1,
  -- Desconto à vista
  show_cash_discount boolean DEFAULT false,
  cash_price_discount_percent numeric DEFAULT 0,
  footer_message text NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT public_catalogs_pkey PRIMARY KEY (id),
  CONSTRAINT public_catalogs_slug_key UNIQUE (slug),
  CONSTRAINT public_catalogs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT slug_format CHECK ((slug ~ '^[a-z0-9-]+$'::text)),
  CONSTRAINT slug_length CHECK (((length(slug) >= 3) AND (length(slug) <= 50)))
);

CREATE INDEX IF NOT EXISTS idx_public_catalogs_slug ON public.public_catalogs USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_user_id ON public.public_catalogs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_public_catalogs_active ON public.public_catalogs USING btree (is_active) WHERE (is_active = true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_public_catalogs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_public_catalogs_updated_at ON public.public_catalogs;
CREATE TRIGGER trigger_update_public_catalogs_updated_at
BEFORE UPDATE ON public.public_catalogs
FOR EACH ROW
EXECUTE FUNCTION public.update_public_catalogs_updated_at();
