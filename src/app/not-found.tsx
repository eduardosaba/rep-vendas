import Link from 'next/link';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import Logo from '@/components/Logo'; // Assumindo que o componente Logo existe

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Identidade da Marca */}
        <div className="flex justify-center">
          <Logo useSystemLogo={true} className="h-12 w-auto" />
        </div>

        {/* Card de Erro */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileQuestion className="h-8 w-8 rv-text-primary" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Página não encontrada
          </h2>

          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Ops! A página que você está procurando parece ter sido movida,
            excluída ou o link está incorreto.
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="rv-btn-primary flex items-center justify-center w-full px-4 py-3 text-sm font-bold rounded-xl transition-colors shadow-sm gap-2"
            >
              <Home size={18} />
              Ir para o Dashboard
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors gap-2"
            >
              <ArrowLeft size={18} />
              Voltar ao Início
            </Link>
          </div>
        </div>

        {/* Rodapé Discreto */}
        <p className="text-xs text-gray-400">
          RepVendas System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
