'use client';

import React, { useState } from 'react';
import { Tag, TrendingUp, Percent, DollarSign, ArrowLeft, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export type PricePreset = 'increase_pct' | 'discount_pct' | 'markup_cost' | 'margin_cost' | 'round_90';

const PRESET_LABELS: Record<PricePreset, string> = {
  increase_pct: 'Reajuste Percentual (+%)',
  discount_pct: 'Desconto sobre Tabela (-%)',
  markup_cost: 'Markup sobre Custo (Preço = Custo × (1 + %))',
  margin_cost: 'Margem Bruta sobre Custo (Preço = Custo ÷ (1 - %))',
  round_90: 'Arredondamento Comercial Opcional (.90)',
};

export function PriceManagementClient() {
  const [selectedPreset, setSelectedPreset] = useState<PricePreset>('increase_pct');
  const [targetBrand, setTargetBrand] = useState('');
  const [adjustmentValue, setAdjustmentValue] = useState('5');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Link href="/admin/produtos/atualizacao-inteligente" className="flex items-center gap-1 hover:underline">
              <ArrowLeft size={12} /> Motor Inteligente
            </Link>
            <span>• Precificação</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="text-indigo-600" size={28} /> Módulo Especialista de Gestão de Preço
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Execute estratégias de remarcação, aumentos em massa, descontos por coleção e arredondamento comercial.
          </p>
        </div>

        <Link
          href="/admin/produtos/atualizacao-inteligente"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
        >
          <Zap size={14} /> Abrir Motor Completo por Planilha <ArrowRight size={14} />
        </Link>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          {
            id: 'increase_pct',
            title: 'Reajuste (+%)',
            desc: 'Aumento percentual em massa no preço atual.',
            icon: TrendingUp,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950',
          },
          {
            id: 'discount_pct',
            title: 'Desconto (-%)',
            desc: 'Redução percentual sobre o preço de tabela.',
            icon: Percent,
            color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950',
          },
          {
            id: 'markup_cost',
            title: 'Markup sobre Custo',
            desc: 'Preço = Custo × (1 + %)',
            icon: Tag,
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
          },
          {
            id: 'margin_cost',
            title: 'Margem sobre Custo',
            desc: 'Preço = Custo ÷ (1 - %)',
            icon: DollarSign,
            color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
          },
          {
            id: 'round_90',
            title: 'Arredondar (.90)',
            desc: 'Opcional: Ajusta centavos para .90 comercial.',
            icon: Zap,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-950',
          },
        ].map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedPreset === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id as PricePreset)}
              className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${preset.color}`}>
                <Icon size={18} />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{preset.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1">{preset.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Preset Configurator Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Estratégia: {PRESET_LABELS[selectedPreset]}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina o filtro e parâmetros. A alteração passará obrigatoriamente pela análise e preview antes de qualquer gravação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Marca / Coleção Afetada (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: OAKLEY ou COLECAO_2026"
              value={targetBrand}
              onChange={(e) => setTargetBrand(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3 dark:bg-slate-800"
            />
            <span className="text-[11px] text-slate-400">Deixe em branco para afetar todo o catálogo.</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              {selectedPreset === 'round_90' ? 'Sufixo Comercial' : 'Porcentagem / Fator de Ajuste'}
            </label>
            <input
              type="text"
              placeholder="Ex: 5 para +5%"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              disabled={selectedPreset === 'round_90'}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl p-3 dark:bg-slate-800 disabled:opacity-50"
            />
            <span className="text-[11px] text-slate-400">
              {selectedPreset === 'round_90' ? 'Arredonda automaticamente centavos para .90' : 'Informe o valor numérico em %'}
            </span>
          </div>
        </div>

        {/* Integration Callout */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-emerald-600" />
            <div className="text-xs">
              <div className="font-bold text-slate-900 dark:text-white">Segurança & Audit Diff Garantidos</div>
              <div className="text-slate-500">Todas as alterações passam pelo preview de segurança e geram histórico auditado de rollback.</div>
            </div>
          </div>
          <Link
            href="/admin/produtos/atualizacao-inteligente"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-colors"
          >
            Carregar Planilha de Precificação <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
