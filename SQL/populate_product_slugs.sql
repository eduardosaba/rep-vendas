-- Preenche o campo slug da tabela products usando o campo name
-- Gera slugs únicos e amigáveis para URLs

-- Passo 1: Instalar extensão unaccent (se ainda não estiver instalada)
-- Esta extensão remove acentos dos caracteres
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Passo 2: Atualizar slugs vazios ou nulos
-- Usa o name do produto para gerar o slug
UPDATE public.products
SET slug = (
  -- Remove acentos, converte para lowercase, substitui caracteres especiais por hífens
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(name),  -- Remove acentos
          '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove caracteres especiais
        ),
        '\s+', '-', 'g'  -- Substitui espaços por hífens
      ),
      '-+', '-', 'g'  -- Remove hífens duplicados
    )
  ) || '-' || substring(id::text, 1, 8)  -- Adiciona parte do ID para garantir unicidade
)
WHERE slug IS NULL OR slug = '';

-- Passo 3 (Opcional): Se você preferir usar reference_code + name:
-- Descomente as linhas abaixo e comente o UPDATE acima

/*
UPDATE public.products
SET slug = (
  lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(COALESCE(reference_code, '') || ' ' || name),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  )
)
WHERE slug IS NULL OR slug = '';
*/

-- Passo 4: Verificar os resultados
SELECT id, name, reference_code, slug 
FROM public.products 
WHERE slug IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Passo 5 (Opcional): Adicionar índice único ao slug para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_unique 
ON public.products(slug) 
WHERE slug IS NOT NULL;

-- Passo 6 (Opcional): Adicionar constraint para garantir que novos produtos tenham slug
-- ALTER TABLE public.products 
-- ALTER COLUMN slug SET NOT NULL;

-- Exemplos de slugs gerados:
-- "Camiseta Polo Azul" -> "camiseta-polo-azul-a1b2c3d4"
-- "Tênis Nike Air Max" -> "tenis-nike-air-max-e5f6g7h8"
-- "Relógio Casio G-Shock" -> "relogio-casio-g-shock-i9j0k1l2"
