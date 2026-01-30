import { createClient } from '@/lib/supabase/server';
import MarketingClient from '@/components/dashboard/MarketingClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, slug, share_banner_url, main_brand')
    .eq('id', user.id)
    .maybeSingle();
  // Garante que a imagem tenha uma URL pública válida caso seja um path do Storage
  let fullImageUrl = profile?.share_banner_url || null;
  try {
    if (fullImageUrl && !fullImageUrl.startsWith('http')) {
      const { data: pub } = supabase.storage
        .from('product-images')
        .getPublicUrl(fullImageUrl.replace(/^\/+/, ''));
      if (pub?.publicUrl) {
        // adiciona cache-buster para forçar refresh quando necessário
        const sep = pub.publicUrl.includes('?') ? '&' : '?';
        fullImageUrl = `${pub.publicUrl}${sep}v=${Date.now()}`;
      }
    }
  } catch (e) {
    // se falhar, mantemos o valor original (não quebrar a página)
    console.error('[marketing/page] error building public url', e);
  }

  const enrichedProfile = {
    ...(profile || {}),
    share_banner_url: fullImageUrl,
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Ferramentas de Venda
        </h1>
        <p className="text-slate-500 font-medium">
          Configure como seu catálogo aparece no WhatsApp e redes sociais.
        </p>
      </header>

      <MarketingClient initialData={enrichedProfile} userId={user.id} />
    </div>
  );
}
