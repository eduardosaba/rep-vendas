'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import MobileSidebar from '@/components/MobileSidebar';
import ThemeRegistry from '@/components/ThemeRegistry';
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

  // Instancia o cliente (Isso cria um novo objeto a cada render, por isso NÃO pode ir no useEffect deps)
  const supabase = createClient();

  useEffect(() => {
    let mounted = true; // Flag para evitar atualizações em componentes desmontados

    // DIAGNÓSTICO: Verifica se as variáveis existem
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('ERRO GRAVE: NEXT_PUBLIC_SUPABASE_URL não encontrada.');
      if (mounted) {
        setConnectionError(true);
        setLoading(false);
      }
      return;
    }

    const checkSession = async () => {
      try {
        const maxAttempts = 6;
        const delayMs = 500; // total ~3s of retrying

        for (let attempt = 0; attempt < maxAttempts && mounted; attempt++) {
          try {
            const { data, error } = await supabase.auth.getSession();

            if (error) throw error;

            if (data?.session?.user) {
              setAuthorized(true);
              return;
            }

            // Se ainda não há sessão, espera um pouco antes de tentar novamente.
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          } catch (innerErr) {
            // Em caso de erro transitório, tentamos novamente até o limite
            console.warn('Tentativa de obter sessão falhou, tentando novamente', {
              attempt,
              error: innerErr,
            });
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }

        // Após tentativas, se não houver sessão, considera não autorizado.
        if (mounted && !authorized) {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Falha na conexão com Supabase:', error);
        if (mounted) setConnectionError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Cleanup: se o usuário sair da página antes do check terminar
    return () => {
      mounted = false;
    };

    // IMPORTANTE: Array de dependências vazio para rodar APENAS na montagem.
    // O supabase é removido daqui porque ele é recriado a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (connectionError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erro de Conexão
          </h2>

          <div className="text-gray-600 mb-6 text-sm">
            Não foi possível conectar ao Supabase.
            <br />
            <br />
            <strong>Verifique:</strong>
            <ul className="text-left list-disc pl-6 mt-2 space-y-1">
              <li>O projeto no Supabase está pausado?</li>
              <li>Sua internet está funcionando?</li>
              <li>
                As chaves no <code>.env.local</code> estão corretas?
              </li>
            </ul>
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono break-all">
              URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não definida'}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full transition-colors"
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
        <p className="text-sm text-gray-500">Conectando ao banco de dados...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <>
      <ThemeRegistry />
      <UpdateNotificationModal />
      <div className="flex h-screen w-full bg-gray-50 dark:bg-slate-950 overflow-hidden">
        <div className="flex-shrink-0 hidden md:block h-full">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col h-full min-w-0 relative">
          <div className="flex-shrink-0 z-20">
            <DashboardHeader />
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin relative z-0">
            <div className="max-w-7xl mx-auto pb-20">{children}</div>
          </main>
        </div>
        <MobileSidebar />
      </div>
    </>
  );
}
