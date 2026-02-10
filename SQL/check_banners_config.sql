-- Script de diagnóstico: Verificar configuração de banners
-- Execute no Supabase SQL Editor para diagnosticar problemas com banners

-- 1. Verificar se as colunas existem na tabela public_catalogs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'public_catalogs' 
  AND column_name IN ('banners', 'banners_mobile')
ORDER BY column_name;

-- 2. Verificar se as colunas existem na tabela settings
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'settings' 
  AND column_name IN ('banners', 'banners_mobile')
ORDER BY column_name;

-- 3. Ver dados atuais em settings (substitua 'seu-slug' pelo slug do seu catálogo)
SELECT 
  user_id,
  catalog_slug,
  name,
  banners,
  banners_mobile,
  array_length(banners, 1) as qtd_banners_desktop,
  array_length(banners_mobile, 1) as qtd_banners_mobile
FROM settings 
WHERE catalog_slug = 'seu-slug'; -- ⚠️ SUBSTITUIR PELO SEU SLUG

-- 4. Ver dados atuais em public_catalogs
SELECT 
  user_id,
  slug,
  store_name,
  banners,
  banners_mobile,
  array_length(banners, 1) as qtd_banners_desktop,
  array_length(banners_mobile, 1) as qtd_banners_mobile,
  is_active
FROM public_catalogs 
WHERE slug = 'seu-slug'; -- ⚠️ SUBSTITUIR PELO SEU SLUG

-- 5. Comparar dados entre settings e public_catalogs
SELECT 
  s.catalog_slug as slug,
  s.name as settings_name,
  pc.store_name as public_catalogs_name,
  array_length(s.banners, 1) as settings_banners_count,
  array_length(pc.banners, 1) as pc_banners_count,
  array_length(s.banners_mobile, 1) as settings_mobile_count,
  array_length(pc.banners_mobile, 1) as pc_mobile_count,
  CASE 
    WHEN s.banners IS DISTINCT FROM pc.banners THEN '⚠️ DESCINCRONIZADO'
    ELSE '✅ OK'
  END as status_banners,
  CASE 
    WHEN s.banners_mobile IS DISTINCT FROM pc.banners_mobile THEN '⚠️ DESCINCRONIZADO'
    ELSE '✅ OK'
  END as status_mobile
FROM settings s
LEFT JOIN public_catalogs pc ON s.user_id = pc.user_id
WHERE s.catalog_slug IS NOT NULL
ORDER BY s.catalog_slug;
