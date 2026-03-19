'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Package, ArrowRight, CheckCircle2, LayoutDashboard, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const completeOnboarding = useCallback(async (targetPath: string) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }
    } catch (e) {
      // ignore — não bloqueia a navegação
    } finally {
      setLoading(false);
      router.push(targetPath);
    }
  }, [router, supabase]);

  const goToBrandSetup = useCallback(() => {
    router.push('/dashboard/settings');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1b2c] p-4 md:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Banner Superior Decorativo */}
        <div className="h-3 bg-[#b9722e]" />
        
        <div className="p-8 md:p-12">
          <div className="flex justify-center mb-8">
            <Logo useSystemLogo={true} className="h-12" />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-[#0d1b2c] dark:text-white mb-3 tracking-tight">
              Bem-vindo ao RepVendas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Obrigado por escolher nossa plataforma! Vamos deixar seu catálogo com a cara da sua marca em poucos minutos.
            </p>
          </div>

          <div className="grid gap-4 mb-10">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-[#b9722e]">
                <Settings size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Personalize sua Identidade</p>
                <p className="text-xs text-slate-500">Adicione sua logomarca, cores e dados do representante.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600">
                <Package size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Cadastre seus Produtos</p>
                <p className="text-xs text-slate-500">Importe via Excel ou crie manualmente seus primeiros itens.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={goToBrandSetup}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#b9722e] hover:bg-[#9a5e24] text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Configurar Marca <ArrowRight size={18} /></>}
            </button>
            <button
              onClick={() => completeOnboarding('/dashboard')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all"
            >
              <LayoutDashboard size={18} /> Acessar Painel
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-8 uppercase font-black tracking-widest flex items-center justify-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" /> Teste Grátis Ativado
          </p>
        </div>
      </div>
    </div>
  );
}