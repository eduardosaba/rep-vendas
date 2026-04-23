-- Add financial status and credit limit to customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'liberado',
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 0.00;

-- Nota: Ajuste RLS/policies conforme necessário (já temos SQL/2026-04-14_customers_rls.sql)
