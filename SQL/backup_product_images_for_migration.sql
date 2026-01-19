-- Backup: copia as linhas atuais de product_images para tabela de backup (para produtos com images não nulos)
CREATE TABLE IF NOT EXISTS public.backup_product_images AS
SELECT *, now() AS backup_at
FROM public.product_images
WHERE product_id IN (SELECT id FROM public.products WHERE images IS NOT NULL);

-- Opcional: índice para consultas posteriores
CREATE INDEX IF NOT EXISTS idx_backup_product_images_product_id ON public.backup_product_images(product_id);
