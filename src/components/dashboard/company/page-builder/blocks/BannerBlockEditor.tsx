'use client';

import type { CompanyPageBlock } from '@/lib/company-page-content';
import { MediaUploader } from '../MediaUploader';

interface BannerBlockEditorProps {
  block: CompanyPageBlock;
  onChange: (updated: CompanyPageBlock) => void;
}

export function BannerBlockEditor({ block, onChange }: BannerBlockEditorProps) {
  const imageUrl = block.data.imageUrl || '';
  const title = block.data.title || '';
  const subtitle = block.data.subtitle || '';
  const ctaText = block.data.ctaText || '';
  const ctaUrl = block.data.ctaUrl || '';

  const update = (patch: Partial<CompanyPageBlock['data']>) => {
    onChange({
      ...block,
      data: {
        ...block.data,
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      <MediaUploader
        value={imageUrl}
        onChange={(newUrl) => update({ imageUrl: newUrl })}
        label="Imagem de Fundo do Banner"
      />

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Título do Banner</label>
        <input
          type="text"
          value={title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Ex: Lançamentos de Verão, Fale com Nossos Vendedores"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subtítulo / Descrição</label>
        <textarea
          value={subtitle}
          onChange={(e) => update({ subtitle: e.target.value })}
          rows={3}
          placeholder="Descrição complementar do banner comercial..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Texto do Botão (CTA)</label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => update({ ctaText: e.target.value })}
            placeholder="Ex: Ver Coleção, Contato"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Link do Botão</label>
          <input
            type="text"
            value={ctaUrl}
            onChange={(e) => update({ ctaUrl: e.target.value })}
            placeholder="/catalogo ou https://..."
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
