-- Políticas de Storage para Supabase
-- Execute estes comandos no SQL Editor do Supabase para cada bucket

-- IMPORTANTE: Execute estes comandos APÓS corrigir as políticas RLS das tabelas

-- 1. Verificar buckets existentes
SELECT id, name, public FROM storage.buckets;

-- 2. Criar buckets se não existirem (execute apenas se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- INSERT INTO storage.buckets (id, name, public) VALUES ('banner', 'banner', true);
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('banner', 'banner', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true);
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('produtos', 'produtos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- INSERT INTO storage.buckets (id, name, public) VALUES ('marcas', 'marcas', true);
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('marcas', 'marcas', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

-- 3. Remover TODAS as políticas existentes de storage (IMPORTANTE!)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Remover todas as políticas de storage.objects
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- 4. Criar políticas de storage corretas

-- Políticas para bucket 'logos'
CREATE POLICY "Users can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

-- Políticas para bucket 'banner'
CREATE POLICY "Users can upload banners" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'banner' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view banners" ON storage.objects
FOR SELECT USING (bucket_id = 'banner');

-- Políticas para bucket 'produtos'
CREATE POLICY "Users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'produtos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'produtos');

-- Políticas para bucket 'marcas'
CREATE POLICY "Users can upload brand logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'marcas' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view brand logos" ON storage.objects
FOR SELECT USING (bucket_id = 'marcas');

-- 5. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;