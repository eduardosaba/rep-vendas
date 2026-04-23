-- Cria índice em products.reference_code para acelerar buscas por SKU
-- Rode este arquivo no SQL Editor do Supabase

CREATE INDEX IF NOT EXISTS idx_products_reference_code
ON public.products (reference_code);

-- Verificação: após criar o índice, suas consultas usando .in('reference_code', [...]) devem ser muito mais rápidas.
-- IMPORTANTE: dependendo do tamanho da tabela, a criação do índice pode levar tempo e bloquear operações de escrita momentaneamente.
