-- Migração: Transforma a lista de URLs em registros individuais na nova tabela
INSERT INTO public.product_images (product_id, url, is_primary, position, sync_status)
SELECT 
    id as product_id,
    trim(img_url) as url,
    (row_number() OVER (PARTITION BY id) = 1) as is_primary, -- A primeira da lista vira principal
    (row_number() OVER (PARTITION BY id) - 1) as position,   -- 0, 1, 2...
    'pending' as sync_status -- Já entra na fila para o Motor de Sincronização
FROM 
    public.products,
    unnest(string_to_array(image_url, ',')) as img_url
WHERE 
    image_url IS NOT NULL 
    AND image_url != '';

-- Diagnóstico pós-migração
SELECT count(*) as total_migrated FROM public.product_images;
