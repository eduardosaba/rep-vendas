-- Garante que a política de UPDATE existe para a tabela products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Users can update their own products'
    ) THEN
        CREATE POLICY "Users can update their own products"
        ON public.products
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
