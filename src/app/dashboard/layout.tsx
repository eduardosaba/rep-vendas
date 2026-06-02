'use client';

import { Sidebar } from '@/components/Sidebar';
import WelcomePopup from '@/components/WelcomePopup';
import BlockedAccountPopup from '@/components/dashboard/BlockedAccountPopup';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useWelcomeManager } from '@/hooks/useWelcomeManager';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // No mobile é melhor iniciar recolhido para evitar overlay cobrindo a tela no iOS.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const {
    shouldShow,
    loading: welcomeLoading,
    markAsSeen,
    updateData,
  } = useWelcomeManager();

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        // Pequeno delay para evitar flicker durante hidratação.
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

  const [showBlockedPopup, setShowBlockedPopup] = useState(false);

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

        if (!profile) return;

        const status = profile.status || null;

        const trialEnds = profile.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : null;

        const now = new Date();
        const isTrialExpired = trialEnds ? now > trialEnds : false;

        if (status === 'blocked' || (status === 'trial' && isTrialExpired)) {
          setShowBlockedPopup(true);
        }
      } catch (error) {
        console.warn('[dashboard/layout] Falha ao checar status:', error);
      }
    };

    checkProfileStatus();

    return () => {
      mounted = false;
    };
  }, [authorized]);

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

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-950">
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <div className="flex-1 flex flex-col h-full min-w-0 relative">
          <DashboardHeader
            onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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

              {showBlockedPopup && (
                <BlockedAccountPopup
                  onClose={() => setShowBlockedPopup(false)}
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
  );
}
