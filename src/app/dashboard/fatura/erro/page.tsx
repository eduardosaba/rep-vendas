'use client';

import { XCircle, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentErrorPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-red-100 dark:border-red-900/20 text-center max-w-lg w-full">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={48} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Ops! Algo deu errado.
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Não conseguimos processar seu pagamento. Se o valor foi debitado, entre em contato com nosso suporte.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/dashboard/fatura" className="font-bold text-primary hover:underline">
            Tentar novamente
          </Link>
          <a href="https://wa.me/5575981272323" className="flex items-center justify-center gap-2 text-slate-500">
            <MessageCircle size={18} /> Falar com suporte
          </a>
        </div>
      </div>
    </div>
  );
}