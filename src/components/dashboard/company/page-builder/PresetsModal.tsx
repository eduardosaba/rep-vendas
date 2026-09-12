'use client';

import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, Replace, PlusCircle, AlertCircle } from 'lucide-react';
import { COMPANY_PAGE_PRESETS, CompanyPagePreset } from '@/lib/company-page-presets';
import type { CompanyPageBlock } from '@/lib/company-page-content';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingContent: boolean;
  onApplyPreset: (blocks: CompanyPageBlock[], mode: 'replace' | 'append') => void;
}

export function PresetsModal({
  isOpen,
  onClose,
  hasExistingContent,
  onApplyPreset,
}: PresetsModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<CompanyPagePreset | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: CompanyPagePreset) => {
    const blocks = preset.createBlocks();
    if (!hasExistingContent) {
      onApplyPreset(blocks, 'replace');
      onClose();
      setSelectedPreset(null);
    } else {
      setSelectedPreset(preset);
    }
  };

  const handleConfirmMode = (mode: 'replace' | 'append') => {
    if (!selectedPreset) return;
    const blocks = selectedPreset.createBlocks();
    onApplyPreset(blocks, mode);
    onClose();
    setSelectedPreset(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Modelos Prontos de Páginas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha um preset comercial para preencher sua página instantaneamente
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setSelectedPreset(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {selectedPreset && hasExistingContent ? (
            /* Confirm overlay when page has content */
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                    Sua página já possui blocos cadastrados
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Você escolheu o modelo <strong className="text-blue-600 dark:text-blue-400">{selectedPreset.title}</strong>. Como deseja prosseguir?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleConfirmMode('replace')}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/80 dark:hover:bg-red-950/40 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm">
                    <Replace className="w-4 h-4" />
                    Substituir Conteúdo Atual
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Remove os blocos existentes e inicia a página do zero com este modelo.
                  </span>
                </button>

                <button
                  onClick={() => handleConfirmMode('append')}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/80 dark:hover:bg-blue-950/40 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <PlusCircle className="w-4 h-4" />
                    Adicionar ao Final
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Insere os blocos deste modelo após os blocos já existentes.
                  </span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Voltar à Escolha
                </button>
              </div>
            </div>
          ) : (
            /* Presets List */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPANY_PAGE_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="group relative flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {preset.category}
                      </span>
                      {preset.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                          {preset.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
                    <span>Usar este modelo</span>
                    <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
