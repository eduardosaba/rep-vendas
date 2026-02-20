import { createClient } from '@/lib/supabase/server';
import MarketingClient from '@/components/dashboard/MarketingClient';
import { redirect } from 'next/navigation';
import { Megaphone } from 'lucide-react';

// OBRIGA O NEXT.JS A BUSCAR DADOS REAIS SEMPRE
export const dynamic = 'force-dynamic';

export default async function MarketingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, share_banner_url')
    .eq('id', user.id)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('settings')
    .select('catalog_slug')
    .eq('user_id', user.id)
    .maybeSingle();

  let fullImageUrl = profile?.share_banner_url || null;
  if (fullImageUrl && typeof fullImageUrl === 'string' && !fullImageUrl.startsWith('http')) {
    const { data: pub } = supabase.storage
      .from('product-images')
      .getPublicUrl(fullImageUrl.replace(/^\/+/, ''));

    if (pub?.publicUrl) {
      fullImageUrl = `${pub.publicUrl}?v=${Date.now()}`;
    }
  }

  const enrichedProfile = {
    ...profile,
    share_banner_url: fullImageUrl,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 min-h-screen pb-20">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
          Marketing & Vendas
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Ferramentas de Venda
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-2xl">
          Personalize a experiência visual do seu cliente ao receber seu link.
          Um banner atraente aumenta em até 40% a taxa de cliques.
        </p>
      </header>

      <MarketingClient
        initialData={enrichedProfile}
        userId={user.id}
        catalogSlug={settings?.catalog_slug || null}
      />
    </div>
  );
}
