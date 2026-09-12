'use client';

import type { CompanyPageBlock, CompanyPageContent } from '@/lib/company-page-content';
import { HeroEditor } from './HeroEditor';
import { HeadingBlockEditor } from './blocks/HeadingBlockEditor';
import { TextBlockEditor } from './blocks/TextBlockEditor';
import { ImageBlockEditor } from './blocks/ImageBlockEditor';
import { ImageTextBlockEditor } from './blocks/ImageTextBlockEditor';
import { GalleryBlockEditor } from './blocks/GalleryBlockEditor';
import { BannerBlockEditor } from './blocks/BannerBlockEditor';
import { ColumnsBlockEditor } from './blocks/ColumnsBlockEditor';
import { ListBlockEditor } from './blocks/ListBlockEditor';
import { SpacerBlockEditor } from './blocks/SpacerBlockEditor';
import { FaqBlockEditor } from './blocks/FaqBlockEditor';
import { StatsBlockEditor } from './blocks/StatsBlockEditor';
import { TestimonialsBlockEditor } from './blocks/TestimonialsBlockEditor';
import { VideoBlockEditor } from './blocks/VideoBlockEditor';
import { ContactBlockEditor } from './blocks/ContactBlockEditor';
import { ProductsBlockEditor } from './blocks/ProductsBlockEditor';
import { BrandsBlockEditor } from './blocks/BrandsBlockEditor';
import { X, Sliders, Layout, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageBuilderInspectorProps {
  content: CompanyPageContent;
  selectedBlockId: string | null;
  onClose: () => void;
  onUpdateContent: (nextContent: CompanyPageContent) => void;
  onUpdateBlock: (updatedBlock: CompanyPageBlock) => void;
  availableBrands?: Array<{ id: string; name: string }>;
  availableCategories?: Array<{ id: string; name: string }>;
}

const blockTitles: Record<string, string> = {
  heading: 'Título (Heading)',
  text: 'Texto Simples',
  image: 'Imagem Individual',
  columns: 'Duas Colunas',
  list: 'Lista de Itens',
  image_text: 'Imagem + Texto',
  spacer: 'Espaçador / Linha',
  banner: 'Banner Comercial',
  gallery: 'Galeria de Imagens',
  faq: 'Perguntas Frequentes (FAQ)',
  stats: 'Indicadores e Números',
  testimonials: 'Depoimentos de Clientes',
  video: 'Vídeo Institucional',
  contact: 'Contato & Redes Sociais',
  products: 'Produtos Dinâmicos',
  brands: 'Marcas Dinâmicas',
};

export function PageBuilderInspector({
  content,
  selectedBlockId,
  onClose,
  onUpdateContent,
  onUpdateBlock,
  availableBrands = [],
  availableCategories = [],
}: PageBuilderInspectorProps) {
  if (!selectedBlockId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="rounded-full bg-slate-100 p-4">
          <Sliders className="h-6 w-6 text-slate-400" />
        </div>
        <h4 className="mt-3 text-sm font-bold text-slate-700">Nenhum bloco selecionado</h4>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Clique em qualquer seção ou na Capa (Hero) no painel esquerdo para editar suas propriedades.
        </p>
      </div>
    );
  }

  if (selectedBlockId === 'hero') {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-800">Capa da Página (Hero)</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <HeroEditor content={content} onChange={onUpdateContent} />
        </div>
      </div>
    );
  }

  const currentBlock = content.blocks.find((b) => b.id === selectedBlockId);
  if (!currentBlock) return null;

  const renderBlockEditor = () => {
    switch (currentBlock.type) {
      case 'heading':
        return <HeadingBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'text':
        return <TextBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'image':
        return <ImageBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'image_text':
        return <ImageTextBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'gallery':
        return <GalleryBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'banner':
        return <BannerBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'columns':
        return <ColumnsBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'list':
        return <ListBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'spacer':
        return <SpacerBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'faq':
        return <FaqBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'stats':
        return <StatsBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'testimonials':
        return <TestimonialsBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'video':
        return <VideoBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'contact':
        return <ContactBlockEditor block={currentBlock} onChange={onUpdateBlock} />;
      case 'products':
        return (
          <ProductsBlockEditor
            block={currentBlock}
            onChange={onUpdateBlock}
            availableBrands={availableBrands}
            availableCategories={availableCategories}
          />
        );
      case 'brands':
        return (
          <BrandsBlockEditor
            block={currentBlock}
            onChange={onUpdateBlock}
            availableBrands={availableBrands}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-black text-slate-800">
            {blockTitles[currentBlock.type] || 'Editar Bloco'}
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">{renderBlockEditor()}</div>
    </div>
  );
}
