'use client';

import { TrendingDown, Zap } from 'lucide-react';

interface EconomyDashboardProps {
  originalTotal: number;
  optimizedTotal: number;
}

export function EconomyDashboard({
  originalTotal,
  optimizedTotal,
}: EconomyDashboardProps) {
  // Evita divisão por zero
  if (originalTotal === 0 || optimizedTotal === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-8 rounded-3xl text-white shadow-xl">
        <div className="text-center">
          <p className="text-slate-300 text-sm">
            Aguardando dados de métricas...
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Execute a otimização de imagens para ver estatísticas de economia.
          </p>
        </div>
      </div>
    );
  }

  const percentSaved = Math.round(
    ((originalTotal - optimizedTotal) / originalTotal) * 100
  );
  const mbSaved = ((originalTotal - optimizedTotal) / 1024).toFixed(2);
  const speedMultiplier = (originalTotal / optimizedTotal).toFixed(1);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-indigo-200" size={20} />
            <h3 className="text-indigo-100 text-xs font-bold uppercase tracking-widest">
              Economia de Dados
            </h3>
          </div>
          <p className="text-4xl font-black">{percentSaved}% mais leve</p>
        </div>
        <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
          <span className="text-2xl font-black">{mbSaved} MB</span>
          <p className="text-[10px] uppercase font-bold opacity-70">
            Banda salva
          </p>
        </div>
      </div>

      {/* Barra de Progresso Comparativa */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase">
          <span className="flex items-center gap-1">
            <Zap size={12} />
            Otimizado (WebP)
          </span>
          <span>Original (JPG/PNG)</span>
        </div>
        <div className="h-4 bg-white/10 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-400 transition-all duration-1000"
            style={{ width: `${100 - percentSaved}%` }}
          />
        </div>
        <p className="text-xs text-indigo-100 italic">
          * Isso significa que o catálogo carrega {speedMultiplier}x mais rápido
          para o representante.
        </p>
      </div>

      {/* Métricas Adicionais */}
      <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-indigo-200 uppercase font-bold mb-1">
            Total Original
          </p>
          <p className="text-lg font-black">
            {(originalTotal / 1024).toFixed(2)} MB
          </p>
        </div>
        <div>
          <p className="text-[10px] text-indigo-200 uppercase font-bold mb-1">
            Total Otimizado
          </p>
          <p className="text-lg font-black">
            {(optimizedTotal / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
    </div>
  );
}
