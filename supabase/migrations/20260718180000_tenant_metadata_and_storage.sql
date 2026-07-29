-- 1. Adicionar campo expansível JSONB em companies e organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Criar o bucket público para assets de branding (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'brand_assets',
    'brand_assets',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Políticas de Storage
-- Leitura pública de assets
DROP POLICY IF EXISTS "Public can view brand assets" ON storage.objects;
CREATE POLICY "Public can view brand assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand_assets');

-- Inserção de assets restrita a administradores do tenant (Master ou Admin)
DROP POLICY IF EXISTS "Admins can upload brand assets" ON storage.objects;
CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'brand_assets' AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('master', 'admin_company')
    )
);

-- Atualização restrita
DROP POLICY IF EXISTS "Admins can update brand assets" ON storage.objects;
CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'brand_assets' AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('master', 'admin_company')
    )
);

-- Exclusão restrita
DROP POLICY IF EXISTS "Admins can delete brand assets" ON storage.objects;
CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'brand_assets' AND
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('master', 'admin_company')
    )
);
