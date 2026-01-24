-- Auditoria de Links Remanescentes (Safilo)
-- Use no SQL Editor do Supabase para verificar se restam URLs apontando para 'safilo.com'
-- Rodar após completar o processo de sincronização. Ajuste o LIMIT na terceira query conforme necessário.

-- 1. Resumo Geral de Migração (capa e galeria)
SELECT 
    'Capa (image_url)' as campo,
    COUNT(*) FILTER (WHERE image_url LIKE '%safilo.com%') as ainda_na_safilo,
    COUNT(*) FILTER (WHERE image_url NOT LIKE '%safilo.com%') as ja_migrados
FROM products

UNION ALL

-- 2. Verificação do Array de Imagens (Galeria dentro do produto)
SELECT 
    'Galeria (array images)' as campo,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(images) as img WHERE img LIKE '%safilo.com%')) as produtos_com_links_externos,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM unnest(images) as img WHERE img LIKE '%safilo.com%')) as produtos_limpos
FROM products;

-- 3. Lista de IDs para conferência (os "teimosos")
SELECT id, name, brand, image_url
FROM products
WHERE image_url LIKE '%safilo.com%'
   OR EXISTS (SELECT 1 FROM unnest(images) as img WHERE img LIKE '%safilo.com%')
LIMIT 50;

-- 4. (Opcional) Reconstruir o array 'images' a partir da tabela product_images
-- Use esta query apenas quando tiver certeza de que a tabela product_images contém os URLs otimizados e com status 'synced'.
-- Ela irá sobrescrever o campo `images` em `products` com os `optimized_url` da galeria sincronizada.

-- UPDATE products p
-- SET images = (
--     SELECT array_agg(optimized_url ORDER BY id)
--     FROM product_images pi
--     WHERE pi.product_id = p.id AND pi.sync_status = 'synced'
-- )
-- WHERE EXISTS (
--     SELECT 1 FROM product_images pi 
--     WHERE pi.product_id = p.id AND pi.sync_status = 'synced'
-- );

-- Observações:
-- - Se a query de resumo mostrar zeros, seu catálogo está limpo de links para safilo.com.
-- - Caso encontre registros, verifique os IDs listados e aplique correções manuais ou reprocessamento desses produtos.
-- - Faça backup/transação antes de executar updates em massa.
