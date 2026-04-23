BEGIN;

CREATE OR REPLACE VIEW public.v_company_financial_closure_monthly AS
WITH orders_monthly AS (
  SELECT
    o.company_id,
    date_trunc('month', o.faturado_at) AS mes,
    SUM(COALESCE(o.total_value, 0)) AS faturamento_bruto,
    COUNT(o.id) AS total_pedidos
  FROM public.orders o
  WHERE o.faturado_at IS NOT NULL
    AND o.status IN ('Confirmado', 'Enviado', 'Entregue', 'Completo')
  GROUP BY o.company_id, date_trunc('month', o.faturado_at)
),
commissions_monthly AS (
  SELECT
    c.company_id,
    date_trunc('month', c.created_at) AS mes,
    SUM(COALESCE(c.amount, 0)) AS comissoes_a_pagar
  FROM public.commissions c
  WHERE c.status = 'pending'
  GROUP BY c.company_id, date_trunc('month', c.created_at)
)
SELECT
  om.company_id,
  om.mes,
  om.faturamento_bruto,
  om.total_pedidos,
  COALESCE(cm.comissoes_a_pagar, 0) AS comissoes_a_pagar
FROM orders_monthly om
LEFT JOIN commissions_monthly cm
  ON cm.company_id = om.company_id
 AND cm.mes = om.mes
ORDER BY om.mes DESC;

COMMIT;
