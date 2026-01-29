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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Ferramentas de Venda
        </h1>
        <p className="text-slate-500 font-medium">
          Configure como seu catálogo aparece no WhatsApp e redes sociais.
        </p>
      </header>

      <MarketingClient initialData={profile} userId={user.id} />
    </div>
  );
}
