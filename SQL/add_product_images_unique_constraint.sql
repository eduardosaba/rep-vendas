-- Adiciona constraint composta UNIQUE para (product_id, url)
-- Isso permite usar UPSERT na sincronização sem duplicar entradas

BEGIN;

-- Primeiro, remove duplicatas existentes (se houver) mantendo a mais recente
DELETE FROM product_images a USING product_images b
WHERE a.id < b.id
AND a.product_id = b.product_id
AND a.url = b.url;

-- Adiciona a constraint única
ALTER TABLE product_images
ADD CONSTRAINT product_images_product_id_url_key UNIQUE (product_id, url);

COMMIT;
