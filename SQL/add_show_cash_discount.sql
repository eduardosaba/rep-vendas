-- Adiciona coluna show_cash_discount na tabela settings
-- Mantém compatibilidade copiando valor de show_discount_tag para os registros existentes

ALTER TABLE IF EXISTS settings
ADD COLUMN IF NOT EXISTS show_cash_discount boolean DEFAULT FALSE;

-- Copia valores existentes de show_discount_tag (caso exista) para o novo campo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_discount_tag'
  ) THEN
    UPDATE settings
    SET show_cash_discount = show_discount_tag
    WHERE show_cash_discount IS DISTINCT FROM show_discount_tag;
  END IF;
END$$;

-- OBS: após aplicar, ajustar código que gravava/lia `show_discount_tag` para `show_cash_discount`.
