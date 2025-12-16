import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Página não encontrada
        </h2>
        <p className="text-gray-500 mb-8">
          Ops! O endereço que você digitou não existe ou foi movido.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
        >
          <Home size={18} />
          Voltar ao Início
        </Link>
      </div>
      <div className="mt-8 text-xs text-gray-400">
        RepVendas SaaS &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
