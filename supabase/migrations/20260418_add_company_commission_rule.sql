-- Regra única de comissão por distribuidora
-- faturamento: libera na emissão/faturamento
-- liquidez: libera apenas na liquidez (pagamento)

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS commission_trigger TEXT DEFAULT 'liquidez';

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS default_commission_rate DECIMAL(5,2) DEFAULT 5.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_commission_trigger_chk'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_commission_trigger_chk
      CHECK (commission_trigger IN ('faturamento', 'liquidez'));
  END IF;
END;
$$;
