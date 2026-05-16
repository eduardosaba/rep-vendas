'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Lock, CreditCard, Loader2, LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { gerarLinkPagamento } from '@/app/dashboard/fatura/actions';

export default function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    // Busca Perfil (com plan_id) e Assinatura em paralelo para performance
    const [profileRes, subRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, plan_id').eq('id', user.id).maybeSingle(),
      supabase.from('subscriptions').select('current_period_end, status, plan_id').eq('user_id', user.id).maybeSingle()
    ]);

    if (profileRes.data) setUserData(profileRes.data);

    // Se não tiver assinatura (novo usuário), deixa passar ou define regra de bloqueio
    if (!subRes.data || !subRes.data.current_period_end) {
      setLoading(false);
      return;
    }

    const expiryDate = parseISO(subRes.data.current_period_end);
    const today = new Date();
    const diff = differenceInDays(today, expiryDate);

    // REGRA 1: BLOQUEIO TOTAL (Venceu há mais de 5 dias)
    if (diff > 5 || subRes.data.status === 'blocked') {
      setIsBlocked(true);
    }
    // REGRA 2: PERÍODO DE GRAÇA (Venceu, mas está nos 5 dias de tolerância)
    else if (diff > 0) {
      setDaysOverdue(diff);
      toast.error('Assinatura Vencida!', {
        description: `Seu plano venceu há ${diff} dias. O acesso será bloqueado em breve.`,
        duration: 8000,
        icon: <AlertTriangle className="text-red-500" />,
      });
    }
    // REGRA 3: AVISO PRÉVIO (Vai vencer nos próximos 5 dias)
    else if (diff >= -5) {
      toast.warning('Renovação Próxima', {
        description: `Sua assinatura vence dia ${format(expiryDate, "dd 'de' MMMM", { locale: ptBR })}.`,
        duration: 5000,
      });
    }

    setLoading(false);
  };

  const handleAutoPayment = async () => {
    if (!userData) {
      toast.error("Erro ao carregar dados do usuário.");
      return;
    }

    setIsRedirecting(true);
    try {
      const checkoutUrl = await gerarLinkPagamento({
        id: userData.id,
        name: userData.full_name || 'Assinante RepVendas',
        email: userData.email,
        plan_id: userData.plan_id // Passa o plan_id para a action buscar o preço correto
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error("Link não gerado");
      }
    } catch (error) {
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
      setIsRedirecting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    void checkSubscription();
  }, []);

  // TELA DE BLOQUEIO TOTAL
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-red-100 dark:border-red-900/20 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 shadow-inner">
            <Lock size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
            Acesso Suspenso
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Sua assinatura expirou e o período de tolerância terminou. 
            Para continuar acessando seus dados, ative seu plano agora.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleAutoPayment}
              disabled={isRedirecting}
              className="w-full py-7 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-70"
            >
              {isRedirecting ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <Zap size={20} className="fill-white" />
                  Ativar Agora
                </>
              )}
            </Button>

            <button
              onClick={handleLogout}
              className="w-full py-3 text-slate-400 hover:text-red-500 font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Sair da conta
            </button>
          </div>

          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Pagamento Seguro • InfinitePay
          </p>
        </div>
      </div>
    );
  }

  if (loading) return null;

  return (
    <>
      {/* Barra de aviso de período de graça (Tolerância) */}
      {daysOverdue > 0 && (
        <div className="bg-red-600 text-white text-[10px] md:text-xs font-black text-center py-2 px-4 fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 shadow-lg">
          <AlertTriangle size={14} />
          SUA ASSINATURA VENCEU HÁ {daysOverdue} DIAS. O SISTEMA SERÁ BLOQUEADO EM BREVE.
          <button 
            onClick={handleAutoPayment}
            className="ml-2 bg-white text-red-600 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            PAGAR AGORA
          </button>
        </div>
      )}
      <div className={daysOverdue > 0 ? "mt-8" : ""}>
        {children}
      </div>
    </>
  );
}