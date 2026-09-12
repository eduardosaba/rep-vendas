'use client';

import React, { useState } from 'react';
import type { CompanyPageBlock, CompanyPageBlockType, CompanyPageContent } from '@/lib/company-page-content';
import type { ResolvedDynamicData } from '@/lib/company-page-dynamic-data';
import type { DeviceMode } from './PageBuilderToolbar';
import { CompanyPageRenderer } from '@/components/catalogo/CompanyPageRenderer';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  GripVertical,
  Type,
  Heading,
  Image as ImageIcon,
  Columns2,
  List,
  Layout,
  Minus,
  GalleryHorizontal,
  RectangleHorizontal,
  HelpCircle,
  BarChart3,
  MessageSquareQuote,
  Video,
  PhoneCall,
  Package,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PageBuilderCanvasProps {
  content: CompanyPageContent;
  selectedBlockId: string | null;
  deviceMode: DeviceMode;
  isPreview: boolean;
  resolvedDynamicData?: ResolvedDynamicData;
  isLoadingDynamicData?: boolean;
  onSelectBlock: (id: string | null) => void;
  onInsertBlock: (type: CompanyPageBlockType, index?: number) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onRemoveBlock: (id: string) => void;
  onReorderBlocks: (oldIndex: number, newIndex: number) => void;
}

const blockOptions: Array<{ type: CompanyPageBlockType; label: string; icon: any; desc: string }> = [
  { type: 'heading', label: 'Título', icon: Heading, desc: 'Títulos H1, H2 ou H3 para seções' },
  { type: 'text', label: 'Texto', icon: Type, desc: 'Parágrafo institucional flexível' },
  { type: 'image', label: 'Imagem', icon: ImageIcon, desc: 'Foto ou ilustração individual' },
  { type: 'image_text', label: 'Imagem + Texto', icon: Layout, desc: 'Foto com texto ao lado' },
  { type: 'columns', label: 'Duas Colunas', icon: Columns2, desc: 'Texto distribuído em 2 colunas' },
  { type: 'gallery', label: 'Galeria de Fotos', icon: GalleryHorizontal, desc: 'Grade com múltiplas imagens' },
  { type: 'banner', label: 'Banner Comercial', icon: RectangleHorizontal, desc: 'Destaque visual com botão' },
  { type: 'list', label: 'Lista de Itens', icon: List, desc: 'Marcadores de benefícios ou serviços' },
  { type: 'spacer', label: 'Espaçador', icon: Minus, desc: 'Espaço em branco ou linha divisória' },
  { type: 'faq', label: 'Perguntas Frequentes', icon: HelpCircle, desc: 'Sanfona com dúvidas frequentes' },
  { type: 'stats', label: 'Indicadores', icon: BarChart3, desc: 'Métricas e números de destaque' },
  { type: 'testimonials', label: 'Depoimentos', icon: MessageSquareQuote, desc: 'Avaliações com foto e estrelas' },
  { type: 'video', label: 'Vídeo', icon: Video, desc: 'Player do YouTube ou Vimeo' },
  { type: 'contact', label: 'Contato & WhatsApp', icon: PhoneCall, desc: 'Canais de atendimento e mapa' },
  { type: 'products', label: 'Produtos Dinâmicos', icon: Package, desc: 'Lançamentos e destaques do catálogo' },
  { type: 'brands', label: 'Marcas Dinâmicas', icon: Award, desc: 'Grade de marcas da organização' },
];

function SortableBlockItem({
  block,
  idx,
  totalBlocks,
  isSelected,
  isCollapsed,
  opt,
  content,
  resolvedDynamicData,
  isLoadingDynamicData,
  onSelectBlock,
  onMoveBlock,
  onDuplicateBlock,
  onRemoveBlock,
  toggleCollapse,
  renderAddBlockButton,
}: {
  block: CompanyPageBlock;
  idx: number;
  totalBlocks: number;
  isSelected: boolean;
  isCollapsed: boolean;
  opt: any;
  content: CompanyPageContent;
  resolvedDynamicData?: ResolvedDynamicData;
  isLoadingDynamicData?: boolean;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (id: string) => void;
  onRemoveBlock: (id: string) => void;
  toggleCollapse: (id: string) => void;
  renderAddBlockButton: (insertIndex: number) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 'auto',
  };

  const Icon = opt?.icon || Type;

  return (
    <div ref={setNodeRef} style={style} className="space-y-4">
      <div
        className={`rounded-2xl border-2 bg-white transition-all shadow-sm ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-100 shadow-md'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Banner de cabeçalho do bloco */}
        <div className="flex items-center justify-between border-b border-slate-100 p-3 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-colors"
              title="Arrastar para reordenar"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer flex-1"
              onClick={() => onSelectBlock(block.id)}
            >
              <div className="rounded-lg bg-white p-1.5 text-blue-600 border border-slate-200 shadow-2xs">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800">{opt?.label || block.type}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500"
              title="Mover para cima"
              disabled={idx === 0}
              onClick={() => onMoveBlock(block.id, 'up')}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500"
              title="Mover para baixo"
              disabled={idx === totalBlocks - 1}
              onClick={() => onMoveBlock(block.id, 'down')}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-blue-600"
              title="Duplicar seção"
              onClick={() => onDuplicateBlock(block.id)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-red-600"
              title="Excluir seção"
              onClick={() => onRemoveBlock(block.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400"
              onClick={() => toggleCollapse(block.id)}
            >
              {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Corpo do bloco (se não colapsado) */}
        {!isCollapsed && (
          <div className="p-4 cursor-pointer" onClick={() => onSelectBlock(block.id)}>
            <CompanyPageRenderer
              content={{ ...content, blocks: [block], heroImage: '' }}
              preview={true}
              resolvedDynamicData={resolvedDynamicData}
              isLoadingDynamicData={isLoadingDynamicData}
            />
          </div>
        )}
      </div>

      {/* Botão + inter-blocos */}
      {renderAddBlockButton(idx + 1)}
    </div>
  );
}

export function PageBuilderCanvas({
  content,
  selectedBlockId,
  deviceMode,
  isPreview,
  resolvedDynamicData,
  isLoadingDynamicData,
  onSelectBlock,
  onInsertBlock,
  onDuplicateBlock,
  onMoveBlock,
  onRemoveBlock,
  onReorderBlocks,
}: PageBuilderCanvasProps) {
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});
  const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleCollapse = (id: string) => {
    setCollapsedBlocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getContainerWidth = () => {
    if (deviceMode === 'mobile') return 'max-w-[390px]';
    if (deviceMode === 'tablet') return 'max-w-[768px]';
    return 'max-w-4xl';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = content.blocks.findIndex((b) => b.id === active.id);
      const newIndex = content.blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderBlocks(oldIndex, newIndex);
      }
    }
  };

  if (isPreview) {
    return (
      <div className="flex justify-center p-4 md:p-8 bg-slate-100 min-h-full">
        <div
          className={`w-full bg-white rounded-2xl p-6 md:p-10 shadow-lg border border-slate-200 transition-all duration-300 ${getContainerWidth()}`}
        >
          <CompanyPageRenderer
            content={content}
            preview={true}
            resolvedDynamicData={resolvedDynamicData}
            isLoadingDynamicData={isLoadingDynamicData}
          />
        </div>
      </div>
    );
  }

  const renderAddBlockButton = (insertIndex: number) => {
    const isOpen = openInsertIndex === insertIndex;
    return (
      <div className="group relative flex justify-center py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-slate-200 group-hover:border-blue-400 transition-colors" />
        </div>

        <div className="relative z-10">
          <button
            type="button"
            onClick={() => setOpenInsertIndex(isOpen ? null : insertIndex)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" />
            <span>Adicionar Seção</span>
          </button>

          {isOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Escolher Bloco
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto">
                {blockOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        onInsertBlock(opt.type, insertIndex);
                        setOpenInsertIndex(null);
                      }}
                      className="flex items-center gap-2.5 rounded-xl p-2 text-left hover:bg-slate-50 transition-colors group/item"
                    >
                      <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600 group-hover/item:bg-blue-50 group-hover/item:text-blue-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                        <div className="text-[10px] text-slate-400">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const blockIds = content.blocks.map((b) => b.id);

  return (
    <div className="flex justify-center p-4 md:p-6 bg-slate-100 min-h-full">
      <div className={`w-full space-y-4 transition-all duration-300 ${getContainerWidth()}`}>
        {/* Capa / Hero Section Card */}
        <div
          onClick={() => onSelectBlock('hero')}
          className={`cursor-pointer overflow-hidden rounded-2xl border-2 transition-all bg-white p-4 shadow-sm ${
            selectedBlockId === 'hero'
              ? 'border-blue-600 ring-2 ring-blue-100 shadow-md'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700 uppercase tracking-wider">
                Hero
              </span>
              <span className="text-xs font-bold text-slate-700">Capa da Página</span>
            </div>
            <span className="text-xs text-blue-600 font-semibold">Clique para editar</span>
          </div>

          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl bg-slate-900 text-white flex items-center justify-center">
            {content.heroImage ? (
              <img src={content.heroImage} alt="Capa" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            ) : null}
            <div className="relative z-10 p-4 text-center">
              <h3 className="text-base font-black">{content.heroTitle || content.title || 'Título da Capa'}</h3>
              {content.heroSubtitle && <p className="text-xs text-slate-200 mt-1">{content.heroSubtitle}</p>}
            </div>
          </div>
        </div>

        {/* Botão para inserir no topo */}
        {renderAddBlockButton(0)}

        {/* Lista de Blocos Reordenáveis */}
        {content.blocks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
            <p className="text-sm font-semibold">Sua página ainda não tem blocos de conteúdo.</p>
            <p className="text-xs mt-1">Clique no botão acima para adicionar a primeira seção.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {content.blocks.map((block, idx) => {
                const isSelected = selectedBlockId === block.id;
                const isCollapsed = Boolean(collapsedBlocks[block.id]);
                const opt = blockOptions.find((o) => o.type === block.type);

                return (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    idx={idx}
                    totalBlocks={content.blocks.length}
                    isSelected={isSelected}
                    isCollapsed={isCollapsed}
                    opt={opt}
                    content={content}
                    resolvedDynamicData={resolvedDynamicData}
                    isLoadingDynamicData={isLoadingDynamicData}
                    onSelectBlock={onSelectBlock}
                    onMoveBlock={onMoveBlock}
                    onDuplicateBlock={onDuplicateBlock}
                    onRemoveBlock={onRemoveBlock}
                    toggleCollapse={toggleCollapse}
                    renderAddBlockButton={renderAddBlockButton}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
