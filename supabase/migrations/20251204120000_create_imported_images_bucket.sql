-- Migration: criar bucket 'imported-images' e políticas de acesso
-- Executar em Supabase (pode ser aplicado via psql com a role apropriada)

-- 1) Criar bucket se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'imported-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'imported-images',
      'imported-images',
      true,
      10485760, -- 10 MB
      ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
    );
  END IF;
END $$;

-- 2) Criar políticas de storage (somente se não existirem)
DO $$
BEGIN
  -- Permitir que usuários autenticados façam INSERT (upload) para este bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload imported-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload imported-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''imported-images'' AND auth.role() = ''authenticated'');';
  END IF;

  -- Permitir leitura pública (SELECT) dos objetos deste bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view imported-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view imported-images" ON storage.objects FOR SELECT USING (bucket_id = ''imported-images'');';
  END IF;
END $$;

-- 3) Verificação (opcional): listar buckets e políticas
-- SELECT id, name, public FROM storage.buckets WHERE id = 'imported-images';
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
