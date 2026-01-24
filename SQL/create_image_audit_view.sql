-- =====================================================
-- VIEW: image_audit_summary
-- =====================================================
-- Propósito: Centralizar métricas de saúde do catálogo
-- para auditoria de imagens (sync_status por marca)
-- =====================================================

CREATE OR REPLACE VIEW public.image_audit_summary AS
SELECT
    p.brand,
    p.sync_status,
    COUNT(*) AS total_products,
    -- A product is considered "internalized" if it has a non-empty image_url
    -- (uploaded to storage) OR if it has at least one gallery image
    -- in product_images with sync_status = 'synced'. This keeps the
    -- audit in sync with what the sync/optimize process writes.
    COUNT(*) FILTER (
        WHERE (
            (p.image_url IS NOT NULL AND p.image_url <> '')
            OR EXISTS (
                SELECT 1 FROM public.product_images pi
                WHERE pi.product_id = p.id AND pi.sync_status = 'synced'
            )
        )
    ) AS total_internalized,
    COUNT(*) FILTER (WHERE p.sync_status = 'failed') AS total_errors
FROM public.products p
GROUP BY p.brand, p.sync_status;

-- =====================================================
-- Permissões
-- =====================================================
GRANT SELECT ON public.image_audit_summary TO authenticated;

COMMENT ON VIEW public.image_audit_summary IS 
'Métricas agregadas de sync_status por marca para auditoria de imagens';
