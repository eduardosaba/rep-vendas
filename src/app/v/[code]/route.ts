import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function escapeHtml(str: string) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: Request, context: { params: any }) {
  try {
    const paramsObj = context.params && typeof (context.params as any).then === 'function'
      ? await (context.params as any)
      : context.params;
    const rawCode = paramsObj?.code ?? '';
    const code = String(rawCode).toUpperCase().trim();

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 });
    }

    const supabase = await createClient();

    let ogImage = 'https://www.repvendas.com.br/logo.png';
    let destinationUrl = '/';
    let pageTitle = 'Catálogo Virtual';
    let description = 'Confira nossas novidades e tendências no catálogo virtual!';

    // 1) Tenta RPC seguro para obter banner (RPC deve ser SECURITY DEFINER)
    try {
      const { data: bannerData, error: rpcErr } = await supabase.rpc('get_banner_by_code', { p_code: code } as any);
      if (!rpcErr && bannerData) {
        const item = Array.isArray(bannerData) ? bannerData[0] : bannerData;
        if (item) {
          ogImage = item.banner_url || item.image_url || ogImage;
        }
      }
    } catch (e) {
      // RPC may not exist yet; ignore and fall back
    }

    // 2) Busca dados do short_link como fallback e para destino/título
    try {
      const { data: link, error: linkErr } = await supabase
        .from('short_links')
        .select('destination_url, title, description, image_url')
        .eq('code', code)
        .maybeSingle();

      if (!linkErr && link) {
        destinationUrl = link.destination_url || destinationUrl;
        pageTitle = link.title || pageTitle;
        description = link.description || description;
        ogImage = link.image_url || ogImage;
      }
    } catch (e) {
      // ignore
    }

    const html = `<!DOCTYPE html>\n<html lang="pt-br">\n  <head>\n    <meta charset="utf-8">\n    <title>${escapeHtml(pageTitle)}</title>\n    <meta name="viewport" content="width=device-width,initial-scale=1" />\n    <meta property="og:title" content="${escapeHtml(pageTitle)}" />\n    <meta property="og:image" content="${escapeHtml(ogImage)}" />\n    <meta property="og:description" content="${escapeHtml(description)}" />\n    <meta property="og:type" content="website" />\n    <meta http-equiv="refresh" content="0;url=${escapeHtml(destinationUrl)}" />\n    <script>window.location.href = "${escapeHtml(destinationUrl)}";</script>\n    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>\n  </head>\n  <body style="background:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">\n    <div style="text-align:center;">\n      <div style="border:3px solid #4f46e5;border-top-color:transparent;border-radius:50%;width:24px;height:24px;animation:spin 1s linear infinite;margin:0 auto 12px;">\n      </div>\n      <p style="color:#64748b;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;">Carregando...</p>\n    </div>\n  </body>\n</html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('v/[code] route error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
