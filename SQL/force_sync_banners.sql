-- Script de sincronização FORÇADA: settings → public_catalogs (APENAS BANNERS)
-- Execute este script APÓS salvar banners no Dashboard > Settings se eles não aparecerem automaticamente
-- ⚠️ SUBSTITUA 'seu-slug' pelo slug real do seu catálogo

-- PASSO 1: Verificar o que está em settings
SELECT 
  catalog_slug,
  banners,
  banners_mobile,
  array_length(banners, 1) as qtd_desktop,
  array_length(banners_mobile, 1) as qtd_mobile
FROM settings
WHERE catalog_slug = 'seu-slug'; -- ⚠️ SUBSTITUIR

-- PASSO 2: Verificar o que está em public_catalogs (ANTES da sincronização)
SELECT 
  slug,
  banners,
  banners_mobile,
  array_length(banners, 1) as qtd_desktop,
  array_length(banners_mobile, 1) as qtd_mobile
FROM public_catalogs
WHERE slug = 'seu-slug'; -- ⚠️ SUBSTITUIR

-- PASSO 3: FORÇAR sincronização (copia de settings → public_catalogs)
UPDATE public_catalogs pc
SET 
  banners = s.banners,
  banners_mobile = s.banners_mobile,
  updated_at = now()
FROM settings s
WHERE pc.user_id = s.user_id
  AND s.catalog_slug = 'seu-slug' -- ⚠️ SUBSTITUIR
  AND pc.slug = 'seu-slug'; -- ⚠️ SUBSTITUIR

-- PASSO 4: Verificar o que está em public_catalogs (DEPOIS da sincronização)
SELECT 
  slug,
  store_name,
  banners,
  banners_mobile,
  array_length(banners, 1) as qtd_desktop,
  array_length(banners_mobile, 1) as qtd_mobile,
  updated_at,
  CASE 
    WHEN array_length(banners, 1) > 0 OR array_length(banners_mobile, 1) > 0 
    THEN '✅ BANNERS SINCRONIZADOS!'
    ELSE '❌ AINDA SEM BANNERS (verifique settings)'
  END as resultado
FROM public_catalogs
WHERE slug = 'seu-slug'; -- ⚠️ SUBSTITUIR

-- PASSO 5: (OPCIONAL) Se quiser sincronizar TODOS os catálogos de uma vez:
-- UPDATE public_catalogs pc
-- SET 
--   banners = s.banners,
--   banners_mobile = s.banners_mobile,
--   updated_at = now()
-- FROM settings s
-- WHERE pc.user_id = s.user_id
--   AND s.catalog_slug IS NOT NULL;
