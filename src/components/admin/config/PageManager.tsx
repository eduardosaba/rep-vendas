'use client';

import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SectionItem = {
  id: string;
  section_key: string;
  title: string;
  is_active: boolean;
  sort_order: number;
};

type SectionPreset = {
  key: string;
  title: string;
  description: string;
};

const SECTION_PRESETS: SectionPreset[] = [
  { key: 'hero', title: 'Hero / Boas-vindas', description: 'Topo da home com logo e mensagem principal.' },
  { key: 'representante', title: 'Representante', description: 'Bloco com o representante em atendimento.' },
  { key: 'destaques', title: 'Produtos em Destaque', description: 'Vitrine curta de produtos prioritários.' },
  { key: 'produtos', title: 'Grade de Produtos', description: 'Listagem completa de produtos do catalogo.' },
  { key: 'contato', title: 'Contato', description: 'Canais de contato da distribuidora.' },
];

function getPresetByKey(key: string) {
  return SECTION_PRESETS.find((preset) => preset.key === key);
}

export default function PageManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState('hero');
  const [customTitle, setCustomTitle] = useState('');
  const [sections, setSections] = useState<SectionItem[]>([]);

  const sorted = useMemo(
    () => [...sections].sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    [sections]
  );

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/page-sections', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao carregar seções');
      }
      setSections((json.data || []) as SectionItem[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar gerenciador de páginas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const addSection = async () => {
    const selectedPreset = getPresetByKey(selectedPresetKey);
    if (!selectedPreset) return;

    const cleanTitle = customTitle.trim() || selectedPreset.title;

    setSaving(true);
    try {
      const res = await fetch('/api/company/page-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          section_key: selectedPreset.key,
          is_active: true,
          sort_order: sorted.length,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao criar seção');
      }

      const nextItem = json.data as SectionItem;
      setSections((prev) => {
        const exists = prev.some((item) => item.id === nextItem.id);
        if (exists) return prev.map((item) => (item.id === nextItem.id ? nextItem : item));
        return [...prev, nextItem];
      });
      setCustomTitle('');
      toast.success('Secao salva com sucesso');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar seção');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: SectionItem) => {
    try {
      const res = await fetch('/api/company/page-sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao alterar status');
      }
      setSections((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_active: !it.is_active } : it)));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar seção');
    }
  };

  const removeSection = async (id: string) => {
    try {
      const res = await fetch('/api/company/page-sections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao remover seção');
      }
      setSections((prev) => prev.filter((it) => it.id !== id));
      toast.success('Seção removida');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover seção');
    }
  };

  const move = async (item: SectionItem, direction: 'up' | 'down') => {
    const index = sorted.findIndex((it) => it.id === item.id);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const other = sorted[targetIndex];

    try {
      await fetch('/api/company/page-sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, sort_order: other.sort_order }),
      });
      await fetch('/api/company/page-sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, sort_order: item.sort_order }),
      });

      await loadSections();
    } catch {
      toast.error('Erro ao reordenar seção');
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-black text-slate-900">Gerenciador de Páginas</h3>
        <p className="text-sm text-slate-500">
          Use as secoes oficiais para montar a home com comportamento previsivel.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={selectedPresetKey}
          onChange={(e) => setSelectedPresetKey(e.target.value)}
          className="h-12 md:w-72 px-4 rounded-xl border border-slate-200 bg-slate-50"
        >
          {SECTION_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.title}
            </option>
          ))}
        </select>
        <input
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Titulo personalizado (opcional)"
          className="h-12 flex-1 px-4 rounded-xl border border-slate-200 bg-slate-50"
        />
        <button
          onClick={addSection}
          disabled={saving}
          className="h-12 px-5 rounded-xl bg-slate-900 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Plus size={16} /> Adicionar Seção
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-bold text-slate-700 mb-1">Padrao oficial ativo</p>
        <p>
          {
            getPresetByKey(selectedPresetKey)?.description ||
            'Selecione uma secao oficial para configurar a home.'
          }
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando seções...</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Nenhuma seção criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <GripVertical size={16} className="text-slate-400" />
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500">/{item.section_key}</p>
              </div>

              <button
                onClick={() => move(item, 'up')}
                className="px-2 py-1 text-xs rounded border border-slate-200"
              >
                ↑
              </button>
              <button
                onClick={() => move(item, 'down')}
                className="px-2 py-1 text-xs rounded border border-slate-200"
              >
                ↓
              </button>
              <button
                onClick={() => toggleActive(item)}
                className={`px-3 py-1 text-xs rounded-full font-semibold ${
                  item.is_active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {item.is_active ? 'Ativa' : 'Inativa'}
              </button>
              <button
                onClick={() => removeSection(item.id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                title="Remover seção"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
