'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImpersonateBanner from '@/components/dashboard/ImpersonateBanner';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import UpdateNotificationModal from '@/components/dashboard/UpdateNotificationModal';
import { Loader2, AlertTriangle } from 'lucide-react';

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

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    // Ajuste inicial baseado na largura da tela
    if (typeof window !== 'undefined') {
      setIsSidebarCollapsed(window.innerWidth < 1024);
    }

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) throw error;
        if (!data?.session) {
          router.replace('/login');
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Erro:', error);
        if (mounted) setConnectionError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

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
      <UpdateNotificationModal />
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
