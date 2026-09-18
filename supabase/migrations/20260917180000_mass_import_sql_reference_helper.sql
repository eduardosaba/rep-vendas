-- Migration: Suporte a Importação em Massa via SQL para Preservação de Referências
-- 1. Garante que reference_code seja gravado exatamente como na planilha (com ou sem hífens).
-- 2. Deriva automaticamente reference_id como o modelo base (sem slugs, sem caixa baixa, sem hífens inventados).

CREATE OR REPLACE FUNCTION public.derive_base_reference(p_code text)
RETURNS text AS $$
DECLARE
  v_clean text;
  v_parts text[];
  v_len integer;
  v_last text;
BEGIN
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN 'REF-DESCONHECIDA';
  END IF;

  -- 1. Limpar aspas e espaços nas extremidades
  v_clean := TRIM(both '"'' ' from p_code);

  -- 2. Se houver hífen antes da cor no final (ex: MARC 726-086 -> MARC 726 086), normaliza para espaço para identificar a cor
  v_clean := regexp_replace(v_clean, '-([a-zA-Z0-9]{2,5})(-\d{2})?$', ' \1\2');

  -- 3. Dividir por espaço
  v_parts := regexp_split_to_array(v_clean, '\s+');
  v_len := array_length(v_parts, 1);

  -- Se tiver no mínimo 3 partes (Marca Modelo Cor), remove a cor no final
  IF v_len >= 3 THEN
    v_last := v_parts[v_len];
    -- Se o último token tiver tamanho (-58, -90, -54), ignora o sufixo -DD para validar a cor
    v_last := regexp_replace(v_last, '-\d{2}$', '');
    
    IF v_last ~ '^[a-zA-Z0-9]{2,5}$' AND POSITION('/' IN v_last) = 0 THEN
      RETURN array_to_string(v_parts[1:v_len-1], ' ');
    END IF;
  END IF;

  RETURN v_clean;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para automatizar o preenchimento de reference_id em inserções ou atualizações via SQL
CREATE OR REPLACE FUNCTION public.trg_auto_derive_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se reference_id for nulo ou vazio, deriva automaticamente a referência base a partir de reference_code
  IF NEW.reference_id IS NULL OR TRIM(NEW.reference_id) = '' THEN
    IF NEW.reference_code IS NOT NULL AND TRIM(NEW.reference_code) <> '' THEN
      NEW.reference_id := public.derive_base_reference(NEW.reference_code);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_auto_derive_reference_id ON public.products;

CREATE TRIGGER trg_products_auto_derive_reference_id
BEFORE INSERT OR UPDATE OF reference_code, reference_id ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_derive_reference_id();
