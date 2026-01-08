-- Migration: add_unique_index_system_updates_version
-- Garante que exista um índice único/constraint para permitir upsert por `version`
-- Uso: executar no Supabase SQL Editor ou via psql

BEGIN;

-- Cria índice único se ainda não existir (satisfaz ON CONFLICT (version))
CREATE UNIQUE INDEX IF NOT EXISTS system_updates_version_key
  ON public.system_updates (version);

COMMIT;

-- Observação: se você prefere permitir múltiplas linhas com a mesma versão,
-- NÃO aplique esta migration. Alternativa: manter insert e checar existência
-- antes de inserir.
