'use client';

import { Sidebar } from '@/components/Sidebar';
import WelcomePopup from '@/components/WelcomePopup';
import BlockedAccountPopup from '@/components/dashboard/BlockedAccountPopup';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useWelcomeManager } from '@/hooks/useWelcomeManager';
import { AlertTriangle, Clock, CreditCard, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OrganizationProvider } from '@/modules/organization-context/OrganizationProvider';
import Link from 'next/link';

interface AccessState {
  status: string;
  isAllowed: boolean;
  isBlocked: boolean;
  inGracePeriod: boolean;
  daysRemainingOrOverdue: number;
  reason: string;
  expiryDate: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // No desktop inicia expandida (false) por padrão, no mobile inicia colapsada (true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1024;
    }
    return false;
  });

  const handleSetSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(collapsed));
    }
  };
  const pathname = usePathname();
  const router = useRouter();

  const {
    shouldShow,
    loading: welcomeLoading,
    markAsSeen,
    updateData,
  } = useWelcomeManager();

  const [accessState, setAccessState] = useState<AccessState | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));

        if (!mounted) return;

        setAuthorized(true);
        setLoading(false);
      } catch (error) {
        console.error('[dashboard/layout] Erro na inicialização:', error);

        if (mounted) {
          setConnectionError(true);
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authorized) return;

    let mounted = true;

    const checkProfileStatus = async () => {
      try {
        const res = await fetch('/api/profile/status', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (!mounted) return;

        if (!res.ok) {
          console.warn(
            '[dashboard/layout] /api/profile/status retornou:',
            res.status
          );
          return;
        }

        const json = await res.json();
        const profile = json?.profile || null;
        const access = json?.access || null;

        if (access) {
          setAccessState(access);
        }

        if (!profile) return;

        const COMPANY_CATALOG_RESTRICTED_PREFIXES = [
          '/dashboard/products',
          '/dashboard/categories',
          '/dashboard/brands',
          '/dashboard/marketing',
          '/dashboard/settings/sync',
        ];

        const isCompanyMember = Boolean(profile.company_id);
        const role = String(profile.role || '');
        const canManageCatalog = Boolean(profile.can_manage_catalog);

        const isCompanyAdminRole =
          role === 'admin_company' ||
          role === 'master' ||
          ((role === 'representative' || role === 'rep') && isCompanyMember);

        const isCatalogRestrictedRoute =
          COMPANY_CATALOG_RESTRICTED_PREFIXES.some((prefix) =>
            pathname?.startsWith(prefix)
          );

        if (
          isCompanyMember &&
          !isCompanyAdminRole &&
          !canManageCatalog &&
          isCatalogRestrictedRoute
        ) {
          router.replace('/admin/unauthorized');
        }
      } catch (error) {
        console.warn('[dashboard/layout] Falha ao checar status:', error);
      }
    };

    checkProfileStatus();

    return () => {
      mounted = false;
    };
  }, [authorized, pathname]);

  if (connectionError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erro de Conexão
          </h2>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded w-full"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-gray-500">Carregando painel...</p>
      </div>
    );
  }

  if (!authorized) return null;

  // Se a rota for de pagamento (/dashboard/fatura), permite acesso mesmo se bloqueado para possibilitar regularização
  const isFaturaRoute = pathname?.startsWith('/dashboard/fatura');
  const isHardBlocked = accessState?.isBlocked && !isFaturaRoute;
  const inGracePeriod = accessState?.inGracePeriod && !isHardBlocked;
  
  // Alerta de proximidade de vencimento (5 dias ou menos restantes)
  const daysRemaining = accessState?.daysRemainingOrOverdue ?? 999;
  const isNearExpiry =
    !isHardBlocked &&
    !inGracePeriod &&
    accessState?.isAllowed &&
    daysRemaining <= 5 &&
    daysRemaining > 0;

  return (
    <OrganizationProvider>
      <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950">
        {/* Banner 1: Próximo de Vencer (5 dias ou menos) */}
        {isNearExpiry && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white text-xs font-semibold py-2 px-4 sticky top-0 left-0 right-0 z-50 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
              <span className="flex items-center gap-2">
                <Clock size={16} className="text-amber-200 shrink-0 animate-pulse" />
                <span>
                  <strong>Atenção:</strong> Seu plano expira em{' '}
                  <strong className="underline decoration-amber-300 font-black">
                    {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                  </strong>
                  . Renove agora para manter seus catálogos públicos e pedidos no ar sem interrupções.
                </span>
              </span>
              <Link
                href="/dashboard/fatura"
                className="inline-flex items-center gap-1.5 bg-white text-amber-950 px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-50 shrink-0 transition-all shadow-sm active:scale-95"
              >
                <CreditCard size={14} />
                Renovar Assinatura
              </Link>
            </div>
          </div>
        )}

        {/* Banner 2: Tolerância / Grace Period (Vencido há até 5 dias) */}
        {inGracePeriod && (
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-700 text-white text-xs font-semibold py-2.5 px-4 sticky top-0 left-0 right-0 z-50 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-red-200 shrink-0 animate-bounce" />
                <span>
                  <strong>Assinatura Vencida:</strong> Seu período expirou há{' '}
                  {Math.abs(accessState?.daysRemainingOrOverdue || 1)} dia(s) e está em período de tolerância.
                  Regularize hoje para evitar a suspensão automática dos seus catálogos.
                </span>
              </span>
              <Link
                href="/dashboard/fatura"
                className="inline-flex items-center gap-1.5 bg-white text-red-950 px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 shrink-0 transition-all shadow-sm active:scale-95"
              >
                <CreditCard size={14} />
                Regularizar Agora
              </Link>
            </div>
          </div>
        )}

        {/* Banner 3: Vencido / Suspenso enquanto navega na tela de fatura */}
        {isFaturaRoute && accessState?.isBlocked && (
          <div className="bg-red-700 text-white text-xs font-bold py-2.5 px-4 sticky top-0 left-0 right-0 z-50 flex items-center justify-center shadow-lg">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-200" />
              <span>
                Conta com assinatura suspensa. Escolha seu ciclo de pagamento abaixo para reativar seu catálogo e produtos imediatamente.
              </span>
            </span>
          </div>
        )}

        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={handleSetSidebarCollapsed}
          />

          <div className="flex-1 flex flex-col h-full min-w-0 relative">
            <DashboardHeader
              onMenuClick={() => handleSetSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
              <div className="max-w-7xl mx-auto pb-10">
                <div id="impersonate-banner-root" />

                {children}

                {!welcomeLoading && shouldShow && (
                  <WelcomePopup
                    version={updateData}
                    onConfirm={async () => {
                      await markAsSeen();
                    }}
                  />
                )}

                {/* Hard block popup para testes expirados além de 5 dias ou suspensões */}
                {isHardBlocked && (
                  <BlockedAccountPopup
                    hardBlock={true}
                    reason={accessState?.reason}
                    daysOverdue={Math.abs(accessState?.daysRemainingOrOverdue || 0)}
                  />
                )}
              </div>
            </main>

            {!isSidebarCollapsed && (
              <div
                className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
                onClick={() => setIsSidebarCollapsed(true)}
              />
            )}
          </div>
        </div>
      </div>
    </OrganizationProvider>
  );
}
