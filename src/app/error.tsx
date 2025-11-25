'use client'; // Erros devem ser Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui você poderia enviar o erro para um serviço de log (ex: Sentry)
    console.error('Erro capturado pelo GlobalError:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-gray-100 animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={32} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Algo deu errado!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Desculpe, encontramos um erro inesperado ao processar sua
            solicitação. Nossa equipe técnica foi notificada.
          </p>
          {/* Em desenvolvimento, pode ser útil ver a mensagem curta */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 rounded bg-red-50 p-2 text-xs font-mono text-red-800 overflow-x-auto">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 shadow-md"
          >
            <RefreshCw size={18} />
            Tentar Novamente
          </button>

          <Link
            href="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Home size={18} />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
