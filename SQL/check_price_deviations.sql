-- Script para visualizar desvios de preço entre Template e Representantes
-- Mostra quais representantes alteraram preços manualmente

-- Substitua 'ID_DO_USER_TEMPLATE_AQUI' pelo UUID do template
DO $$
DECLARE
    v_template_id UUID := 'ID_DO_USER_TEMPLATE_AQUI';
BEGIN
    -- Cria view temporária com desvios
    CREATE TEMP VIEW price_deviations AS
    SELECT 
        template.id as template_product_id,
        template.reference_code,
        template.name as product_name,
        template.brand,
        template.price as template_price,
        clone.id as clone_product_id,
        clone.price as clone_price,
        clone.user_id as rep_user_id,
        prof.full_name as rep_name,
        prof.email as rep_email,
        (clone.price - template.price) as price_difference,
        ROUND(((clone.price - template.price) / template.price * 100), 2) as deviation_percent
    FROM public.products template
    INNER JOIN public.products clone ON clone.original_product_id = template.id
    INNER JOIN public.profiles prof ON prof.id = clone.user_id
    WHERE template.user_id = v_template_id
      AND clone.price IS DISTINCT FROM template.price
      AND template.is_active IS DISTINCT FROM FALSE
      AND clone.is_active IS DISTINCT FROM FALSE
    ORDER BY ABS(clone.price - template.price) DESC;

    RAISE NOTICE '=== RELATÓRIO DE DESVIOS DE PREÇO ===';
    RAISE NOTICE '';
END $$;

-- Consultar a view
SELECT 
    reference_code,
    product_name,
    brand,
    template_price,
    clone_price,
    price_difference,
    deviation_percent || '%' as deviation,
    rep_name,
    rep_email
FROM price_deviations
LIMIT 50;
