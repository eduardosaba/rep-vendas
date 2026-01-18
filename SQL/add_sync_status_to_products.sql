-- Adiciona colunas para controle de sincronização de imagens na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending', -- pending, synced, failed
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Cria índice para garantir performance quando o Worker buscar "quais imagens faltam processar"
CREATE INDEX IF NOT EXISTS idx_products_sync_status ON products(sync_status);

-- Opcional: Se desejar marcar como 'synced' imagens que JÁ estão no seu bucket (evita reprocessar o que já é interno)
-- Substitua 'SEU_PROJETO' pela URL do seu supabase se souber, ou deixe rodar tudo (mal não faz, apenas consome tempo).
-- UPDATE products SET sync_status = 'synced' WHERE image_url LIKE '%supabase.co%';