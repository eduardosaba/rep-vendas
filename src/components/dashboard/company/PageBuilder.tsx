'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  parseCompanyPageContent,
  serializeCompanyPageContent,
  insertBlock,
  duplicateBlock,
  moveBlock,
  removeBlock,
  createBlock,
  type CompanyPageBlock,
  type CompanyPageBlockType,
  type CompanyPageContent,
} from '@/lib/company-page-content';
import type { ResolvedDynamicData } from '@/lib/company-page-dynamic-data';
import { PageBuilderToolbar, type DeviceMode } from './page-builder/PageBuilderToolbar';
import { PageBuilderCanvas } from './page-builder/PageBuilderCanvas';
import { PageBuilderInspector } from './page-builder/PageBuilderInspector';
import { toast } from 'sonner';

interface PageBuilderProps {
  value: unknown;
  pageTitle?: string;
  companyId?: string;
  onChange: (serializedContent: string) => void;
}

const MAX_HISTORY = 80;

import { PresetsModal } from './page-builder/PresetsModal';

export default function PageBuilder({
  value,
  pageTitle = '',
  companyId,
  onChange,
}: PageBuilderProps) {
  const parsed = useMemo(() => parseCompanyPageContent(value, pageTitle), [value, pageTitle]);
  const [content, setContent] = useState<CompanyPageContent>(parsed.content);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('hero');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isPreview, setIsPreview] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Histórico para Undo / Redo
  const [history, setHistory] = useState<CompanyPageContent[]>([parsed.content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Resolução de dados dinâmicos client-side (para produtos/marcas)
  const [resolvedDynamicData, setResolvedDynamicData] = useState<ResolvedDynamicData>({
    products: {},
    brands: {},
    availableBrands: [],
    availableCategories: [],
  });
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(false);

  const isDebouncingTextRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(parsed.content);
    setHistory([parsed.content]);
    setHistoryIndex(0);
  }, [parsed.content]);

  // Buscar dados dinâmicos (produtos e marcas) quando o conteúdo mudar
  useEffect(() => {
    let isMounted = true;
    const fetchDynamicData = async () => {
      try {
        setIsLoadingDynamicData(true);
        const res = await fetch('/api/company/pages/dynamic-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, companyId }),
        });
        const json = await res.json();
        if (isMounted && json?.success && json?.data) {
          setResolvedDynamicData(json.data);
        }
      } catch {
        // Silenciosamente tolera erro no preview
      } finally {
        if (isMounted) setIsLoadingDynamicData(false);
      }
    };

    fetchDynamicData();
    return () => {
      isMounted = false;
    };
  }, [content, companyId]);

  const commitChange = useCallback(
    (nextContent: CompanyPageContent, isStructural = true) => {
      setContent(nextContent);
      onChange(serializeCompanyPageContent(nextContent));

      if (isStructural) {
        setHistory((prevHistory) => {
          const trimmed = prevHistory.slice(0, historyIndex + 1);
          const next = [...trimmed, nextContent];
          if (next.length > MAX_HISTORY) next.shift();
          return next;
        });
        setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, MAX_HISTORY - 1));
      } else {
        if (isDebouncingTextRef.current) {
          clearTimeout(isDebouncingTextRef.current);
        }
        isDebouncingTextRef.current = setTimeout(() => {
          setHistory((prevHistory) => {
            const trimmed = prevHistory.slice(0, historyIndex + 1);
            const next = [...trimmed, nextContent];
            if (next.length > MAX_HISTORY) next.shift();
            return next;
          });
          setHistoryIndex((prevIndex) => Math.min(prevIndex + 1, MAX_HISTORY - 1));
        }, 600);
      }
    },
    [historyIndex, onChange]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setContent(targetState);
      onChange(serializeCompanyPageContent(targetState));
      toast.info('Alteração desfeita');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setContent(targetState);
      onChange(serializeCompanyPageContent(targetState));
      toast.info('Alteração refeita');
    }
  };

  const handleInsertBlock = (type: CompanyPageBlockType, index?: number) => {
    const nextBlocks = insertBlock(content.blocks, type, index);
    const nextContent = { ...content, blocks: nextBlocks };
    commitChange(nextContent, true);

    const targetIdx = index ?? nextBlocks.length - 1;
    if (nextBlocks[targetIdx]) {
      setSelectedBlockId(nextBlocks[targetIdx].id);
    }
    toast.success('Seção adicionada com sucesso');
  };

  const handleDuplicateBlock = (id: string) => {
    const nextBlocks = duplicateBlock(content.blocks, id);
    const nextContent = { ...content, blocks: nextBlocks };
    commitChange(nextContent, true);
    toast.success('Seção duplicada');
  };

  const handleMoveBlock = (id: string, direction: 'up' | 'down') => {
    const nextBlocks = moveBlock(content.blocks, id, direction);
    const nextContent = { ...content, blocks: nextBlocks };
    commitChange(nextContent, true);
  };

  const handleReorderBlocks = (oldIndex: number, newIndex: number) => {
    if (oldIndex < 0 || oldIndex >= content.blocks.length || newIndex < 0 || newIndex >= content.blocks.length) return;
    const nextBlocks = [...content.blocks];
    const [moved] = nextBlocks.splice(oldIndex, 1);
    nextBlocks.splice(newIndex, 0, moved);
    commitChange({ ...content, blocks: nextBlocks }, true);
  };

  const handleRemoveBlock = (id: string) => {
    const nextBlocks = removeBlock(content.blocks, id);
    const nextContent = { ...content, blocks: nextBlocks };
    commitChange(nextContent, true);

    if (selectedBlockId === id) {
      setSelectedBlockId('hero');
    }
    toast.info('Seção removida');
  };

  const handleUpdateBlock = (updatedBlock: CompanyPageBlock) => {
    const nextBlocks = content.blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    commitChange({ ...content, blocks: nextBlocks }, false);
  };

  const handleApplyPreset = (presetBlocks: CompanyPageBlock[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      commitChange({ ...content, blocks: presetBlocks }, true);
      toast.success('Página atualizada com o modelo escolhido');
    } else {
      commitChange({ ...content, blocks: [...content.blocks, ...presetBlocks] }, true);
      toast.success('Modelo adicionado ao final da página');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Modal de Presets Comerciais */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        hasExistingContent={content.blocks.length > 0}
        onApplyPreset={handleApplyPreset}
      />

      {/* Barra de Ferramentas Superior */}
      <PageBuilderToolbar
        deviceMode={deviceMode}
        onDeviceChange={setDeviceMode}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(!isPreview)}
        onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
      />

      {/* Editor em Duas Colunas (Canvas + Inspector) */}
      <div className="grid grid-cols-1 gap-4 min-h-[650px] lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        {/* Canvas de Construção Visual */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 min-h-[600px] flex flex-col">
          <PageBuilderCanvas
            content={content}
            selectedBlockId={selectedBlockId}
            deviceMode={deviceMode}
            isPreview={isPreview}
            resolvedDynamicData={resolvedDynamicData}
            isLoadingDynamicData={isLoadingDynamicData}
            onSelectBlock={(id) => setSelectedBlockId(id)}
            onInsertBlock={handleInsertBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onMoveBlock={handleMoveBlock}
            onRemoveBlock={handleRemoveBlock}
            onReorderBlocks={handleReorderBlocks}
          />
        </div>

        {/* Painel Contextual de Edição (Inspector) */}
        {!isPreview && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[600px]">
            <PageBuilderInspector
              content={content}
              selectedBlockId={selectedBlockId}
              onClose={() => setSelectedBlockId(null)}
              onUpdateContent={(nextContent) => commitChange(nextContent, false)}
              onUpdateBlock={handleUpdateBlock}
              availableBrands={resolvedDynamicData.availableBrands}
              availableCategories={resolvedDynamicData.availableCategories}
            />
          </div>
        )}
      </div>
    </div>
  );
}
