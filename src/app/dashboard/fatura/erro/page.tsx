'use client';

import { XCircle, MessageCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PaymentErrorPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-slate-50/30 dark:bg-transparent">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border border-red-50 dark:border-red-900/10 text-center max-w-lg w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Efeito de brilho sutil no erro */}
          <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full blur-xl opacity-50" />
          <div className="relative w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center border border-red-100 dark:border-red-900/20">
            <XCircle size={48} />
          </div>
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
          Ops! <span className="text-red-500">Houve um erro.</span>
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
          Não conseguimos processar o seu pagamento com a InfinitePay. 
          Pode ter ocorrido um erro temporário ou os dados do cartão estão incorretos.
        </p>

        <div className="flex flex-col gap-4">
          {/* Botão de destaque para tentar novamente */}
          <Link 
            href="/dashboard/fatura" 
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            <RefreshCw size={20} /> Tentar novamente
          </Link>

          {/* Link para suporte */}
          <a 
            href="https://wa.me/5575981272323" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-slate-500 hover:text-primary font-bold py-2 transition-colors group"
          >
            <MessageCircle size={18} className="group-hover:scale-110 transition-transform" /> 
            Falar com suporte via WhatsApp
          </a>

          <Link 
            href="/dashboard" 
            className="text-slate-400 text-sm flex items-center justify-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mt-4"
          >
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </Link>
        </div>

        <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-bold border-t border-slate-50 dark:border-slate-800 pt-6">
          Pagamento Não Processado • InfinitePay
        </p>
      </div>
    </div>
  );
}