'use client';

import { useState } from 'react';
import type { CompanyPageContent } from '@/lib/company-page-content';
import { MediaUploader } from './MediaUploader';
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp } from 'lucide-react';

interface HeroEditorProps {
  content: CompanyPageContent;
  onChange: (updated: CompanyPageContent) => void;
}

export function HeroEditor({ content, onChange }: HeroEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const heroImage = content.heroImage || '';
  const heroTitle = content.heroTitle || '';
  const heroSubtitle = content.heroSubtitle || '';
  const heroCtaText = content.heroCtaText || '';
  const heroCtaUrl = content.heroCtaUrl || '';
  const heroAlign = content.heroAlign || 'center';
  const heroOverlayOpacity = content.heroOverlayOpacity ?? 40;
  const heroHeight = content.heroHeight || 360;
  const heroImagePosition = content.heroImagePosition || 'center';

  const update = (patch: Partial<CompanyPageContent>) => {
    onChange({
      ...content,
      ...patch,
    });
  };

  return (
    <div className="space-y-4">
      <MediaUploader
        value={heroImage}
        onChange={(newUrl) => update({ heroImage: newUrl })}
        label="Imagem de Capa (Hero)"
      />

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título sobre a Capa</label>
        <input
          type="text"
          value={heroTitle}
          onChange={(e) => update({ heroTitle: e.target.value })}
          placeholder="Ex: Conheça nossa trajetória..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subtítulo do Hero</label>
        <textarea
          value={heroSubtitle}
          onChange={(e) => update({ heroSubtitle: e.target.value })}
          rows={2}
          placeholder="Subtítulo ou mensagem institucional..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Botão de Ação (CTA)</label>
          <input
            type="text"
            value={heroCtaText}
            onChange={(e) => update({ heroCtaText: e.target.value })}
            placeholder="Ex: Ver Produtos"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Link do Botão</label>
          <input
            type="text"
            value={heroCtaUrl}
            onChange={(e) => update({ heroCtaUrl: e.target.value })}
            placeholder="/catalogo"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alinhamento do Conteúdo</label>
        <div className="mt-1.5 flex gap-2">
          {[
            { value: 'left', icon: AlignLeft, label: 'Esquerda' },
            { value: 'center', icon: AlignCenter, label: 'Centro' },
            { value: 'right', icon: AlignRight, label: 'Direita' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => update({ heroAlign: item.value as any })}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all ${
                  heroAlign === item.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Altura do Hero</label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {[
            { label: 'Compacto', val: 240 },
            { label: 'Normal', val: 360 },
            { label: 'Grande', val: 520 },
          ].map((h) => (
            <button
              key={h.val}
              type="button"
              onClick={() => update({ heroHeight: h.val })}
              className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                heroHeight === h.val
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {h.label} ({h.val}px)
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          <span>Configurações Avançadas</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600 font-semibold mb-1">
                <span>Escurecimento da Imagem (Overlay)</span>
                <span>{heroOverlayOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={heroOverlayOpacity}
                onChange={(e) => update({ heroOverlayOpacity: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Foco / Posição da Imagem</label>
              <div className="mt-1 flex gap-2">
                {[
                  { label: 'Topo', val: 'top' },
                  { label: 'Centro', val: 'center' },
                  { label: 'Base', val: 'bottom' },
                ].map((pos) => (
                  <button
                    key={pos.val}
                    type="button"
                    onClick={() => update({ heroImagePosition: pos.val as any })}
                    className={`flex-1 rounded-lg border p-2 text-xs font-medium ${
                      heroImagePosition === pos.val
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
