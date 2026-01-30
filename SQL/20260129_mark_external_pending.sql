-- Migration: 2026-01-29
-- Marca produtos e product_images com URLs externas como 'pending' para que o processo de sincronização local os processe.

BEGIN;

-- 1) Produtos com image_url externa (http/https) e que não apontam para storage público do Supabase
--    Apenas atualiza quando o status atual não é 'pending', 'failed' ou 'synced'.
UPDATE products
SET sync_status = 'pending', sync_error = NULL, updated_at = NOW()
WHERE image_url IS NOT NULL
  AND image_url LIKE 'http%'
  AND image_url NOT ILIKE '%/storage/v1/object%'
  AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'));

-- 2) Product images (galeria) com URL externa e sem status adequado
UPDATE product_images
SET sync_status = 'pending', sync_error = NULL
WHERE url IS NOT NULL
  AND url LIKE 'http%'
  AND url NOT ILIKE '%/storage/v1/object%'
  AND (sync_status IS NULL OR sync_status NOT IN ('pending','failed','synced'));

COMMIT;

-- Observação: execute este script em um ambiente de staging/prod com backup. Ele força o processamento
-- de imagens externas pelo script local-sync-full.mjs e pela API de reparo automática.
