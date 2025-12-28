-- =============================================
-- CRIAR BUCKET 'fonts' NO SUPABASE STORAGE
-- =============================================
-- Este script cria o bucket para armazenar fontes customizadas
-- Executar no SQL Editor do Supabase (ou via Dashboard > Storage)

-- 1. CRIAR BUCKET (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fonts',
  'fonts',
  true,  -- público para que o @font-face possa carregar
  5242880,  -- 5MB limit por arquivo
  ARRAY['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/x-font-ttf', 'application/x-font-opentype', 'application/font-woff', 'application/font-woff2']
)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS RLS PARA O BUCKET 'fonts'
-- Permitir leitura pública (necessário para @font-face)
CREATE POLICY "Public read access to fonts"
ON storage.objects FOR SELECT
USING (bucket_id = 'fonts');

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload fonts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fonts'
  AND auth.uid() IS NOT NULL
);

-- Permitir update/delete apenas do próprio usuário
CREATE POLICY "Users can update their own fonts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fonts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own fonts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fonts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- CONFIGURAÇÃO ADICIONAL (OPCIONAL VIA DASHBOARD)
-- =============================================
-- No Supabase Dashboard > Storage > fonts:
-- - Cache Control: max-age=31536000 (1 ano - fontes raramente mudam)
-- - CORS: permitir origens do seu domínio
