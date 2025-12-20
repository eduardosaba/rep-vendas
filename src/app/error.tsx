'use client'; // Componentes de erro precisam ser Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log do erro no console (ou serviço de monitoramento como Sentry)
    console.error('Erro capturado pelo App:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <Logo useSystemLogo={true} className="h-12 w-auto" />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Algo deu errado!
          </h2>

          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Encontramos um erro inesperado ao processar sua solicitação. Nossa
            equipe técnica já foi notificada.
          </p>

          {/* Detalhes técnicos (opcional, bom para dev) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-3 bg-red-50 rounded-lg text-left overflow-x-auto">
              <p className="text-xs text-red-800 font-mono break-all">
                {error.message || 'Erro desconhecido'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="rv-btn-primary flex items-center justify-center w-full px-4 py-3 text-sm font-bold rounded-xl transition-colors shadow-sm gap-2"
            >
              <RefreshCcw size={18} />
              Tentar Novamente
            </button>

            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-2"
            >
              <ArrowLeft size={18} />
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
