import { Metadata } from 'next';
import React from 'react';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: { slug: string };
}

// Gera as Meta Tags dinamicamente para o WhatsApp ler o Banner
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const slug = params.slug;

  // Busca os dados do link curto (incluindo a imagem do banner)
  const { data: link } = await supabase
    .from('short_links')
    .select('image_url, title, destination_url')
    .eq('code', slug)
    .maybeSingle();

  return {
    title: link?.title || 'Catálogo Virtual',
    description: 'Acesse nossas novidades e tendências!',
    openGraph: {
      title: link?.title || 'Catálogo Virtual',
      images: [link?.image_url || 'https://www.repvendas.com.br/logo.png'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: link?.title || 'Catálogo Virtual',
      images: [link?.image_url || 'https://www.repvendas.com.br/logo.png'],
    },
  };
}

export default function ProductRedirect({ params }: Props) {
  const slug = encodeURIComponent(params.slug || '');
  const destination = `/?open=${slug}`;

  return (
    <html lang="pt-br">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta httpEquiv="refresh" content={`0; url=${destination}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(destination)});`,
          }}
        />
      </head>
      <body className="bg-slate-50 flex items-center justify-center min-h-screen font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando catálogo...</p>
        </div>
      </body>
    </html>
  );
}
