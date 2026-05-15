'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle2, FileText, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

// Componente Interno para lidar com os parâmetros
function SucessoContent() {
    const searchParams = useSearchParams();
    const receiptUrl = searchParams?.get('receipt_url');
    return (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-lg w-full">
            <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-20" />
                <div className="relative w-20 h-20 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={48} />
                </div>
            </div>

            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                Pagamento Aprovado! <Sparkles className="text-amber-400" size={24} />
            </h1>

            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Sua conta <span className="font-bold text-primary italic text-lg">Pro</span> foi ativada com sucesso.
                O sistema já liberou todos os seus recursos.
            </p>

            <div className="flex flex-col gap-3">
                <Link
                    href="/dashboard"
                    className="bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                >
                    Acessar meu Dashboard <ArrowRight size={22} />
                </Link>

                {receiptUrl && (
                    <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-slate-400 text-sm hover:text-primary transition-colors py-2"                    >
                        <FileText size={16} /> Ver Comprovante Oficial
                    </a>
                )}
            </div>

            <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Transação Segura via InfinitePay
            </p>
        </div>
    );
}

// Componente Principal com Suspense
export default function SucessoPage() {
    return (
        <div className="min-h-[85vh] flex items-center justify-center p-6 bg-slate-50/50 dark:bg-transparent">
            <Suspense fallback={<div className="animate-pulse text-slate-400">Carregando confirmação...</div>}>
                <SucessoContent />
            </Suspense>
        </div>
    );
}