'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
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

  // Instancia o cliente
  const supabase = createClient();

  useEffect(() => {
    // DIAGNÓSTICO: Verifica se as variáveis existem no navegador
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error(
        'ERRO GRAVE: NEXT_PUBLIC_SUPABASE_URL não encontrada no navegador.'
      );
      setConnectionError(true);
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        // Aumentei o timeout para 15 segundos para evitar falsos positivos em conexões lentas
        // Timeout resolve com um objeto identificador em vez de rejeitar, para evitar
        // um erro lançado que polui o console. Tratamos o timeout abaixo.
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 15000)
        );

        const sessionPromise = supabase.auth.getSession();

        // Corrida entre obter sessão e timeout
        const result: any = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        if (result && result.timeout) {
          console.warn('Timeout ao obter sessão Supabase (15s)');
          setConnectionError(true);
          setLoading(false);
          return;
        }

        if (result?.error) throw result.error;

        if (!result?.data?.session) {
          // Sem sessão? Tenta limpar tudo e ir pro login
          await supabase.auth.signOut();
          router.replace('/login');
        } else {
          setAuthorized(true);
        }
      } catch (error) {
        console.error('Falha na conexão com Supabase:', error);
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router, supabase]);

  if (connectionError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Erro de Conexão
          </h2>

          {/* CORREÇÃO DE HTML: Trocamos <p> por <div> para permitir a lista interna */}
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">Conectando ao banco de dados...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
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
    </div>
  );
}
