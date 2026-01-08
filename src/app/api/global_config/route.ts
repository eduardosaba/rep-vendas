import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Tentamos ler a tabela `global_configs` se existir
    const { data, error } = await supabase
      .from('global_configs')
      .select('font_family, font_url, allow_custom_fonts')
      .maybeSingle();

    if (error) {
      console.warn('global_config read error:', error.message || error);
    }

    const payload = {
      font_family: data?.font_family ?? null,
      font_url: data?.font_url ?? null,
      allow_custom_fonts:
        typeof data?.allow_custom_fonts === 'boolean'
          ? data.allow_custom_fonts
          : true,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Error in /api/global_config:', err);
    return NextResponse.json({ font_family: null, allow_custom_fonts: true });
  }
}
