-- Migration: tornar reference_code único por usuário
-- Date: 2026-01-14

-- Objetivo: permitir que diferentes usuários tenham o mesmo reference_code,
-- garantindo unicidade apenas dentro do mesmo `user_id`.

BEGIN;

-- 1) Remover constraint única global (se existir)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_reference_code_key;

-- 2) Criar índice único por (user_id, reference_code) ignorando NULLs
CREATE UNIQUE INDEX IF NOT EXISTS products_user_reference_code_idx
ON public.products (user_id, reference_code)
WHERE reference_code IS NOT NULL;

COMMIT;

-- Nota: se seu fluxo de migrations exige um arquivo de "down" separado,
-- adicione a reversão conforme necessário (ex: dropar o índice e recriar a
-- constraint antiga com o nome correto).
