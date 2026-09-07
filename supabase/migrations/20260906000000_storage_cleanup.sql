-- Migration: 20260906000000_storage_cleanup.sql
-- Tabela para registrar as operações de limpeza e movimentação de storage
CREATE TABLE IF NOT EXISTS public.storage_cleanup_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('move_to_trash', 'restore_from_trash')),
  filter_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_items INT NOT NULL DEFAULT 0,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partially_failed')),
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Tabela para registrar os itens individuais de cada operação com máquina de estados detalhada
CREATE TABLE IF NOT EXISTS public.storage_cleanup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.storage_cleanup_operations(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL DEFAULT 'product-images',
  original_path TEXT NOT NULL,
  trash_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  moved_by UUID NOT NULL REFERENCES auth.users(id),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'copying', 'copied', 'source_delete_pending',
    'in_trash', 'restoring', 'restored', 'protected', 'conflict', 'failed'
  )),
  failed_step TEXT NULL,
  error_message TEXT NULL
);

-- Índices de Performance e Segurança
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_ops_token ON public.storage_cleanup_operations(token_hash);
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_ops_expires ON public.storage_cleanup_operations(expires_at);
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_items_op_id ON public.storage_cleanup_items(operation_id);
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_items_status ON public.storage_cleanup_items(status);

-- Habilitar RLS e Revogar Acesso Direto para anon/authenticated
ALTER TABLE public.storage_cleanup_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.storage_cleanup_operations FROM anon, authenticated;
REVOKE ALL ON public.storage_cleanup_items FROM anon, authenticated;
