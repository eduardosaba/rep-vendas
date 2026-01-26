'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function DiagnosticPanel() {
  const [stats, setStats] = useState<any>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBatchMsg, setCurrentBatchMsg] = useState('');

  const loadDiagnostics = async () => {
    try {
      const res = await fetch('/api/products/image-diagnostics');
      const data = await res.json();
      setStats(data);
      return data;
    } catch (err) {
      console.error('Falha ao carregar diagnóstico', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRepair = async (isAuto = false) => {
    setIsRepairing(true);
    if (!isAuto) setCurrentBatchMsg('Iniciando reparo automático...');

    try {
      const res = await fetch('/api/products/image-repair', { method: 'POST' });
      const data = await res.json();

      const updatedStats = await loadDiagnostics();

      if (data.fail_count > 0) {
        setIsRepairing(false);
        setCurrentBatchMsg('');
        toast.error(
          `O loop parou: ${data.fail_count} imagem(ns) falharam no último lote. Verifique links quebrados.`,
          {
            duration: 5000,
          }
        );
        return;
      }

      if (data.success_count > 0 && updatedStats.total_external > 0) {
        setCurrentBatchMsg(
          `Sucesso! Processando próximo lote (${updatedStats.total_external} restantes)...`
        );
        setTimeout(() => {
          handleRepair(true);
        }, 2000);
      } else {
        setIsRepairing(false);
        setCurrentBatchMsg('');
        if (updatedStats.total_external === 0) {
          toast.success(
            'Fantástico! Todas as imagens foram internalizadas com sucesso.'
          );
        }
      }
    } catch (err) {
      setIsRepairing(false);
      setCurrentBatchMsg('');
      toast.error('Erro crítico na conexão. O processo foi interrompido.');
    }
  };

  if (loading)
    return (
      <div className="h-20 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );

  const total = (stats?.total_internal || 0) + (stats?.total_external || 0);
  const progress =
    total > 0 ? Math.round((stats.total_internal / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">
            Integridade de Mídia
          </h3>
          <p className="text-[10px] text-slate-500 font-medium">
            Internalização de links externos para o Supabase Storage
          </p>
        </div>
        <span
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${stats?.total_external === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}
        >
          {stats?.total_external === 0 ? '100% Protegido' : 'Reparo Necessário'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
            No Storage
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {stats?.total_internal || 0}
          </p>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
            Links Externos
          </p>
          <p className="text-3xl font-black text-amber-500">
            {stats?.total_external || 0}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between text-[11px] font-black uppercase text-slate-400 tracking-widest">
          <span>Saúde do Catálogo</span>
          <span className="text-indigo-600">{progress}%</span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {stats?.total_external > 0 ? (
        <div className="space-y-4">
          <button
            onClick={() => handleRepair(false)}
            disabled={isRepairing}
            className="w-full group relative flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
          >
            {isRepairing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Play size={18} className="fill-current" />
                <span>Iniciar Reparo Automático</span>
              </>
            )}
          </button>

          {isRepairing && (
            <div className="flex items-center justify-center gap-2 text-indigo-600 animate-pulse">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {currentBatchMsg}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 py-5 bg-emerald-50 text-emerald-600 rounded-[1.5rem] border border-emerald-100 font-black text-[11px] uppercase tracking-[0.2em]">
          <CheckCircle2 size={20} />
          Blindagem de Mídia Ativa
        </div>
      )}

      {stats?.total_external > 0 && !isRepairing && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={16} />
          <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium leading-relaxed">
            O sistema tentará baixar as fotos externas automaticamente em lotes
            de 20. Se um link estiver quebrado, o processo parará para sua
            segurança.
          </p>
        </div>
      )}
    </div>
  );
}
