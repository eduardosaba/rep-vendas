'use client';

import { Lock, ExternalLink, LogOut, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ExpiredPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Configure aqui o número do suporte
  const WHATSAPP_NUMBER = '5575999999999'; // Substitua pelo seu número real
  const WHATSAPP_MSG = encodeURIComponent(
    'Olá! Minha licença no Rep-Vendas expirou e gostaria de renovar para liberar meu acesso.'
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden relative">
        {/* Barra de Status no Topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>

        <div className="p-8 text-center">
          {/* Ícone de Bloqueio */}
          <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-red-50/50 dark:ring-red-900/10">
            <Lock size={40} className="text-red-600 dark:text-red-500" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Acesso Suspenso
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm">
            Sua licença de uso expirou. Para continuar gerenciando seus pedidos,
            clientes e catálogo, renove sua assinatura agora mesmo.
          </p>

          <div className="space-y-4">
            {/* Botão de Renovação (Destaque) */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 active:scale-95 group"
            >
              Renovar pelo WhatsApp
              <ExternalLink
                size={18}
                className="ml-2 group-hover:translate-x-1 transition-transform"
              />
            </a>

            {/* Botão de Sair */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full py-3.5 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              Sair da conta
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
              <ShieldAlert size={14} />
              Seus dados estão salvos e seguros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
