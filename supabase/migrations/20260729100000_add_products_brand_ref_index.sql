-- Migration: Add composite indexes on products for MARCA|REFERENCIA lookup
-- Date: 2026-07-29

-- Índice composto brand + reference_code para lookup global (MARCA|REFERENCIA)
CREATE INDEX IF NOT EXISTS idx_products_brand_ref
ON public.products (brand, reference_code)
WHERE organization_id IS NOT NULL;

-- Índice para busca prévia por marcas presentes na planilha
CREATE INDEX IF NOT EXISTS idx_products_brand_org
ON public.products (brand)
WHERE organization_id IS NOT NULL;
