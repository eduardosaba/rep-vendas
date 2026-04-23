-- Migração opcional: converter company_pages.content para JSONB
-- Estratégia:
-- 1) Renomeia coluna antiga para content_legacy
-- 2) Cria nova coluna JSONB
-- 3) Migra registros preservando JSON já válido e encapsulando HTML/texto legado
-- 4) Remove coluna antiga e mantém default padronizado

BEGIN;

ALTER TABLE public.company_pages
  RENAME COLUMN content TO content_legacy;

ALTER TABLE public.company_pages
  ADD COLUMN content JSONB;

UPDATE public.company_pages
SET content = CASE
  WHEN content_legacy IS NULL OR btrim(content_legacy) = '' THEN
    jsonb_build_object(
      'version', 1,
      'title', coalesce(title, ''),
      'heroImage', '',
      'blocks', '[]'::jsonb
    )
  WHEN left(btrim(content_legacy), 1) = '{' THEN
    content_legacy::jsonb
  ELSE
    jsonb_build_object(
      'version', 1,
      'title', coalesce(title, ''),
      'heroImage', '',
      'blocks', jsonb_build_array(
        jsonb_build_object(
          'id', md5(id::text || '-legacy-text'),
          'type', 'text',
          'data', jsonb_build_object(
            'text', regexp_replace(content_legacy, '<[^>]*>', '', 'g')
          )
        )
      )
    )
END;

ALTER TABLE public.company_pages
  ALTER COLUMN content SET NOT NULL,
  ALTER COLUMN content SET DEFAULT jsonb_build_object(
    'version', 1,
    'title', '',
    'heroImage', '',
    'blocks', '[]'::jsonb
  );

ALTER TABLE public.company_pages
  DROP COLUMN content_legacy;

COMMIT;
