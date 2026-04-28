'use client';

import { Sidebar } from '@/components/Sidebar';
import WelcomePopup from '@/components/WelcomePopup';
import BlockedAccountPopup from '@/components/dashboard/BlockedAccountPopup';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { useWelcomeManager } from '@/hooks/useWelcomeManager';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Estado centralizado do Sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Welcome manager hook must be called unconditionally to preserve hooks order
  const {
    shouldShow,
    loading: welcomeLoading,
    markAsSeen,
    updateData,
  } = useWelcomeManager();

  useEffect(() => {
    let mounted = true;

    // Ajuste inicial baseado na largura da tela
    if (typeof window !== 'undefined') {
      setIsSidebarCollapsed(window.innerWidth < 1024);
    }

    const checkSession = async () => {
      // Tentativa com retries para evitar falso positivo quando uma sessão
      // antiga está presa no cliente (ex: logout incompleto, SW cache).
      const maxAttempts = 3;
      let resolved = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const supabase = await createClient();
          const { data: userData, error } = await supabase.auth.getUser();
          if (!mounted) return;
          if (error) throw error;
          if (!userData?.user) {
            resolved = true;
            router.replace('/login');
          } else {
            resolved = true;
            setAuthorized(true);
          }
          break; // sucesso
        } catch (error) {
          console.error(
            `[dashboard/layout] checkSession attempt ${attempt} failed`,
            error
          );
          if (attempt === maxAttempts) {
            resolved = true;
            if (mounted) setConnectionError(true);
          } else {
            // aguarda um pouco antes de tentar novamente
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await new Promise((res) => setTimeout(res, 500 * attempt));
          }
        }
      }

      if (resolved && mounted) setLoading(false);
    };

    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  const [showBlockedPopup, setShowBlockedPopup] = useState(false);

  useEffect(() => {
    if (!authorized) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/profile/status');
        if (!mounted) return;
        if (!res.ok) return;
        const j = await res.json();
        const profile = j?.profile || null;
        if (profile) {
          const status = profile.status || null;
          const trialEnds = profile.trial_ends_at
            ? new Date(profile.trial_ends_at)
            : null;
          const now = new Date();
          const isTrialExpired = trialEnds ? now > trialEnds : false;
          if (status === 'blocked' || (status === 'trial' && isTrialExpired)) {
            setShowBlockedPopup(true);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
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
        {/* Sidebar recebe o estado e a função de alteração */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <div className="flex-1 flex flex-col h-full min-w-0 relative">
          <DashboardHeader
            onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
            <div className="max-w-7xl mx-auto pb-20">
              {/* Impersonation banner (client-side check) */}
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

          {/* Overlay para fechar no mobile ao clicar fora */}
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
