'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Lock, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

export default function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Sem usuário no cliente: redireciona para login e garante que não ficamos em loading
      setLoading(false);
      router.push('/login');
      return;
    }

    // Busca a assinatura - com resiliência .maybeSingle()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('current_period_end, status')
      .eq('user_id', user.id)
      .maybeSingle();

    // Se não tiver assinatura (usuário novo), vamos assumir teste grátis ou bloquear
    // Aqui estou assumindo que se não tem registro, deixa passar (modo dev)
    // Para produção, você pode mudar para bloquear.
    if (!sub || !sub.current_period_end) {
      setLoading(false);
      return;
    }

    const expiryDate = parseISO(sub.current_period_end);
    const today = new Date();

    // Calcula diferença em dias
    // Se diff > 0: Já venceu há X dias
    // Se diff < 0: Ainda faltam X dias para vencer
    const diff = differenceInDays(today, expiryDate);

    // REGRA 1: BLOQUEIO TOTAL (Venceu há mais de 5 dias)
    if (diff > 5) {
      setIsBlocked(true);
    }
    // REGRA 2: PERÍODO DE GRAÇA (Venceu, mas está nos 5 dias de tolerância)
    else if (diff > 0) {
      toast.error('Assinatura Vencida!', {
        description: `Seu plano venceu há ${diff} dias. O acesso será bloqueado em breve. Regularize agora.`,
        duration: 10000, // Fica 10 segundos na tela
        icon: <AlertTriangle className="text-red-500" />,
        action: {
          label: 'Pagar',
          onClick: () => console.log('Redirecionar para pagamento'), // router.push('/billing')
        },
      });
      setDaysOverdue(diff);
    }
    // REGRA 3: AVISO PRÉVIO (Vai vencer nos próximos 5 dias)
    else if (diff >= -5) {
      // Ex: -2 (faltam 2 dias)
      toast.warning('Renovação Próxima', {
        description: `Sua assinatura vence dia ${format(expiryDate, 'dd/MM')}.`,
        duration: 5000,
      });
    }

    setLoading(false);
  };

  // TELA DE BLOQUEIO
  if (isBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900/30">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50 mb-2">
            Acesso Suspenso
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            Sua assinatura expirou há mais de 5 dias. Para continuar usando o
            catálogo e o dashboard, por favor renove seu plano.
          </p>

          <Button
            onClick={() => {
              toast.info('Redirecionamento', {
                description: 'Redirecionando para o link de pagamento...',
              });
            }}
            variant="primary"
            className="w-full py-3 flex items-center justify-center gap-2"
          >
            <CreditCard size={20} />
            Renovar Assinatura Agora
          </Button>

          <button
            onClick={() => router.push('/login')}
            className="mt-4 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 underline"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  // Se estiver carregando, mostra nada ou um spinner rápido
  if (loading) return null;

  // Se estiver tudo ok (ou no período de graça), mostra o sistema normal
  // Mas se estiver no período de graça, adicionamos uma barra fixa no topo
  return (
    <>
      {daysOverdue > 0 && (
        <div className="bg-red-600 text-white text-xs font-bold text-center py-1 px-4 fixed top-0 left-0 right-0 z-[9999]">
          ⚠️ ATENÇÃO: Sua assinatura venceu há {daysOverdue} dias. O sistema
          será bloqueado em breve.
        </div>
      )}
      {children}
    </>
  );
}
