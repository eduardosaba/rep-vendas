-- Migration: 20260907000000_order_pdf_cleanup.sql
-- Tabela para registrar historico de auditoria e movimentacao de PDFs de Pedidos (bucket: orders)

CREATE TABLE IF NOT EXISTS public.order_pdf_cleanup_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.storage_cleanup_operations(id) ON DELETE CASCADE,
  order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL DEFAULT 'orders',
  original_path TEXT NOT NULL,
  trash_path TEXT NOT NULL,
  file_hash TEXT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  classification TEXT NOT NULL CHECK (classification IN (
    'regenerable_data_fidelity', 'preserved_historical_original', 'unknown'
  )),
  has_signature BOOLEAN NOT NULL DEFAULT false,
  order_status TEXT NULL,
  previous_pdf_url TEXT NULL,
  moved_by UUID NOT NULL REFERENCES auth.users(id),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  restored_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'copying', 'copied', 'source_delete_pending',
    'in_trash', 'restoring', 'restored', 'protected', 'conflict', 'failed'
  )),
  failed_step TEXT NULL,
  error_message TEXT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_pdf_items_op ON public.order_pdf_cleanup_items(operation_id);
CREATE INDEX IF NOT EXISTS idx_order_pdf_items_order ON public.order_pdf_cleanup_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_pdf_items_status ON public.order_pdf_cleanup_items(status);
CREATE INDEX IF NOT EXISTS idx_order_pdf_items_retention ON public.order_pdf_cleanup_items(retention_until);

-- RLS
ALTER TABLE public.order_pdf_cleanup_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_pdf_cleanup_items FROM anon, authenticated;
