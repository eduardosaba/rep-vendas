'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

export default function DashboardDemo() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function authenticateDemoUser() {
      try {
        const supabase = createClient();

        // Verifica se já existe um usuário logado
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Faz login automático na conta oficial de testes
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: 'teste@repvendas.com.br',
            password: 'teste123',
          });

          if (signInError) {
            console.error('Erro na autenticação do painel demo:', signInError);
            if (mounted) {
              setError(
                'Não foi possível entrar no painel demo automaticamente. Tente fazer login manualmente.'
              );
            }
            return;
          }
        }

        if (mounted) {
          router.replace('/dashboard');
          router.refresh();
        }
      } catch (err: any) {
        console.error('Erro ao acessar painel demo:', err);
        if (mounted) {
          setError('Ocorreu um erro ao carregar o painel demo.');
        }
      }
    }

    authenticateDemoUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d1b2c] flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center">
        <img
          src={SYSTEM_LOGO_URL}
          alt="RepVendas"
          className="h-12 w-auto mx-auto mb-6 object-contain"
        />

        {!error ? (
          <div className="space-y-4 py-4">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#b9722e]" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Acessando Painel Demo Oficial
            </h2>
            <p className="text-sm text-gray-300 font-light">
              Entrando na conta de demonstração com catálogo e dados reais...
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b9722e]/20 text-[#b9722e] text-xs font-semibold mt-2">
              <ShieldCheck size={14} /> Autenticando teste@repvendas.com.br
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold text-white">Falha na Autenticação</h2>
            <p className="text-sm text-gray-300">{error}</p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-3 bg-[#b9722e] text-white font-bold rounded-xl hover:bg-[#a06025] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Ir para Login <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

