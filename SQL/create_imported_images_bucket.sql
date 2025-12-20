-- SQL helper: cria bucket 'imported-images' e políticas de storage (idempotente)
-- Pode ser executado no SQL Editor do Supabase ou via psql com permissões adequadas

-- Criar bucket se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'imported-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'imported-images',
      'imported-images',
      true,
      10485760,
      ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
    );
  END IF;
END $$;

-- Criar políticas de storage (caso não existam)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload imported-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload imported-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''imported-images'' AND auth.role() = ''authenticated'');';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view imported-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view imported-images" ON storage.objects FOR SELECT USING (bucket_id = ''imported-images'');';
  END IF;
END $$;
