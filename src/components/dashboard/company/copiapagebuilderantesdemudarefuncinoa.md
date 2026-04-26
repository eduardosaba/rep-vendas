'use client';

import React, { useEffect, useMemo, useState, useTransition, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Images,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  List,
  Minus,
  Plus,
  RectangleHorizontal,
  Trash2,
  Type,
  Columns2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // IMPORTADO SEU NOVO COMPONENTE
import {
  parseCompanyPageContent,
  serializeCompanyPageContent,
  type CompanyPageBlock,
  type CompanyPageBlockType,
  type CompanyPageContent,
} from '@/lib/company-page-content';
import { companyPageContentToHtml } from '@/lib/company-page-content';
import { toast } from 'sonner';

interface PageBuilderProps {
  value: unknown;
  pageTitle?: string;
  onChange: (serializedContent: string) => void;
}

type PresetTemplate = {
  label: string;
  blocks: CompanyPageBlock[];
};

// ... (funções createBlock e createPresetTemplates permanecem iguais)
function createBlock(type: CompanyPageBlockType): CompanyPageBlock {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === 'text') return { id, type, data: { text: '' } };
  if (type === 'image') {
    return { id, type, data: { url: '', alt: '', widthPercent: 100, maxHeight: 480, objectFit: 'cover' } };
  }
  if (type === 'columns') return { id, type, data: { leftText: '', rightText: '' } };
  if (type === 'list') return { id, type, data: { items: [''] } };
  if (type === 'image_text') {
    return {
      id,
      type,
      data: {
        imageUrl: '',
        imageAlt: '',
        text: '',
        imagePosition: 'left',
        widthPercent: 100,
        maxHeight: 480,
        objectFit: 'cover',
      },
    };
  }
  if (type === 'spacer') {
    return {
      id,
      type,
      data: { height: 32, lineStyle: 'space' },
    };
  }
  if (type === 'gallery') {
    return {
      id,
      type,
      data: { galleryImages: [], galleryColumns: 3, maxHeight: 320, objectFit: 'cover' },
    };
  }
  return {
    id,
    type,
    data: { imageUrl: '', title: '', subtitle: '', ctaText: '', ctaUrl: '', maxHeight: 320 },
  };
}

function createPresetTemplates(): PresetTemplate[] {
  return [
    {
      label: 'Institucional elegante',
      blocks: [
        createBlock('text'),
        { ...createBlock('image_text'), data: { imagePosition: 'right', text: '' } },
        { ...createBlock('list'), data: { items: ['Atendimento consultivo', 'Entrega ágil', 'Suporte dedicado'] } },
      ],
    },
    {
      label: 'Catálogo em destaque',
      blocks: [
        { ...createBlock('banner'), data: { title: 'Coleção principal', subtitle: 'Conheça os produtos mais vendidos' } },
        createBlock('gallery'),
      ],
    },
    {
      label: 'Sobre + CTA',
      blocks: [
        createBlock('columns'),
        {
          ...createBlock('banner'),
          data: {
            title: 'Fale com nosso time',
            subtitle: 'Estamos prontos para ajudar no melhor mix para sua loja.',
            ctaText: 'Entrar em contato',
            ctaUrl: '#',
          },
        },
      ],
    },
  ];
}

export default function PageBuilder({ value, pageTitle = '', onChange }: PageBuilderProps) {
  const parsed = useMemo(() => parseCompanyPageContent(value, pageTitle), [value, pageTitle]);
  const presets = useMemo(() => createPresetTemplates(), []);
  const [content, setContent] = useState<CompanyPageContent>(parsed.content);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<'render' | 'html'>('render');

  useEffect(() => {
    setContent(parsed.content);
  }, [parsed.content]);

  const emit = (next: CompanyPageContent) => {
    setContent(next);
    onChange(serializeCompanyPageContent(next));
  };

  const previewHtml = useMemo(() => companyPageContentToHtml(content, content.title || pageTitle), [content, pageTitle]);
  const previewHtmlWithTailwind = useMemo(() => {
    const tailwindImport = "<style>@import 'https://cdn.jsdelivr.net/npm/tailwindcss@3.4.8/dist/tailwind.min.css';</style>";
    return tailwindImport + previewHtml;
  }, [previewHtml]);

  const addBlock = (type: CompanyPageBlockType) => {
    const next = { ...content, blocks: [...content.blocks, createBlock(type)] };
    emit(next);
  };

  const applyPreset = (preset: PresetTemplate) => {
    const nextBlocks = preset.blocks.map((block) => ({
      ...block,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }));
    emit({ ...content, blocks: [...content.blocks, ...nextBlocks] });
    toast.success(`Preset "${preset.label}" aplicado`);
  };

  const toBoundedNumber = (raw: string, min: number, max: number, fallback: number) => {
    const parsedNumber = Number(raw);
    if (!Number.isFinite(parsedNumber)) return fallback;
    return Math.max(min, Math.min(max, parsedNumber));
  };

  const updateBlock = (id: string, updater: (block: CompanyPageBlock) => CompanyPageBlock) => {
    const next = {
      ...content,
      blocks: content.blocks.map((block) => (block.id === id ? updater(block) : block)),
    };
    emit(next);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = content.blocks.findIndex((block) => block.id === id);
    if (index < 0) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= content.blocks.length) return;
    const blocks = [...content.blocks];
    const [current] = blocks.splice(index, 1);
    blocks.splice(target, 0, current);
    emit({ ...content, blocks });
  };

  const removeBlock = (id: string) => {
    emit({ ...content, blocks: content.blocks.filter((block) => block.id !== id) });
  };

  const reorderByIds = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    const fromIndex = content.blocks.findIndex((block) => block.id === fromId);
    const toIndex = content.blocks.findIndex((block) => block.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const blocks = [...content.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    emit({ ...content, blocks });
  };

  const uploadImage = async (file: File, onSuccess: (url: string) => void) => {
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('title', file.name);
        form.append('category', 'cms-pages');
        const res = await fetch('/api/admin/company/gallery/upload', {
          method: 'POST',
          body: form,
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          toast.error(json?.error || 'Falha no upload da imagem');
          return;
        }
        const url = String(json?.data?.image_url || '');
        if (!url) {
          toast.error('Upload concluído, mas sem URL pública');
          return;
        }
        onSuccess(url);
        toast.success('Imagem enviada com sucesso');
      } catch {
        toast.error('Erro ao enviar imagem');
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* SEÇÃO CAPA - REFATORADA COM O NOVO INPUT */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h5 className="text-sm font-black uppercase tracking-wider text-slate-500">Capa da Página</h5>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <Input 
            label="URL da imagem de capa"
            labelClassName="text-xs font-bold text-slate-400 uppercase"
            name="heroImage"
            value={content.heroImage || ''}
            onChange={(e) => emit({ ...content, heroImage: e.target.value })}
            placeholder="https://..."
            className="bg-slate-50"
          />
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-sm font-semibold text-slate-700 h-10">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                uploadImage(file, (url) => emit({ ...content, heroImage: url }));
                e.currentTarget.value = '';
              }}
            />
            <ImagePlus size={16} />
            Upload capa
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          </label>
        </div>
        <div className="max-w-xs">
          <Input 
            label="Altura da capa (px)"
            labelClassName="text-xs font-bold text-slate-400 uppercase"
            type="number"
            name="heroHeight"
            min={180}
            max={900}
            value={Number(content.heroHeight || 360)}
            onChange={(e) => emit({ ...content, heroHeight: toBoundedNumber(e.target.value, 180, 900, 360) })}
            className="bg-slate-50"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">Presets prontos</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset.label} type="button" variant="outline" onClick={() => applyPreset(preset)}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* BOTÕES DE ADIÇÃO DE BLOCOS */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => addBlock('text')} className="gap-2">
          <Type size={16} /> Texto
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('image')} className="gap-2">
          <ImagePlus size={16} /> Imagem
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('columns')} className="gap-2">
          <Columns2 size={16} /> Colunas
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('list')} className="gap-2">
          <List size={16} /> Marcadores
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('image_text')} className="gap-2">
          <LayoutTemplate size={16} /> Imagem + Texto
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('spacer')} className="gap-2">
          <Minus size={16} /> Linha / Espaço
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('banner')} className="gap-2">
          <RectangleHorizontal size={16} /> Banner
        </Button>
        <Button type="button" variant="outline" onClick={() => addBlock('gallery')} className="gap-2">
          <Images size={16} /> Galeria
        </Button>
      </div>

      {/* RENDERIZAÇÃO DOS BLOCOS */}
      <div className="space-y-3">
        {content.blocks.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum bloco adicionado. Use os botões acima para montar sua página.</p>
        ) : (
          content.blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => setDraggingId(block.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId) reorderByIds(draggingId, block.id);
                setDraggingId(null);
              }}
              onDragEnd={() => setDraggingId(null)}
              className={`rounded-xl border bg-white p-4 space-y-3 ${draggingId === block.id ? 'border-primary/50 opacity-80' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 inline-flex items-center gap-2">
                  <GripVertical size={14} className="text-slate-400" />
                  Bloco {index + 1} - {block.type}
                </p>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(block.id, 'up')}>
                    <ArrowUp size={14} />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(block.id, 'down')}>
                    <ArrowDown size={14} />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeBlock(block.id)}>
                    <Trash2 size={14} className="text-red-600" />
                  </Button>
                </div>
              </div>

              {/* BLOCO TEXTO */}
              {block.type === 'text' ? (
                <div className="space-y-3">
                  <textarea
                    id={`text-${block.id}`}
                    name={`text-${block.id}`}
                    rows={5}
                    value={block.data.text || ''}
                    onChange={(e) =>
                      updateBlock(block.id, (current) => ({
                        ...current,
                        data: { ...current.data, text: e.target.value },
                      }))
                    }
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    placeholder="Digite o texto deste bloco..."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`align-${block.id}`} className="text-xs font-bold text-slate-400 uppercase">Alinhamento</label>
                      <select
                        id={`align-${block.id}`}
                        name={`align-${block.id}`}
                        value={block.data.textAlign || 'left'}
                        onChange={(e) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            data: { ...current.data, textAlign: (e.target.value as any) },
                          }))
                        }
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centralizado</option>
                        <option value="right">Direita</option>
                        <option value="justify">Justificado</option>
                      </select>
                    </div>
                    <Input 
                      label="Tamanho (px)"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      type="number"
                      value={Number(block.data.fontSize || 16)}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: { ...current.data, fontSize: Math.max(12, Math.min(48, Number(e.target.value) || 16)) },
                        }))
                      }
                      className="bg-slate-50"
                    />
                  </div>
                </div>
              ) : null}

              {/* BLOCO IMAGEM */}
              {block.type === 'image' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <Input 
                      label="URL da imagem"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      value={block.data.url || ''}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: { ...current.data, url: e.target.value },
                        }))
                      }
                      className="bg-slate-50"
                      placeholder="https://..."
                    />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-sm font-semibold text-slate-700 h-10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          uploadImage(file, (url) =>
                            updateBlock(block.id, (current) => ({
                              ...current,
                              data: { ...current.data, url },
                            }))
                          );
                          e.currentTarget.value = '';
                        }}
                      />
                      <ImagePlus size={16} />
                      Upload
                      {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                    </label>
                  </div>
                  <Input 
                    label="Texto alternativo (Alt)"
                    labelClassName="text-xs font-bold text-slate-400 uppercase"
                    value={block.data.alt || ''}
                    onChange={(e) =>
                      updateBlock(block.id, (current) => ({
                        ...current,
                        data: { ...current.data, alt: e.target.value },
                      }))
                    }
                    className="bg-slate-50"
                    placeholder="Descrição para acessibilidade"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input 
                      label="Largura (%)"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      type="number"
                      value={Number(block.data.widthPercent || 100)}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: {
                            ...current.data,
                            widthPercent: toBoundedNumber(e.target.value, 10, 100, 100),
                          },
                        }))
                      }
                      className="bg-slate-50"
                    />
                    <Input 
                      label="Altura máx (px)"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      type="number"
                      value={Number(block.data.maxHeight || 480)}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: {
                            ...current.data,
                            maxHeight: toBoundedNumber(e.target.value, 80, 1200, 480),
                          },
                        }))
                      }
                      className="bg-slate-50"
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase">Ajuste</label>
                      <select
                        value={block.data.objectFit === 'contain' ? 'contain' : 'cover'}
                        onChange={(e) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            data: {
                              ...current.data,
                              objectFit: e.target.value === 'contain' ? 'contain' : 'cover',
                            },
                          }))
                        }
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
                      >
                        <option value="cover">Preencher</option>
                        <option value="contain">Conter</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* BLOCO COLUNAS */}
              {block.type === 'columns' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`left-${block.id}`} className="text-xs font-bold text-slate-400 uppercase">Coluna Esquerda</label>
                    <textarea
                      id={`left-${block.id}`}
                      rows={5}
                      value={block.data.leftText || ''}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: { ...current.data, leftText: e.target.value },
                        }))
                      }
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`right-${block.id}`} className="text-xs font-bold text-slate-400 uppercase">Coluna Direita</label>
                    <textarea
                      id={`right-${block.id}`}
                      rows={5}
                      value={block.data.rightText || ''}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: { ...current.data, rightText: e.target.value },
                        }))
                      }
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    />
                  </div>
                </div>
              ) : null}

              {/* BLOCO LISTA (MARCADORES) */}
              {block.type === 'list' ? (
                <div className="space-y-2">
                  {(block.data.items || []).map((item, itemIndex) => (
                    <div key={`${block.id}-item-${itemIndex}`} className="flex gap-2">
                      <Input 
                        placeholder={`Tópico ${itemIndex + 1}`}
                        value={item}
                        onChange={(e) =>
                          updateBlock(block.id, (current) => {
                            const items = [...(current.data.items || [])];
                            items[itemIndex] = e.target.value;
                            return { ...current, data: { ...current.data, items } };
                          })
                        }
                        className="bg-slate-50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateBlock(block.id, (current) => {
                            const items = [...(current.data.items || [])];
                            items.splice(itemIndex, 1);
                            return { ...current, data: { ...current.data, items } };
                          })
                        }
                      >
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 w-full md:w-auto"
                    onClick={() =>
                      updateBlock(block.id, (current) => ({
                        ...current,
                        data: { ...current.data, items: [...(current.data.items || []), ''] },
                      }))
                    }
                  >
                    <Plus size={14} /> Adicionar tópico
                  </Button>
                </div>
              ) : null}

              {/* BLOCO IMAGEM + TEXTO */}
              {block.type === 'image_text' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <Input 
                      label="Imagem"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      value={block.data.imageUrl || ''}
                      onChange={(e) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          data: { ...current.data, imageUrl: e.target.value },
                        }))
                      }
                      className="bg-slate-50"
                    />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-sm font-semibold text-slate-700 h-10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          uploadImage(file, (url) =>
                            updateBlock(block.id, (current) => ({
                              ...current,
                              data: { ...current.data, imageUrl: url },
                            }))
                          );
                          e.currentTarget.value = '';
                        }}
                      />
                      <ImagePlus size={16} />
                      Upload
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Alt da imagem" value={block.data.imageAlt || ''} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, imageAlt: e.target.value } }))} className="bg-slate-50" />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase">Posição da Imagem</label>
                      <select
                        value={block.data.imagePosition === 'right' ? 'right' : 'left'}
                        onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, imagePosition: e.target.value as any } }))}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
                      >
                        <option value="left">Esquerda</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={block.data.text || ''}
                    onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, text: e.target.value } }))}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    placeholder="Texto descritivo..."
                  />
                </div>
              ) : null}

              {/* BLOCO BANNER (O mais completo) */}
              {block.type === 'banner' ? (
                <div className="space-y-3">
                   <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                    <Input 
                      label="Fundo do Banner"
                      labelClassName="text-xs font-bold text-slate-400 uppercase"
                      value={block.data.imageUrl || ''}
                      onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, imageUrl: e.target.value } }))}
                      className="bg-slate-50"
                    />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-sm font-semibold text-slate-700 h-10">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file, (url) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, imageUrl: url } })));
                      }} />
                      <ImagePlus size={16} /> Upload
                    </label>
                  </div>
                  <Input label="Título" value={block.data.title || ''} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, title: e.target.value } }))} className="bg-slate-50" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Subtítulo</label>
                    <textarea
                      rows={2}
                      value={block.data.subtitle || ''}
                      onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, subtitle: e.target.value } }))}
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Texto do Botão" value={block.data.ctaText || ''} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, ctaText: e.target.value } }))} className="bg-slate-50" />
                    <Input label="Link do Botão" value={block.data.ctaUrl || ''} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, ctaUrl: e.target.value } }))} className="bg-slate-50" />
                  </div>
                </div>
              ) : null}

              {/* BLOCO GALERIA */}
              {block.type === 'gallery' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Colunas (Desktop)" type="number" min={2} max={4} value={Number(block.data.galleryColumns || 3)} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, galleryColumns: toBoundedNumber(e.target.value, 2, 4, 3) } }))} className="bg-slate-50" />
                    <Input label="Altura (px)" type="number" value={Number(block.data.maxHeight || 320)} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, maxHeight: toBoundedNumber(e.target.value, 100, 900, 320) } }))} className="bg-slate-50" />
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer text-sm font-semibold text-slate-700 w-full justify-center border-dashed">
                    <input type="file" accept="image/*" className="hidden" multiple onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(f => uploadImage(f, (url) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, galleryImages: [...(c.data.galleryImages || []), { url, alt: f.name }] } }))));
                    }} />
                    <ImagePlus size={16} /> Adicionar Imagens na Galeria
                  </label>
                  {/* Lista de Imagens da Galeria */}
                  <div className="grid grid-cols-1 gap-2">
                    {(block.data.galleryImages || []).map((img, imgIdx) => (
                      <div key={imgIdx} className="flex gap-2 items-center p-2 border rounded-lg bg-slate-50">
                        <img src={img.url} className="w-12 h-12 object-cover rounded" alt="Miniatura" />
                        <Input placeholder="Legenda/Alt" value={img.alt} onChange={(e) => updateBlock(block.id, (c) => {
                          const imgs = [...(c.data.galleryImages || [])];
                          imgs[imgIdx].alt = e.target.value;
                          return { ...c, data: { ...c.data, galleryImages: imgs } };
                        })} />
                        <Button size="icon" variant="ghost" onClick={() => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, galleryImages: c.data.galleryImages?.filter((_, i) => i !== imgIdx) } }))}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* BLOCO ESPAÇADOR */}
              {block.type === 'spacer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Espaço (px)" type="number" value={block.data.height} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, height: Number(e.target.value) } }))} className="bg-slate-50" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Estilo</label>
                    <select value={block.data.lineStyle} onChange={(e) => updateBlock(block.id, (c) => ({ ...c, data: { ...c.data, lineStyle: e.target.value as any } }))} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                       <option value="space">Apenas Espaço</option>
                       <option value="line">Linha Divisória</option>
                    </select>
                  </div>
                </div>
              ) : null}

            </div>
          ))
        )}
      </div>

      {/* PREVIEW FINAL */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-wider text-slate-500">Visualização</p>
          <Button type="button" variant="ghost" onClick={() => setShowPreview((s) => !s)}>
            {showPreview ? 'Ocultar' : 'Mostrar'} Preview
          </Button>
        </div>
        {showPreview && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Button type="button" variant={previewTab === 'render' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewTab('render')}>Render</Button>
              <Button type="button" variant={previewTab === 'html' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewTab('html')}>Código HTML</Button>
            </div>
            {previewTab === 'render' ? (
              <div className="rounded-xl border border-slate-100 bg-white p-4 prose prose-slate max-w-none shadow-inner" dangerouslySetInnerHTML={{ __html: previewHtmlWithTailwind }} />
            ) : (
              <pre className="max-h-96 overflow-auto p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono">{previewHtml}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
