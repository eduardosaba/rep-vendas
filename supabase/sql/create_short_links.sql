-- Create short_links table for Marketing short URLs
CREATE TABLE IF NOT EXISTS public.short_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_slug TEXT UNIQUE NOT NULL,
    title TEXT,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add policy so users can only manage their own links
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own short links" ON public.short_links
    FOR ALL USING (auth.uid() = user_id);
