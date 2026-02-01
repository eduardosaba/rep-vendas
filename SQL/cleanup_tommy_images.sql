-- SQL de limpeza para produtos da marca Tommy Hilfiger
-- 1) PREVIEW: revisar e exportar antes de qualquer UPDATE
-- Ajuste o filtro de brand conforme necessário (ex: 'Tommy Hilfiger' ou somente 'Tommy')

-- PREVIEW
SELECT id, user_id, reference_code, brand, image_path, image_url, image_optimized, sync_status, updated_at
FROM products
WHERE brand ILIKE '%Tommy%'
  AND (image_optimized = true OR image_path IS NOT NULL OR (image_url IS NOT NULL AND image_url LIKE 'http%'))
ORDER BY updated_at DESC
LIMIT 1000;
-- 2) UPDATE seguro: limpar flags que podem ter sido preservadas indevidamente
-- Estratégia: remover `image_path`, marcar `image_optimized=false` e `sync_status='pending'`
-- para que o worker processe novamente.

BEGIN;

UPDATE products
SET image_path = NULL,
    image_optimized = FALSE,
    sync_status = 'pending',
    updated_at = NOW()
WHERE brand ILIKE '%Tommy%'
  AND (image_optimized = TRUE OR image_path IS NOT NULL OR (image_url IS NOT NULL AND image_url LIKE 'http%'));

COMMIT;

-- Observações:
-- - Execute primeiro o SELECT PREVIEW e exporte os resultados como backup.
-- - Ajuste o filtro `brand ILIKE '%Tommy%'` se quiser ser mais específico.
-- - Se preferir apenas marcar `sync_status='pending'` (sem limpar `image_path`), remova a linha que seta `image_path = NULL`.
-- - Depois de aplicar, execute/aciona o endpoint `image-repair` ou aguarde o cron/worker para internalizar as imagens.
-- Exemplo: chamar rota de reparo interno (server-side) ou executar job cron que já existe.
