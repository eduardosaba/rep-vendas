import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const logoUrl =
    'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl max-w-lg w-full border border-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600 ring-1 ring-amber-50">
            <AlertTriangle size={36} />
          </div>

          <img src={logoUrl} alt="RepVendas" className="h-10 mb-4" />

          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            Página não encontrada
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-[36rem]">
            Ops — o endereço que você tentou acessar não existe ou foi movido.
            Verifique a URL ou volte para a área principal do sistema.
          </p>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow"
            >
              <Home size={18} /> Voltar ao Início
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Ir ao Catálogo Público
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-400">
        RepVendas SaaS &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
