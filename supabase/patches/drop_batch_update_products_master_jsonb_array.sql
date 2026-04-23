-- Remove a função com assinatura batch_update_products_master(jsonb[])
-- Use este arquivo no SQL Editor do Supabase antes de aplicar a versão que usa JSONB simples.

DROP FUNCTION IF EXISTS public.batch_update_products_master(jsonb[]);

-- Após isso, garanta que exista a versão que aceita JSONB (arquivo: batch_update_products_master.sql)
-- Recomenda-se executar em ambiente de manutenção se houver tráfego intenso.
