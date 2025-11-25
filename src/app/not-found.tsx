import Link from 'next/link';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="animate-fade-up space-y-6 max-w-md">
        {/* Ícone e Título */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <div className="absolute inset-0 rounded-full bg-indigo-100 opacity-50 animate-pulse"></div>
          <FileQuestion size={48} />
        </div>

        <div>
          <h1 className="text-6xl font-extrabold text-gray-900 tracking-tight">
            404
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">
            Página não encontrada
          </h2>
          <p className="mt-2 text-gray-500">
            A página que você está procurando não existe, foi movida ou está
            temporariamente indisponível.
          </p>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-transform hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-200"
          >
            <Home size={18} />
            Voltar ao Início
          </Link>

          {/* Este botão volta para a página anterior usando o histórico do navegador, 
              mas como não podemos usar onClick/router aqui facilmente (Server Component),
              vamos oferecer um link seguro para o Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Ir para o Dashboard
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-xs text-gray-400">
            Se você acredita que isso é um erro do sistema, entre em contato com
            o suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
