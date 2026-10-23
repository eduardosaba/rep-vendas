'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Lock, Loader2, LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { gerarLinkPagamento } from '@/app/dashboard/fatura/actions';
import { resolveSubscriptionAccess } from '@/lib/auth/subscription-rules';

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
  const [blockReason, setBlockReason] = useState<string>('');

  const router = useRouter();
  const supabase = createClient();

  const checkSubscription = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const [profileRes, subRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, status, trial_ends_at, role, company_id, can_manage_catalog, is_active, created_at, plan_id')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status, price, plan_name, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (profileRes.data) setUserData(profileRes.data);

    const access = resolveSubscriptionAccess(profileRes.data, subRes.data);

    if (access.isBlocked) {
      setIsBlocked(true);
      setBlockReason(access.reason);
      setDaysOverdue(Math.abs(access.daysRemainingOrOverdue));
    } else if (access.inGracePeriod) {
      setDaysOverdue(Math.abs(access.daysRemainingOrOverdue));
      toast.error('Período de Teste Vencido!', {
        description: `Seu teste expirou há ${Math.abs(access.daysRemainingOrOverdue)} dia(s). O acesso será bloqueado em breve.`,
        duration: 8000,
        icon: <AlertTriangle className="text-red-500" />,
      });
    }

    setLoading(false);
  };

  const handleAutoPayment = async () => {
    if (!userData) {
      toast.error('Erro ao carregar dados do usuário.');
      return;
    }

    setIsRedirecting(true);
    try {
      const checkoutUrl = await gerarLinkPagamento({
        id: userData.id,
        name: userData.full_name || 'Assinante RepVendas',
        email: userData.email,
        plan_id: userData.plan_id,
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push('/dashboard/fatura');
      }
    } catch (error) {
      toast.error('Erro ao iniciar pagamento. Redirecionando para faturas...');
      router.push('/dashboard/fatura');
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

          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
            {blockReason ||
              'Sua assinatura ou período de testes expirou e a carência terminou. Para continuar acessando seus dados e catálogos, ative seu plano agora.'}
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
                  Ativar Assinatura Agora
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
      {daysOverdue > 0 && (
        <div className="bg-amber-600 text-white text-[10px] md:text-xs font-black text-center py-2 px-4 fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 shadow-lg">
          <AlertTriangle size={14} />
          SEU PERÍODO DE TESTES EXPIROU HÁ {daysOverdue} DIA(S). REGULARIZE PARA NÃO PERDER O ACESSO.
          <button
            onClick={() => router.push('/dashboard/fatura')}
            className="ml-2 bg-white text-amber-800 font-bold px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            PAGAR AGORA
          </button>
        </div>
      )}
      <div className={daysOverdue > 0 ? 'mt-8' : ''}>{children}</div>
    </>
  );
}