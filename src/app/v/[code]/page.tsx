import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = params;
  const supabase = await createClient();

  try {
    const { data } = await supabase
      .from('short_links')
      .select('id, destination_url, image_url, title, catalog_id')
      .eq('code', code)
      .maybeSingle();

    if (!data) return { title: 'Loja não encontrada' };

    let title = data.title || 'Catálogo';
    let description = 'Confira nosso catálogo digital.';
    let image = data.image_url || undefined;

    if (data.catalog_id && !image) {
      const { data: pc } = await supabase
        .from('public_catalogs')
        .select(
          'store_name, footer_message, share_banner_url, og_image_url, logo_url'
        )
        .eq('id', data.catalog_id)
        .maybeSingle();
      if (pc) {
        title = title || pc.store_name;
        description = pc.footer_message || description;
        image =
          image ||
          pc.share_banner_url ||
          pc.og_image_url ||
          pc.logo_url ||
          undefined;
      }
    }

    const og: any = { title, description };
    if (image) og.images = [image];
    return og;
  } catch (e) {
    return { title: 'Loja não encontrada' };
  }
}

export default async function ShortLinkPage({ params }: Props) {
  const { code } = params;
  const supabase = await createClient();

  // Fetch the short link to read destination and increment click counter
  const { data } = await supabase
    .from('short_links')
    .select('id, destination_url')
    .eq('code', code)
    .maybeSingle();

  if (!data) {
    // Render a minimal not-found page (metadata handled above)
    return (
      <html>
        <body>
          <main>
            <h1>Loja não encontrada</h1>
            <p>O link está inválido ou expirou.</p>
          </main>
        </body>
      </html>
    );
  }

  // Attempt to log the click (non-fatal)
  try {
    await supabase.rpc('log_short_link_click', { p_short_link_id: data.id });
  } catch (e) {
    // ignore logging errors
  }

  // Render a page with OG meta tags (from generateMetadata) and a client-side redirect
  const destination = data.destination_url;

  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`0;url=${destination}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(destination)})`,
          }}
        />
      </head>
      <body>
        <p>
          Redirecionando&hellip; <a href={destination}>{destination}</a>
        </p>
      </body>
    </html>
  );
}
