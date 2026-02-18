-- 1) Cria a tabela de marketing links (se não existir)
CREATE TABLE IF NOT EXISTS public.marketing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  share_banner_url TEXT,
  use_short_link BOOLEAN DEFAULT true,
  message TEXT,
  clicks INTEGER DEFAULT 0,
  metadata JSONB NULL
);

-- 2) Foreign key opcional apontando para auth.users (adapte se necessário)
-- O PostgreSQL não suporta `ADD CONSTRAINT IF NOT EXISTS` diretamente,
-- portanto usamos um bloco PL/pgSQL para checar e criar condicionalmente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_marketing_links_user' AND table_name = 'marketing_links'
  ) THEN
    ALTER TABLE public.marketing_links
      ADD CONSTRAINT fk_marketing_links_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Habilita RLS
ALTER TABLE public.marketing_links ENABLE ROW LEVEL SECURITY;

-- 4) Políticas: representantes só criam/veem/atualizam/deletam os próprios registros
-- Create policies if they do not exist (Postgres lacks IF NOT EXISTS for CREATE POLICY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_links' AND policyname = 'marketing_links_insert_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY marketing_links_insert_own
        ON public.marketing_links FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_links' AND policyname = 'marketing_links_select_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY marketing_links_select_own
        ON public.marketing_links FOR SELECT
        USING (auth.uid() = user_id);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_links' AND policyname = 'marketing_links_update_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY marketing_links_update_own
        ON public.marketing_links FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    $pol$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_links' AND policyname = 'marketing_links_delete_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY marketing_links_delete_own
        ON public.marketing_links FOR DELETE
        USING (auth.uid() = user_id);
    $pol$;
  END IF;
END$$;

-- 5) Garanta colunas úteis em short_links (não destrutivo)
ALTER TABLE IF EXISTS public.short_links
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 6) Index para busca rápida no código do short link
CREATE INDEX IF NOT EXISTS idx_short_links_code ON public.short_links (code);

-- 7) Index em marketing_links.user_id para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_marketing_links_user_id ON public.marketing_links (user_id);

-- 7.1) Garanta coluna share_banner_url em marketing_links caso tabela já exista
ALTER TABLE IF EXISTS public.marketing_links
  ADD COLUMN IF NOT EXISTS share_banner_url TEXT;

-- 7.2) Garanta coluna og_image_url em marketing_links caso tabela já exista
ALTER TABLE IF EXISTS public.marketing_links
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- 7.3) Garanta coluna og_image_url em public_catalogs para a sincronização (não destrutiva)
ALTER TABLE IF EXISTS public.public_catalogs
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- 8) RPC: get_banner_by_code - tenta marketing_links primeiro, depois public_catalogs
CREATE OR REPLACE FUNCTION public.get_banner_by_code(p_code text)
RETURNS TABLE(banner_url text) AS $$
BEGIN
  -- 1) tentar banner específico de marketing vinculado ao mesmo usuário do short_link
  RETURN QUERY
  SELECT COALESCE(m.share_banner_url, m.og_image_url, m.image_url) AS banner_url
  FROM public.marketing_links m
  JOIN public.short_links s ON s.user_id = m.user_id
  WHERE s.code = p_code
  ORDER BY m.created_at DESC
  LIMIT 1;

  -- 2) se não achou, tentar banner/og_image do catálogo associado ao destino do short_link
  RETURN QUERY
  SELECT COALESCE(c.share_banner_url, c.og_image_url) AS banner_url
  FROM public.public_catalogs c
  JOIN public.short_links s ON s.destination_url LIKE '%' || c.catalog_slug || '%'
  WHERE s.code = p_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9) Trigger: sincroniza banner salvo em marketing_links para public_catalogs
CREATE OR REPLACE FUNCTION public.sync_banner_to_catalog()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o catálogo público do usuário com o banner/og_image mais recente
  -- Usamos COALESCE para NÃO sobrescrever valores existentes com NULL.
  UPDATE public.public_catalogs
  SET
    share_banner_url = COALESCE(NEW.share_banner_url, public_catalogs.share_banner_url),
    og_image_url = COALESCE(NEW.share_banner_url, NEW.image_url, public_catalogs.og_image_url),
    updated_at = NOW()
  FROM public.public_catalogs
  WHERE public_catalogs.user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_marketing_banner ON public.marketing_links;
CREATE TRIGGER tr_sync_marketing_banner
AFTER INSERT OR UPDATE OF image_url, share_banner_url ON public.marketing_links
FOR EACH ROW
EXECUTE FUNCTION public.sync_banner_to_catalog();
