'use client';

import { useState, useEffect } from 'react';
import { generateDemoEnvironment } from './actions';
import { Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SetupDemoPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSetup() {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateDemoEnvironment();
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Wizard: Distribuidora Demo (DEV)</h1>
        <p className="text-slate-500 mt-2">
          Provisiona um ambiente de teste isolado (Tenant Alpha) com 4 usuários (Admin, Rep, Picker, Financeiro) e um catálogo básico de 10 produtos controlados.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">O que será criado:</h2>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Tenant "Distribuidora Alpha" (com settings manuais e marker `demo: true`)</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Usuário Master: <b>admin@alpha.demo</b> (company_admin)</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Representante: <b>rep@alpha.demo</b> (representative)</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Logística: <b>picker@alpha.demo</b> (picker)</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Financeiro: <b>financeiro@alpha.demo</b> (finance)</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Catálogo Base: Exatos 10 SKUs (5 armações, 5 lentes).</li>
          </ul>
        </div>

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 bg-[#b9722e] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#a06025] transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
          {loading ? 'Provisionando Ambiente...' : 'Gerar Distribuidora Alpha'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-center gap-2 mb-2 font-bold">
              {result.success ? <CheckCircle2 /> : <XCircle />}
              {result.success ? 'Ambiente gerado com sucesso!' : 'Falha na geração'}
            </div>
            
            {result.success ? (
              <div className="text-sm space-y-2 mt-4 bg-white/50 p-4 rounded border border-green-100">
                <p><b>Senha Padrão para todos:</b> password123</p>
                <div className="mt-4 pt-4 border-t border-green-200/50 flex gap-4">
                  <Link href="/login" className="text-[#b9722e] font-bold hover:underline">
                    Ir para Login &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
