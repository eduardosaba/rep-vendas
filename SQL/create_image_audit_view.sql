-- =====================================================
-- VIEW: image_audit_summary
-- =====================================================
-- Propósito: Centralizar métricas de saúde do catálogo
-- para auditoria de imagens (sync_status por marca)
-- =====================================================

CREATE OR REPLACE VIEW public.image_audit_summary AS
SELECT 
    brand,
    sync_status,
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE image_url LIKE '%-medium.webp%') as total_internalized,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as total_errors
FROM 
    public.products
GROUP BY 
    brand, sync_status;

-- =====================================================
-- Permissões
-- =====================================================
GRANT SELECT ON public.image_audit_summary TO authenticated;

COMMENT ON VIEW public.image_audit_summary IS 
'Métricas agregadas de sync_status por marca para auditoria de imagens';
