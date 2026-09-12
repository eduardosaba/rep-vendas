'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Sparkles,
  LayoutTemplate,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface PageBuilderToolbarProps {
  deviceMode: DeviceMode;
  onDeviceChange: (mode: DeviceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  onOpenPresetsModal: () => void;
}

export function PageBuilderToolbar({
  deviceMode,
  onDeviceChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isPreview,
  onTogglePreview,
  onOpenPresetsModal,
}: PageBuilderToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* Desfazer / Refazer */}
      <div className="flex items-center gap-1 border-r border-slate-100 pr-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          onClick={onUndo}
          title="Desfazer (Ctrl+Z)"
          className="h-8 w-8 text-slate-600 disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          onClick={onRedo}
          title="Refazer (Ctrl+Y)"
          className="h-8 w-8 text-slate-600 disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Device Switcher */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onDeviceChange('desktop')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            deviceMode === 'desktop'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>Desktop</span>
        </button>
        <button
          type="button"
          onClick={() => onDeviceChange('tablet')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            deviceMode === 'tablet'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tablet className="h-3.5 w-3.5" />
          <span>Tablet</span>
        </button>
        <button
          type="button"
          onClick={() => onDeviceChange('mobile')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
            deviceMode === 'mobile'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Mobile</span>
        </button>
      </div>

      {/* Ações: Presets & Preview */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenPresetsModal}
          className="h-8 gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-blue-300"
        >
          <LayoutTemplate className="h-3.5 w-3.5 text-blue-600" />
          <span>Modelos Prontos</span>
        </Button>

        <Button
          type="button"
          variant={isPreview ? 'default' : 'secondary'}
          size="sm"
          onClick={onTogglePreview}
          className="h-8 gap-1.5 text-xs font-bold"
        >
          {isPreview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span>Modo Edição</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Visualizar Página</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
