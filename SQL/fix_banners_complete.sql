-- Script de correção: Garantir banners funcionando
-- Execute no Supabase SQL Editor como service_role ou admin

-- PARTE 1: Criar colunas se não existirem
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS banners TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banners_mobile TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.settings.banners IS 'Array de URLs de banners desktop do carrossel principal.';
COMMENT ON COLUMN public.settings.banners_mobile IS 'Array de URLs de banners para mobile.';

ALTER TABLE public.public_catalogs 
ADD COLUMN IF NOT EXISTS banners TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banners_mobile TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.public_catalogs.banners IS 'Array de URLs de banners desktop (sincronizado de settings).';
COMMENT ON COLUMN public.public_catalogs.banners_mobile IS 'Array de URLs de banners mobile (sincronizado de settings).';

-- PARTE 2: Sincronizar dados de settings para public_catalogs
-- (sobrescreve apenas se settings tiver banners configurados)
UPDATE public.public_catalogs pc
SET 
  banners = COALESCE(s.banners, pc.banners),
  banners_mobile = COALESCE(s.banners_mobile, pc.banners_mobile),
  updated_at = now()
FROM public.settings s
WHERE pc.user_id = s.user_id;

-- PARTE 3: Inicializar arrays vazios onde estiver NULL (opcional, melhora UX)
UPDATE public.settings 
SET banners = '{}' 
WHERE banners IS NULL;

UPDATE public.settings 
SET banners_mobile = '{}' 
WHERE banners_mobile IS NULL;

UPDATE public.public_catalogs 
SET banners = '{}' 
WHERE banners IS NULL;

UPDATE public.public_catalogs 
SET banners_mobile = '{}' 
WHERE banners_mobile IS NULL;

-- RELATÓRIO: Mostrar resultado
SELECT 
  slug,
  store_name,
  array_length(banners, 1) as qtd_banners_desktop,
  array_length(banners_mobile, 1) as qtd_banners_mobile,
  CASE 
    WHEN array_length(banners, 1) > 0 OR array_length(banners_mobile, 1) > 0 
    THEN '✅ Banners configurados'
    ELSE '⚠️ Sem banners (configure no Dashboard > Settings)'
  END as status
FROM public.public_catalogs
WHERE is_active = true
ORDER BY slug;
