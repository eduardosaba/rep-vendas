"use client";

import React, { useState, useRef } from 'react';
import { makeWhatsAppUrl } from '@/lib/format-whatsapp';
import {
  Building2,
  X,
  FileText,
  Upload,
  Trash2,
  Eye,
  Instagram,
  Facebook,
  Linkedin,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks';
import RichTextEditor from '@/components/ui/RichTextEditor';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CompanySettingsFormData {
  id?: string;
  company_id?: string;
  name?: string;
  slug?: string;
  catalog_slug?: string;
  headline?: string;
  welcome_text?: string;
  primary_color?: string;
  header_icon_color?: string;
  header_icon_bg_color?: string | null;
  about_text?: string;
  cover_image?: string | null;
  cover_image_fit?: 'cover' | 'contain';
  cover_image_height?: number;
  cover_image_position?: string;
  cover_image_offset_x?: number;
  cover_image_offset_y?: number;
  show_headline_overlay?: boolean;
  cover_headline_position?: 'top' | 'center' | 'bottom';
  headline_text_color?: string;
  cover_headline_font_size?: number;
  cover_headline_offset_x?: number;
  cover_headline_offset_y?: number;
  cover_headline_z_index?: number;
  cover_headline_wrap?: boolean;
  cover_headline_force_two_lines?: boolean;
  whatsapp_phone?: string;
  whatsapp_url?: string | null;
  instagram_url?: string | null;
  instagram_handle?: string;
  facebook_url?: string | null;
  facebook_handle?: string;
  linkedin_url?: string | null;
  linkedin_handle?: string;
  catalog_pdf_url?: string | null;
  show_pdf_catalog?: boolean;
  [key: string]: any;
}

export interface TabInstitucionalProps {
  supabase: SupabaseClient;
  formData: CompanySettingsFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompanySettingsFormData>>;
  quickSave?: (partial: Record<string, any>, saveScope?: 'tab' | 'full') => Promise<any>;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string | null;
  writeTargets?: string[];
}

// Utilitário para gerar link do WhatsApp a partir de números digitados
function makeWhatsappUrlFromPhone(input?: string) {
  if (!input) return '';
  return makeWhatsAppUrl(input) || '';
}

// Gera URLs públicas para redes sociais tratando handles (@handle), nomes e URLs completas sem duplicar domínio
function makeSocialUrl(network: 'instagram' | 'facebook' | 'linkedin', input?: string): string {
  if (!input) return '';
  let str = String(input).trim();
  if (!str) return '';

  // Se o usuário colou uma URL completa HTTP/HTTPS, garante https:// e retorna sem duplicar
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str.replace(/^http:\/\//, 'https://');
  }

  // Se for domínio simples colado sem protocolo (ex: instagram.com/oticasaba)
  if (str.match(/^(www\.)?(instagram\.com|facebook\.com|linkedin\.com)/i)) {
    return `https://${str.replace(/^www\./, '')}`;
  }

  // Remove @ inicial e barras finais
  str = str.replace(/^@/, '').replace(/\/$/, '');
  if (!str) return '';

  if (network === 'instagram') return `https://instagram.com/${str}`;
  if (network === 'facebook') return `https://facebook.com/${str}`;
  if (network === 'linkedin') {
    return str.includes('/') ? `https://linkedin.com/${str}` : `https://linkedin.com/company/${str}`;
  }
  return '';
}

export function TabInstitucional({
  supabase,
  formData,
  setFormData,
  syncStatus = 'idle',
  lastSavedAt = null,
  writeTargets = [],
}: TabInstitucionalProps) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showAdvancedCoverControls, setShowAdvancedCoverControls] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsets = useRef<{ ox: number; oy: number } | null>(null);
  const { addToast } = useToast();

  const companySlug = (formData.catalog_slug || formData.slug || '').toString().trim();
  const publicCatalogUrl = companySlug ? `/catalogo/${companySlug}/empresa` : null;

  // Handler para resetar enquadramento da capa
  const handleResetCoverAlignment = () => {
    setFormData((prev) => ({
      ...prev,
      cover_image_fit: 'cover',
      cover_image_height: 360,
      cover_image_position: 'center',
      cover_image_offset_x: 0,
      cover_image_offset_y: 0,
    }));
    addToast({ title: 'Enquadramento da capa restaurado para o padrão', type: 'info' });
  };

  // Handler para resetar os parâmetros do headline
  const handleResetHeadlineSettings = () => {
    setFormData((prev) => ({
      ...prev,
      show_headline_overlay: true,
      cover_headline_position: 'center',
      headline_text_color: '#ffffff',
      cover_headline_font_size: 36,
      cover_headline_offset_x: 0,
      cover_headline_offset_y: 0,
      cover_headline_z_index: 100,
      cover_headline_wrap: true,
      cover_headline_force_two_lines: false,
    }));
    addToast({ title: 'Configurações do headline restauradas para o padrão', type: 'info' });
  };

  // Input reutilizável para redes sociais com tratamento de URLs e handles
  const SocialAutoInput = ({
    label,
    network,
    field,
  }: {
    label: string;
    network: 'instagram' | 'facebook' | 'linkedin';
    field: string;
  }) => {
    const initialHandle = formData[field]
      ? String(formData[field]).replace(/^https?:\/\//, '').split('/').pop() || ''
      : (formData[`${field.replace(/_url$/, '')}_handle`] as string) || '';
    const [localHandle, setLocalHandle] = useState<string>(initialHandle);

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {network === 'instagram' ? (
                <Instagram size={18} />
              ) : network === 'facebook' ? (
                <Facebook size={18} />
              ) : (
                <Linkedin size={18} />
              )}
            </div>
            <input
              type="text"
              value={localHandle}
              onChange={(e) => setLocalHandle(e.target.value)}
              onBlur={() => {
                const handle = localHandle;
                const url = makeSocialUrl(network, handle);
                setFormData((p) => ({
                  ...p,
                  [`${field.replace(/_url$/, '')}_handle`]: handle,
                  [field]: url || null,
                }));
              }}
              placeholder={
                network === 'instagram'
                  ? 'Ex: @oticasaba ou instagram.com/oticasaba'
                  : network === 'facebook'
                  ? 'Ex: oticasaba'
                  : 'Ex: oticasaba'
              }
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
            />
          </div>
          {formData[field] ? (
            <a
              href={String(formData[field])}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center shrink-0"
              title="Testar Link"
            >
              <ExternalLink size={18} />
            </a>
          ) : null}
        </div>
        <div className="text-[11px] text-slate-400 font-medium truncate">
          Link gerado: <span className="text-slate-600 font-semibold">{formData[field] || '—'}</span>
        </div>
      </div>
    );
  };

  // Componente de entrada para o WhatsApp institucional
  const WhatsAppInput = ({ label }: { label: string }) => {
    const initial =
      formData.whatsapp_phone ||
      (formData.whatsapp_url ? String(formData.whatsapp_url).replace(/^https?:\/\/wa\.me\//, '') : '');
    const [localPhone, setLocalPhone] = useState<string>(initial);

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600">
              <MessageCircle size={18} />
            </div>
            <input
              type="text"
              inputMode="tel"
              value={localPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              onBlur={() => {
                const v = localPhone;
                const url = makeWhatsappUrlFromPhone(v);
                setFormData((p) => ({ ...p, whatsapp_phone: v, whatsapp_url: url || null }));
              }}
              placeholder="Ex: (75) 98127-2323"
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-800"
            />
          </div>
          {formData.whatsapp_url ? (
            <a
              href={String(formData.whatsapp_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shrink-0"
              title="Testar Link do WhatsApp"
            >
              <ExternalLink size={18} />
            </a>
          ) : null}
        </div>
        <div className="text-[11px] text-slate-400 font-medium truncate">
          Link gerado: <span className="text-emerald-700 font-semibold">{formData.whatsapp_url || '—'}</span>
        </div>
      </div>
    );
  };

  const isHeaderIconTransparent = formData.header_icon_bg_color === 'transparent';

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-8">
        {/* Cabeçalho da Aba */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="text-primary" size={22} /> Gestão Institucional da Marca
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estes dados alimentam a página institucional pública da distribuidora (`/catalogo/{companySlug || 'slug'}/empresa`).
            </p>
          </div>

          {publicCatalogUrl ? (
            <a
              href={publicCatalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all hover:scale-[1.02] shrink-0"
            >
              <Eye size={16} /> Ver Página Pública
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic">Defina o slug para pré-visualização</span>
          )}
        </div>

        {/* Indicador de Status do Salvamento */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-2">
            <Info size={16} className="text-blue-500 shrink-0" />
            As alterações realizadas nesta aba são aplicadas ao clicar no botão global <strong>"Salvar Alterações"</strong>.
          </span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 font-bold text-[11px] shrink-0 ${
              syncStatus === 'saved'
                ? 'bg-emerald-100 text-emerald-700'
                : syncStatus === 'saving'
                ? 'bg-amber-100 text-amber-700'
                : syncStatus === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {syncStatus === 'saved'
              ? `Sincronizado${lastSavedAt ? ` às ${lastSavedAt}` : ''}`
              : syncStatus === 'saving'
              ? 'Sincronizando...'
              : syncStatus === 'error'
              ? 'Falha na sincronização'
              : 'Aguardando confirmação'}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 1: IDENTIDADE INSTITUCIONAL                                        */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" /> 1. Identidade Institucional
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Nome da Empresa</label>
              <input
                value={formData.name || ''}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Ex: Distribuidora Óptica XYZ"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Headline Principal da Marca</label>
              <input
                value={formData.headline || ''}
                onChange={(e) => setFormData((p) => ({ ...p, headline: e.target.value }))}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Ex: Tradição e Excelência no Mercado Óptico"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Mensagem de Boas-vindas (Texto Simples)</label>
              <input
                value={formData.welcome_text || ''}
                onChange={(e) => setFormData((p) => ({ ...p, welcome_text: e.target.value }))}
                className="w-full mt-1.5 p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Ex: Seja bem-vindo ao portal oficial da nossa distribuidora."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Cor Primária da Marca (Brand Color)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={(formData.primary_color as string) || '#2563eb'}
                  onChange={(e) => setFormData((p) => ({ ...p, primary_color: e.target.value }))}
                  className="w-12 h-11 p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={(formData.primary_color as string) || '#2563eb'}
                  onChange={(e) => setFormData((p) => ({ ...p, primary_color: e.target.value }))}
                  className="flex-1 p-3 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800 uppercase"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            {/* Cor de Fundo dos Ícones do Header com Checkbox de Transparência */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Cor de Fundo dos Ícones (Header)</label>
              <div className="mt-1.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHeaderIconTransparent}
                    onChange={(e) => {
                      setFormData((p) => ({
                        ...p,
                        header_icon_bg_color: e.target.checked ? 'transparent' : '#ffffff',
                      }));
                    }}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Fundo transparente</span>
                </label>

                {!isHeaderIconTransparent && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        formData.header_icon_bg_color && formData.header_icon_bg_color !== 'transparent'
                          ? String(formData.header_icon_bg_color)
                          : '#ffffff'
                      }
                      onChange={(e) => setFormData((p) => ({ ...p, header_icon_bg_color: e.target.value }))}
                      className="w-12 h-11 p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={String(formData.header_icon_bg_color || '#ffffff')}
                      onChange={(e) => setFormData((p) => ({ ...p, header_icon_bg_color: e.target.value }))}
                      className="flex-1 p-3 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800 uppercase"
                      placeholder="#ffffff"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cor dos Ícones do Header */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Cor dos Ícones (Header)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={(formData.header_icon_color as string) || '#1b1b1b'}
                  onChange={(e) => setFormData((p) => ({ ...p, header_icon_color: e.target.value }))}
                  className="w-12 h-11 p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={(formData.header_icon_color as string) || '#1b1b1b'}
                  onChange={(e) => setFormData((p) => ({ ...p, header_icon_color: e.target.value }))}
                  className="flex-1 p-3 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-800 uppercase"
                  placeholder="#1b1b1b"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: SOBRE A EMPRESA (RICH TEXT EDITOR)                             */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" /> 2. Apresentação Institucional ("Sobre a Empresa")
            </h4>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
              Histórico, Missão e Apresentação Institucional
            </label>
            <RichTextEditor
              value={formData.about_text || ''}
              onChange={(html: string) => setFormData((p) => ({ ...p, about_text: html }))}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: CAPA INSTITUCIONAL E OVERLAY DE HEADLINE                        */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Upload size={16} className="text-blue-600" /> 3. Imagem de Capa Institucional da Marca
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCoverAlignment}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                title="Restaurar enquadramento padrão"
              >
                <RotateCcw size={14} /> Restaurar Enquadramento
              </button>
              <button
                type="button"
                onClick={handleResetHeadlineSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                title="Restaurar padrão do headline"
              >
                <RotateCcw size={14} /> Restaurar Headline
              </button>
            </div>
          </div>

          {/* Campo de URL / Upload de Imagem */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="URL da imagem de capa (https://...)"
                value={formData.cover_image || ''}
                onChange={(e) => setFormData((p) => ({ ...p, cover_image: e.target.value || null }))}
                className="flex-1 w-full p-3 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-800"
              />

              <label
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shrink-0 transition-all ${
                  uploading ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white hover:bg-primary shadow-sm'
                }`}
              >
                {uploading ? 'Enviando...' : 'Fazer Upload de Capa'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Validação de tamanho (máximo 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      addToast({ title: 'A imagem de capa deve ter no máximo 5MB', type: 'error' });
                      return;
                    }

                    const objectUrl = URL.createObjectURL(file);
                    setLocalPreview(objectUrl);
                    setUploading(true);
                    try {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) throw new Error('Usuário não autenticado');
                      const fileExt = file.name.split('.').pop();
                      const fileName = `cover-${Date.now()}.${fileExt}`;
                      const filePath = `${user.id}/branding/${fileName}`;
                      const { error: uploadError } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, file, { upsert: true });
                      if (uploadError) throw uploadError;
                      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                      setFormData((p) => ({ ...p, cover_image: data.publicUrl }));
                      addToast({ title: 'Imagem de capa enviada com sucesso!', type: 'success' });
                    } catch (err: any) {
                      console.error('Erro ao enviar capa institucional:', err);
                      addToast({ title: 'Erro ao enviar imagem de capa', description: err?.message, type: 'error' });
                    } finally {
                      setUploading(false);
                      if (objectUrl) URL.revokeObjectURL(objectUrl);
                      setLocalPreview(null);
                    }
                  }}
                />
              </label>

              {(localPreview || formData.cover_image) && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData((p) => ({ ...p, cover_image: null }));
                    setLocalPreview(null);
                  }}
                  className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Trash2 size={16} /> Remover Capa
                </button>
              )}
            </div>

            {/* Previsualizador Interativo de Capa com Arraste (Drag-to-pan) e Overlay */}
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 relative shadow-sm">
              {localPreview || formData.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localPreview || formData.cover_image || ''}
                  alt="Preview da capa"
                  style={{
                    width: '100%',
                    height: Number(formData.cover_image_height || 360),
                    objectFit: formData.cover_image_fit || 'cover',
                    objectPosition:
                      typeof formData.cover_image_offset_x !== 'undefined' && formData.cover_image_offset_x !== null
                        ? `${Number(formData.cover_image_offset_x)}px ${Number(formData.cover_image_offset_y || 0)}px`
                        : formData.cover_image_position || 'center',
                  }}
                />
              ) : (
                <div className="h-48 w-full flex items-center justify-center text-sm text-slate-400 font-medium">
                  Nenhuma imagem de capa selecionada
                </div>
              )}

              {/* Drag-to-pan overlay para ajustar posição arrastando */}
              {(localPreview || formData.cover_image) && (
                <div
                  className="absolute inset-0"
                  style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                  onPointerDown={(e) => {
                    try {
                      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                    } catch (_) {}
                    setIsPanning(true);
                    panStart.current = { x: e.clientX, y: e.clientY };
                    panStartOffsets.current = {
                      ox: Number(formData.cover_image_offset_x || 0),
                      oy: Number(formData.cover_image_offset_y || 0),
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!isPanning || !panStart.current || !panStartOffsets.current) return;
                    const dx = Math.round(e.clientX - panStart.current.x);
                    const dy = Math.round(e.clientY - panStart.current.y);
                    const newX = panStartOffsets.current.ox + dx;
                    const newY = panStartOffsets.current.oy + dy;
                    setFormData((p) => ({ ...p, cover_image_offset_x: newX, cover_image_offset_y: newY }));
                  }}
                  onPointerUp={(e) => {
                    try {
                      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
                    } catch (_) {}
                    setIsPanning(false);
                    panStart.current = null;
                    panStartOffsets.current = null;
                  }}
                  onPointerCancel={() => {
                    setIsPanning(false);
                    panStart.current = null;
                    panStartOffsets.current = null;
                  }}
                />
              )}

              {/* Overlay do Headline renderizado sobre o preview (Renderização segura em texto simples) */}
              {formData.show_headline_overlay && (formData.headline || formData.welcome_text) && (
                <div
                  className={`absolute inset-0 flex ${
                    formData.cover_headline_position === 'top'
                      ? 'items-start'
                      : formData.cover_headline_position === 'bottom'
                      ? 'items-end'
                      : 'items-center'
                  } justify-center pointer-events-none p-6`}
                >
                  <div
                    className="max-w-3xl mx-auto text-center pointer-events-none drop-shadow-md"
                    style={{
                      transform: `translate(${Number(formData.cover_headline_offset_x || 0)}px, ${Number(
                        formData.cover_headline_offset_y || 0
                      )}px)`,
                      zIndex: Number(formData.cover_headline_z_index || 100),
                      whiteSpace: formData.cover_headline_wrap ? 'normal' : 'nowrap',
                      maxWidth: formData.cover_headline_force_two_lines ? '48ch' : undefined,
                    }}
                  >
                    {formData.headline && (
                      <div
                        className="font-black italic"
                        style={{
                          color: formData.headline_text_color || '#ffffff',
                          fontSize: `${Number(formData.cover_headline_font_size || 36)}px`,
                          lineHeight: 1.05,
                        }}
                      >
                        {formData.headline}
                      </div>
                    )}
                    {formData.welcome_text && (
                      <div
                        className="mt-2 font-medium"
                        style={{
                          color: formData.headline_text_color || '#ffffff',
                          fontSize: `${Math.max(12, Number(formData.cover_headline_font_size || 36) * 0.45)}px`,
                        }}
                      >
                        {formData.welcome_text}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controles Principais de Capa e Headline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="chk_show_headline"
                  checked={!!formData.show_headline_overlay}
                  onChange={(e) => setFormData((p) => ({ ...p, show_headline_overlay: e.target.checked }))}
                  className="w-5 h-5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="chk_show_headline" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Exibir Headline sobre a capa
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Posição do Texto Overlay</label>
                <select
                  value={formData.cover_headline_position || 'center'}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      cover_headline_position: e.target.value as 'top' | 'center' | 'bottom',
                    }))
                  }
                  className="w-full mt-1 p-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <option value="top">Topo</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Inferior</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Cor do Texto (Overlay)</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.headline_text_color || '#ffffff'}
                    onChange={(e) => setFormData((p) => ({ ...p, headline_text_color: e.target.value }))}
                    className="w-10 h-9 p-1 border border-slate-200 rounded-xl cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={formData.headline_text_color || '#ffffff'}
                    onChange={(e) => setFormData((p) => ({ ...p, headline_text_color: e.target.value }))}
                    className="flex-1 p-2 rounded-xl border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-800 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Accordion para Ajustes Avançados de Capa e Headline */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedCoverControls(!showAdvancedCoverControls)}
                className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700 transition-colors"
              >
                <span>Configurações Avançadas de Enquadramento e Headline</span>
                {showAdvancedCoverControls ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvancedCoverControls && (
                <div className="mt-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Modo de Enquadramento (Fit)</label>
                      <select
                        value={formData.cover_image_fit || 'cover'}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, cover_image_fit: e.target.value as 'cover' | 'contain' }))
                        }
                        className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                      >
                        <option value="cover">Preencher (Cover)</option>
                        <option value="contain">Encaixar (Contain)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Altura da Capa (px)</label>
                      <input
                        type="number"
                        min={100}
                        max={1200}
                        value={Number(formData.cover_image_height || 360)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_image_height: Number(e.target.value) }))}
                        className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Tamanho da Fonte (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={120}
                        value={Number(formData.cover_headline_font_size || 36)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_headline_font_size: Number(e.target.value) }))}
                        className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Offset X da Imagem (px)</label>
                      <input
                        type="number"
                        value={Number(formData.cover_image_offset_x || 0)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_image_offset_x: Number(e.target.value) }))}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Offset Y da Imagem (px)</label>
                      <input
                        type="number"
                        value={Number(formData.cover_image_offset_y || 0)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_image_offset_y: Number(e.target.value) }))}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Headline Offset X (px)</label>
                      <input
                        type="number"
                        value={Number(formData.cover_headline_offset_x || 0)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_headline_offset_x: Number(e.target.value) }))}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Headline Offset Y (px)</label>
                      <input
                        type="number"
                        value={Number(formData.cover_headline_offset_y || 0)}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_headline_offset_y: Number(e.target.value) }))}
                        className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.cover_headline_wrap}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_headline_wrap: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">Permitir quebra de linha (wrap)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.cover_headline_force_two_lines}
                        onChange={(e) => setFormData((p) => ({ ...p, cover_headline_force_two_lines: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">Forçar até 2 linhas</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 4: CONTATO E REDES SOCIAIS                                         */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <MessageCircle size={16} className="text-emerald-600" /> 4. Contato e Redes Sociais da Empresa
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WhatsAppInput label="WhatsApp Comercial (Atendimento Direto)" />
            <SocialAutoInput label="Instagram Oficial" network="instagram" field="instagram_url" />
            <SocialAutoInput label="Facebook Oficial" network="facebook" field="facebook_url" />
            <SocialAutoInput label="LinkedIn da Empresa" network="linkedin" field="linkedin_url" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 5: CATÁLOGO INSTITUCIONAL EM PDF                                   */}
        {/* ========================================================================= */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText size={16} className="text-red-600" /> 5. Catálogo Institucional em PDF
            </h4>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {formData.catalog_pdf_url
                      ? String(formData.catalog_pdf_url).split('/').pop() || 'Catálogo Vinculado.pdf'
                      : 'Nenhum PDF selecionado'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Tamanho máximo: 20MB (PDF)</p>
                </div>
              </div>

              {formData.catalog_pdf_url && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={String(formData.catalog_pdf_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Visualizar PDF Atual"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, catalog_pdf_url: null }))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover PDF vinculado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <label
              className={`cursor-pointer bg-slate-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2 shrink-0 ${
                uploadingPdf ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload size={16} />
              {uploadingPdf ? 'Enviando...' : 'Subir Novo PDF'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploadingPdf}
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 20 * 1024 * 1024) {
                      addToast({ title: 'O arquivo PDF deve ser menor que 20MB', type: 'error' });
                      return;
                    }
                    setUploadingPdf(true);

                    const slug = String(formData.slug || formData.name || 'company')
                      .replace(/[^a-z0-9\-]/gi, '-')
                      .toLowerCase();
                    const baseName = `${slug}-catalogo-${Date.now()}`;
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('filename', baseName);

                    let companyIdToSend = String(formData.id || formData.company_id || '').trim();
                    if (!companyIdToSend) {
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (user?.id) {
                          const { data: profile } = await supabase
                            .from('profiles')
                            .select('company_id')
                            .eq('id', user.id)
                            .maybeSingle();
                          companyIdToSend = String((profile as any)?.company_id || '');
                        }
                      } catch (_) {}
                    }
                    if (companyIdToSend) fd.append('companyId', companyIdToSend);

                    const res = await fetch('/api/catalogs/upload', { method: 'POST', body: fd });
                    const json = await res.json();
                    if (!res.ok) {
                      if (res.status === 401) {
                        addToast({ title: 'Não autenticado', description: 'Faça login para enviar o PDF.', type: 'error' });
                        return;
                      }
                      if (res.status === 403) {
                        addToast({
                          title: 'Permissão negada',
                          description: 'Apenas administradores podem enviar o PDF.',
                          type: 'error',
                        });
                        return;
                      }
                      throw new Error(json?.error || 'Upload do PDF falhou');
                    }
                    setFormData((p) => ({ ...p, catalog_pdf_url: json.publicUrl }));
                    addToast({ title: 'Catálogo PDF enviado com sucesso!', type: 'success' });
                  } catch (err: any) {
                    console.error('Erro no upload do PDF:', err);
                    addToast({ title: 'Erro ao enviar o PDF', description: err?.message || String(err), type: 'error' });
                  } finally {
                    setUploadingPdf(false);
                  }
                }}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Exibir botão de download do PDF no Catálogo Público</p>
                <p className="text-xs text-slate-500 font-medium">Os clientes poderão baixar este PDF diretamente no portal.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData((p) => ({ ...p, show_pdf_catalog: !p.show_pdf_catalog }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                formData.show_pdf_catalog ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  formData.show_pdf_catalog ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabInstitucional;
