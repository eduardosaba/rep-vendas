'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Zap, 
  MessageCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Clock,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { gerarLinkPagamento } from './actions';

export default function FaturaPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Busca os dados do usuário logado para carimbar o pagamento
  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, plan_id')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(data);
      }
      setLoading(false);
    }
    getProfile();
  }, [supabase]);

  const handleAssinar = async () => {
    if (!profile) return;
    
    setIsGenerating(true);
    const checkoutUrl = await gerarLinkPagamento({
      id: profile.id,
      name: profile.full_name || 'Assinante RepVendas',
      email: profile.email,
      plan_id: profile.plan_id // Passa o plan_id para a action buscar o preço correto
    });

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      alert("Não conseguimos gerar o link agora. Por favor, tente pelo WhatsApp.");
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 md:p-6 animate-in fade-in zoom-in duration-500">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          
          <div className="bg-gradient-to-br from-primary/10 via-transparent to-transparent p-8 md:p-12 text-center relative">
            <div className="absolute top-6 right-6">
              <span className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Clock size={12} /> Ativação Prioritária
              </span>
            </div>

            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary text-white rounded-3xl shadow-xl shadow-primary/30 mb-6 rotate-3">
              <CreditCard size={38} />
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4">
              Assinatura <span className="text-primary">RepVendas Fundador</span>
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Libere seu acesso completo, visualize pedidos em tempo real e gerencie sua carteira de clientes sem limites.
            </p>
          </div>

          <div className="p-8 md:p-12 pt-4 flex flex-col items-center">
            <div className="w-full max-w-sm space-y-4">
              <button 
                onClick={handleAssinar}
                disabled={isGenerating}
                className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50 group"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <Zap size={24} className="group-hover:animate-bounce" /> 
                    Ativar Agora
                  </>
                )}
              </button>
              
              <a 
                href="https://wa.me/5575981272323" 
                target="_blank"
                className="flex items-center justify-center gap-2 w-full text-slate-500 dark:hover:text-slate-200 font-bold py-2 transition-colors text-sm"
              >
                <MessageCircle size={18} /> Suporte Financeiro
              </a>

              <div className="pt-6 flex flex-col items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck size={14} className="text-green-500" /> 
                  Pagamento Seguro via InfinitePay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}