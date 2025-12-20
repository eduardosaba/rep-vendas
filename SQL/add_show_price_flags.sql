-- Adiciona colunas para controlar exibição de preço no catálogo
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS show_sale_price boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_cost_price boolean DEFAULT false;

-- Para retrocompatibilidade, atualiza registros existentes para os valores padrão
UPDATE public.settings
SET show_sale_price = true
WHERE show_sale_price IS NULL;

UPDATE public.settings
SET show_cost_price = false
WHERE show_cost_price IS NULL;

-- Comando para checar a alteração
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='settings' AND column_name IN ('show_sale_price','show_cost_price');

-- -------------------------------------------------------------------------
-- Caso a tabela `products` ainda use `price` como custo, renomear para
-- `cost` e criar nova coluna `price` para servir como preço de venda.
-- ATENÇÃO: Faça backup antes de executar em produção.
-- -------------------------------------------------------------------------
-- Passos:
-- 1) Renomear coluna price -> cost
-- 2) Criar nova coluna price (numeric) e popular com o valor de cost
-- 3) Ajustar default e not null se desejado
-- Observação: não renomeamos a coluna `price` para preservar compatibilidade.
-- Em vez disso, adicionamos uma nova coluna `sale_price` (preço de venda)
-- e populamos com o valor atual de `price` (que hoje costuma representar custo).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price numeric(12,2);

-- Popula `sale_price` com o valor atualmente em `price` para manter compatibilidade
UPDATE public.products
SET sale_price = price
WHERE sale_price IS NULL;

-- (Opcional) Definir DEFAULT ou NOT NULL conforme política da sua loja
-- ALTER TABLE public.products ALTER COLUMN sale_price SET DEFAULT 0;
-- ALTER TABLE public.products ALTER COLUMN sale_price SET NOT NULL;

-- Index sugerido para buscas por preço de venda
-- CREATE INDEX IF NOT EXISTS idx_products_sale_price ON public.products(sale_price);
