'use client';

import { AlertTriangle, Lock, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ExpiredPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border-t-4 border-red-500">
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} className="text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acesso Suspenso
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          A sua licença de uso expirou ou a conta foi suspensa temporariamente.
          Para continuar a usar o sistema e acessar seus pedidos, é necessário
          renovar sua assinatura.
        </p>

        <div className="space-y-3">
          <a
            href="https://wa.me/55SEUNUMERO?text=Ola,%20minha%20licenca%20venceu,%20gostaria%20de%20renovar."
            target="_blank"
            rel="noreferrer"
            className="rv-btn-primary flex items-center justify-center w-full py-3 px-4 rounded-xl font-bold transition-colors shadow-md"
          >
            Renovar via WhatsApp <ExternalLink size={18} className="ml-2" />
          </a>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors"
          >
            Sair da conta
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Se acredita que isto é um erro, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
