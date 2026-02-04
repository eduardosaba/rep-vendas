-- Resetar 1 produto específico para re-processamento com logs
UPDATE products
SET sync_status = 'pending', 
    sync_error = NULL,
    image_optimized = false
WHERE id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

UPDATE product_images
SET sync_status = 'pending', 
    optimized_url = NULL, 
    storage_path = NULL,
    optimized_variants = NULL
WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

-- Verificar reset
SELECT 
  id, 
  reference_code, 
  sync_status, 
  image_optimized
FROM products
WHERE id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

SELECT 
  id, 
  sync_status, 
  optimized_url, 
  storage_path
FROM product_images
WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';
