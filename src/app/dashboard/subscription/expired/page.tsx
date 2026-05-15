'use client';

import { useState, useEffect } from 'react';
import { Lock, LogOut, ShieldAlert, Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { gerarLinkPagamento } from '@/app/dashboard/fatura/actions'; // Importando sua Action

export default function ExpiredPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Busca os dados do usuário para o checkout
  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
    }
    getProfile();
  }, [supabase]);

  const handleRenovar = async () => {
    if (!profile) return;
    setIsGenerating(true);
    
    const checkoutUrl = await gerarLinkPagamento({
      id: profile.id,
      name: profile.full_name || 'Assinante RepVendas',
      email: profile.email
    });

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      alert("Erro ao gerar link. Tente novamente mais tarde.");
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>

        <div className="p-10 text-center">
          <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <Lock size={40} className="text-red-600 dark:text-red-500" />
          </div>

          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
            Acesso Suspenso
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm">
            Sua licença no <span className="font-bold text-primary">RepVendas</span> expirou. 
            Renove sua assinatura agora para liberar seus pedidos e catálogo imediatamente.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleRenovar}
              disabled={isGenerating}
              className="flex items-center justify-center w-full py-4 px-4 bg-primary text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 group"
            >
              {isGenerating ? <Loader2 className="animate-spin" /> : (
                <> <Zap size={20} className="mr-2 fill-white" /> Renovar Agora </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full py-3.5 px-4 text-gray-500 dark:text-gray-400 hover:text-red-500 font-bold transition-colors"
            >
              <LogOut size={18} className="mr-2" /> Sair da conta
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <ShieldAlert size={14} /> Seus dados estão salvos e seguros
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}