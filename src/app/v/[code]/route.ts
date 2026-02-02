import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> } // Params como Promise para Next.js 15+
) {
  try {
    // 1. Extrair o código de forma segura
    const { code: rawCode } = await params;
    const code = (rawCode || '').toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 });
    }

    const supabase = await createRouteSupabase();

    // 2. Buscar o link original
    const { data: found } = await supabase
      .from('short_links')
      .select('id, code, destination_url, clicks_count')
      .eq('code', code)
      .maybeSingle();

    if (!found) {
      // Em vez de JSON, você pode redirecionar para uma página 404 customizada
      return NextResponse.json(
        { error: 'Link não encontrado' },
        { status: 404 }
      );
    }

    // 3. Tarefas em segundo plano (não travam o redirecionamento)
    // Incrementar contador e registrar log de acesso
    const incrementAndLog = async () => {
      try {
        const ua = req.headers.get('user-agent');
        const ref = req.headers.get('referer');

        await Promise.allSettled([
          supabase
            .from('short_links')
            .update({ clicks_count: (found.clicks_count || 0) + 1 })
            .eq('id', found.id),
          supabase.from('short_link_clicks').insert({
            short_link_id: found.id,
            user_agent: ua,
            referrer: ref,
          }),
        ]);
      } catch (e) {
        console.error('Erro ao registrar métricas:', e);
      }
    };

    // Dispara as métricas sem esperar o resultado para o redirecionamento ser instantâneo
    incrementAndLog();

    // 4. Redirecionamento
    const destination = found.destination_url || '/';

    // Construímos um objeto URL para suportar URLs absolutas e relativas
    const urlObj = destination.startsWith('http')
      ? new URL(destination)
      : new URL(destination, req.url);

    return NextResponse.redirect(urlObj, 302);
  } catch (err: any) {
    console.error('Erro crítico na rota de link curto:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
