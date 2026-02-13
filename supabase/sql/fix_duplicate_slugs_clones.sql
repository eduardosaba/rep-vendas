-- Fix: Garantir unicidade de `slug` em produtos clonados
-- Uso: Executar no editor SQL do Supabase ou via psql em ambiente de teste antes de produção.
-- Objetivo: Para produtos clonados que ficaram com `slug` nulo e o slug gerado conflita,
-- gerar um slug único por usuário adicionando um sufixo numérico quando necessário.

-- Diagnóstico antes
SELECT COUNT(*) AS targets_without_slug
FROM catalog_clones cc
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE tgt.slug IS NULL OR tgt.slug = '';

DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  idx INTEGER;
BEGIN
  FOR rec IN
    SELECT
      cc.cloned_product_id AS tgt_id,
      tgt.user_id,
      src.slug AS src_slug,
      src.name AS src_name
    FROM catalog_clones cc
    JOIN products src ON src.id = cc.source_product_id
    JOIN products tgt ON tgt.id = cc.cloned_product_id
    WHERE tgt.slug IS NULL OR tgt.slug = ''
  LOOP
    -- Gerar base_slug a partir do slug da fonte, ou do nome
    base_slug := COALESCE(rec.src_slug,
      regexp_replace(lower(coalesce(rec.src_name,'')),'[^a-z0-9]+','-','g') || '-' || substr(md5(random()::text),1,6)
    );

    candidate := base_slug;
    idx := 1;

    -- Tentar atualizar; em caso de colisão de unique constraint, capturar e incrementar sufixo
    LOOP
      BEGIN
        UPDATE products
        SET slug = candidate, updated_at = now()
        WHERE id = rec.tgt_id;
        -- Se chegou aqui sem exceção, sucesso
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Conflito: gera próximo candidato e tenta novamente
        candidate := base_slug || '-' || idx;
        idx := idx + 1;
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END$$;

-- Diagnóstico após
SELECT COUNT(*) AS targets_still_without_slug
FROM catalog_clones cc
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE tgt.slug IS NULL OR tgt.slug = '';
