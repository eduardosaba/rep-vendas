'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-lg w-full">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
          Pagamento Confirmado!
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Sua assinatura foi ativada com sucesso. Agora você tem acesso total ao painel, pedidos e catálogos.
        </p>

        <Link href="/dashboard" className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
          Acessar meu Painel <ArrowRight size={20} />
        </Link>
      </div>
    </div>
  );
}