"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Building2, X, FileText, Upload, Trash2, Eye, Instagram, Facebook, Linkedin, ExternalLink, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks';
import RichTextEditor from '@/components/ui/RichTextEditor';

// Normaliza a string de telefone removendo caracteres não numéricos
function normalizePhoneDigits(input?: string) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  while (digits.length > 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

// Gera o link do WhatsApp no formato https://wa.me/55{digits}
function makeWhatsappUrlFromPhone(input?: string) {
  const digits = normalizePhoneDigits(input);
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 4) return `https://wa.me/${digits}`;
  if (digits.length === 10 || digits.length === 11) return `https://wa.me/55${digits}`;
  return `https://wa.me/55${digits}`;
}

// Gera URLs públicas para redes sociais a partir de um handle/nome
function makeSocialUrl(network: 'instagram' | 'facebook' | 'linkedin', handle?: string) {
  if (!handle) return '';
  const trimmed = String(handle).trim().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!trimmed) return '';
  if (network === 'instagram') return `https://instagram.com/${trimmed}`;
  if (network === 'facebook') return `https://facebook.com/${trimmed}`;
  if (network === 'linkedin') return `https://linkedin.com/company/${trimmed}`;
  return '';
}

export function TabInstitucional(props: any) {
  const { supabase, formData, setFormData, quickSave } = props;
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const panStartOffsets = useRef<{ ox: number; oy: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [writeTargets, setWriteTargets] = useState<string[]>([]);
  const { addToast } = useToast();

  const SocialInput = ({ label, icon: Icon, value, onChange, placeholder }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center"
            title="Testar Link"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>
    </div>
  );

  const WhatsAppInput = ({ label }: any) => {
    const initial = formData.whatsapp_phone || (formData.whatsapp_url ? String(formData.whatsapp_url).replace(/https?:\/\/wa\.me\//, '') : '');
    const [localPhone, setLocalPhone] = useState<string>(initial);

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                setFormData((p: any) => ({ ...p, whatsapp_phone: v, whatsapp_url: url || null }));
              }}
              placeholder="Ex: 75981272323"
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          {formData.whatsapp_url ? (
            <a
              href={formData.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center"
              title="Testar Link"
            >
              <ExternalLink size={18} />
            </a>
          ) : null}
        </div>
        <div className="text-[12px] text-slate-500">Link gerado: {formData.whatsapp_url || '—'}</div>
      </div>
    );
  };

  const SocialAutoInput = ({ label, network, field }: any) => {
    const initialHandle = formData[field]
      ? String(formData[field]).replace(/https?:\/\//, '').split('/').pop()
      : formData[`${field.replace(/_url$/, '')}_handle`] || '';
    const [localHandle, setLocalHandle] = useState<string>(initialHandle);

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {network === 'instagram' ? <Instagram size={18} /> : network === 'facebook' ? <Facebook size={18} /> : <Linkedin size={18} />}
            </div>
            <input
              type="text"
              value={localHandle}
              onChange={(e) => setLocalHandle(e.target.value)}
              onBlur={() => {
                const handle = localHandle;
                const url = makeSocialUrl(network, handle);
                setFormData((p: any) => ({ ...p, [`${field.replace(/_url$/, '')}_handle`]: handle, [field]: url || null }));
              }}
              placeholder={network === 'instagram' ? 'Ex: oticasaba' : network === 'facebook' ? 'Ex: oticasaba' : 'Ex: oticasaba'}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          {formData[field] ? (
            <a
              href={formData[field]}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center"
              title="Testar Link"
            >
              <ExternalLink size={18} />
            </a>
          ) : null}
        </div>
        <div className="text-[12px] text-slate-500">Link gerado: {formData[field] || '—'}</div>
      </div>
    );
  };

  // NOTE: autosave (quickSave on blur) removed — use the global "Salvar Alterações" button

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Building2 size={18} /> Institucional
        </h3>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-600">
            Esses dados alimentam a página institucional pública.
          </span>
          <>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 font-bold ${
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
                  : 'Aguardando edição'}
          </span>
          {syncStatus === 'saving' && writeTargets.includes('companies') && (
            <span className="ml-2 text-xs font-bold text-amber-700">Gravando em companies</span>
          )}
          </>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Título da Página (Nome)</label>
            <input
              value={formData.name || ''}
              onChange={(e: any) => setFormData((p: any) => ({ ...p, name: e.target.value }))}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              placeholder="Ex: Distribuidora Óptica XYZ"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Headline do Catálogo/Nota Rodapé</label>
            <input
              value={formData.headline || ''}
              onChange={(e: any) => setFormData((p: any) => ({ ...p, headline: e.target.value }))}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              placeholder="Ex: Catálogo Oficial"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Mensagem de Boas-vindas</label>
            <input
              value={formData.welcome_text || ''}
              onChange={(e: any) => setFormData((p: any) => ({ ...p, welcome_text: e.target.value }))}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Cor Primária (Brand)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={(formData.primary_color as string) || '#2563eb'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, primary_color: e.target.value }))}
                className="w-12 h-10 p-0 border rounded-lg"
              />
              <input
                type="text"
                value={(formData.primary_color as string) || '#2563eb'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, primary_color: e.target.value }))}
                className="flex-1 mt-0 p-3 rounded-lg border bg-white text-sm"
                placeholder="#2563eb"
              />
            </div>
          </div>

          {/* header color controls removed — header colors managed by global theme variables */}

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Cor do BG dos Ícones (Header)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={(formData.header_icon_bg_color as string) || 'transparent'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, header_icon_bg_color: e.target.value }))}
                className="w-12 h-10 p-0 border rounded-lg"
              />
              <input
                type="text"
                value={(formData.header_icon_bg_color as string) || 'transparent'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, header_icon_bg_color: e.target.value }))}
                className="flex-1 mt-0 p-3 rounded-lg border bg-white text-sm"
                placeholder="transparent or #fff"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Cor dos Ícones (Header)</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={(formData.header_icon_color as string) || '#1b1b1b'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, header_icon_color: e.target.value }))}
                className="w-12 h-10 p-0 border rounded-lg"
              />
              <input
                type="text"
                value={(formData.header_icon_color as string) || '#1b1b1b'}
                onChange={(e: any) => setFormData((p: any) => ({ ...p, header_icon_color: e.target.value }))}
                className="flex-1 mt-0 p-3 rounded-lg border bg-white text-sm"
                placeholder="#1b1b1b"
              />
            </div>
          </div>

          <div className="col-span-full">
            <label className="text-xs font-bold text-slate-400 uppercase">Conteúdo Institucional — Sobre a página da Empresa</label>
            <div className="mt-2">
              <RichTextEditor
                value={formData.about_text || ''}
                onChange={(html: string) => setFormData((p: any) => ({ ...p, about_text: html }))}
              />
            </div>
          </div>

          {/* Política de Vendas e Envio removida da aba institucional */}

          <div className="col-span-full">
            <label className="text-xs font-bold text-slate-400 uppercase">Imagem de Capa (URL)</label>
            <div className="mt-2 space-y-2">
              {/* preview pequeno removido: usar apenas o preview de "Ajustes da Imagem de Capa" abaixo para edição e posicionamento */}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL da imagem de capa (https://...)"
                  value={formData.cover_image || ''}
                  onChange={(e: any) => setFormData((p: any) => ({ ...p, cover_image: e.target.value || null }))}
                  className="flex-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                />

                <label className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase cursor-pointer ${uploading ? 'bg-slate-500' : 'bg-slate-900 text-white hover:bg-primary'}`}>
                  {uploading ? 'Enviando...' : 'Upload'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e: any) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
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
                        const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file, { upsert: true });
                        if (uploadError) throw uploadError;
                        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
                        setFormData((p: any) => ({ ...p, cover_image: data.publicUrl }));
                      } catch (err: any) {
                        console.error('Erro ao enviar capa institucional:', err);
                      } finally {
                        setUploading(false);
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                        setLocalPreview(null);
                      }
                    }}
                  />
                </label>
                {/* Headline overlay controls + live preview */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 col-span-1">
                    <input
                      type="checkbox"
                      checked={!!formData.show_headline_overlay}
                      onChange={(e) => setFormData((p: any) => ({ ...p, show_headline_overlay: e.target.checked }))}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">Exibir headline sobre a capa</span>
                  </label>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Posição do Overlay</label>
                    <select value={(formData.cover_headline_position as string) || 'center'} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_position: e.target.value }))} className="w-full mt-1 p-3 rounded-xl border bg-white text-sm">
                      <option value="top">Topo</option>
                      <option value="center">Centro</option>
                      <option value="bottom">Inferior</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Cor do Texto (Overlay)</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" value={(formData.headline_text_color as string) || '#ffffff'} onChange={(e) => setFormData((p: any) => ({ ...p, headline_text_color: e.target.value }))} className="w-12 h-10 p-0 border rounded-lg" />
                      <input type="text" value={(formData.headline_text_color as string) || '#ffffff'} onChange={(e) => setFormData((p: any) => ({ ...p, headline_text_color: e.target.value }))} className="flex-1 mt-0 p-3 rounded-lg border bg-white text-sm" />
                    </div>
                    <label className="text-xs font-bold text-slate-400 uppercase mt-2 block">Tamanho do Texto (px)</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="number" min={10} max={120} value={Number((formData as any).cover_headline_font_size || 36)} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_font_size: Number(e.target.value) }))} className="w-24 p-2 rounded-lg border" />
                      <input type="range" min={10} max={120} value={Number((formData as any).cover_headline_font_size || 36)} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_font_size: Number(e.target.value) }))} className="flex-1" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500">Headline Offset X (px)</label>
                        <input type="number" value={Number((formData as any).cover_headline_offset_x || 0)} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_offset_x: Number(e.target.value) }))} className="w-full mt-1 p-2 rounded-lg border" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500">Headline Offset Y (px)</label>
                        <input type="number" value={Number((formData as any).cover_headline_offset_y || 0)} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_offset_y: Number(e.target.value) }))} className="w-full mt-1 p-2 rounded-lg border" />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500">Z-index</label>
                        <input type="number" value={Number((formData as any).cover_headline_z_index || 100)} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_z_index: Number(e.target.value) }))} className="w-full mt-1 p-2 rounded-lg border" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={!!formData.cover_headline_wrap} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_wrap: e.target.checked }))} className="w-5 h-5" />
                        <label className="text-sm">Permitir quebra de linha (wrap)</label>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" checked={!!formData.cover_headline_force_two_lines} onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_force_two_lines: e.target.checked }))} className="w-5 h-5" />
                        <label className="text-sm">Forçar até 2 linhas (frases longas)</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* overlay será renderizado sobre o preview grande (Ajustes da Imagem de Capa) abaixo */}

                <button
                  type="button"
                  onClick={() => {
                    setFormData((p: any) => ({ ...p, cover_image: null }));
                    setLocalPreview(null);
                  }}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm flex items-center gap-2"
                >
                  <X size={14} /> Remover
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-full">
            <label className="text-xs font-bold text-slate-400 uppercase">Ajustes da Imagem de Capa</label>
            <div className="mt-2 grid grid-cols-1 gap-3">
              {/* Live preview */}
              <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative">
                { (localPreview || formData.cover_image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localPreview || formData.cover_image}
                    alt="Preview capa"
                    style={{
                      width: '100%',
                      height: Number((formData as any).cover_image_height || 360),
                      objectFit: (formData as any).cover_image_fit || 'cover',
                      objectPosition: (typeof (formData as any).cover_image_offset_x !== 'undefined' && (formData as any).cover_image_offset_x !== null)
                        ? `${Number((formData as any).cover_image_offset_x)}px ${Number((formData as any).cover_image_offset_y || 0)}px`
                        : ((formData as any).cover_image_position || 'center')
                    }}
                  />
                ) : (
                  <div className="h-48 w-full flex items-center justify-center text-sm text-slate-400">Nenhuma capa definida</div>
                )}

                  {/* Drag-to-pan overlay (captura pointer events para ajustar cover_image_offset_x/y) */}
                  {(localPreview || formData.cover_image) && (
                    <div
                      className={`absolute inset-0`}
                      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                      onPointerDown={(e: any) => {
                        try {
                          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                        } catch (err) {}
                        setIsPanning(true);
                        panStart.current = { x: e.clientX, y: e.clientY };
                        panStartOffsets.current = { ox: Number(formData.cover_image_offset_x || 0), oy: Number(formData.cover_image_offset_y || 0) };
                      }}
                      onPointerMove={(e: any) => {
                        if (!isPanning || !panStart.current || !panStartOffsets.current) return;
                        const dx = Math.round(e.clientX - panStart.current.x);
                        const dy = Math.round(e.clientY - panStart.current.y);
                        const newX = panStartOffsets.current.ox + dx;
                        const newY = panStartOffsets.current.oy + dy;
                        setFormData((p: any) => ({ ...p, cover_image_offset_x: newX, cover_image_offset_y: newY }));
                      }}
                      onPointerUp={(e: any) => {
                        try {
                          (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
                        } catch (err) {}
                        setIsPanning(false);
                        panStart.current = null;
                        panStartOffsets.current = null;
                      }}
                      onPointerCancel={(e: any) => {
                        setIsPanning(false);
                        panStart.current = null;
                        panStartOffsets.current = null;
                      }}
                    />
                  )}

                  {/* Overlay renderizado sobre o preview grande para ajuste real-size */}
                {formData.show_headline_overlay && (formData.headline || formData.welcome_text) && (
                  <div className={`absolute inset-0 flex ${formData.cover_headline_position === 'top' ? 'items-start' : formData.cover_headline_position === 'bottom' ? 'items-end' : 'items-center'} justify-center pointer-events-none`}>
                    <div className="max-w-3xl mx-auto px-3 text-center pointer-events-none" style={{ transform: `translate(${Number((formData as any).cover_headline_offset_x || 0)}px, ${Number((formData as any).cover_headline_offset_y || 0)}px)`, zIndex: Number((formData as any).cover_headline_z_index || 100), whiteSpace: (formData.cover_headline_wrap ? 'normal' : 'nowrap'), maxWidth: formData.cover_headline_force_two_lines ? '48ch' : undefined }}>
                      {formData.headline && (
                        <div className="font-black italic drop-shadow" style={{ color: formData.headline_text_color || '#ffffff', fontSize: `${Number((formData as any).cover_headline_font_size || 36)}px`, lineHeight: 1.05 }}>{formData.headline}</div>
                      )}
                      {formData.welcome_text && (
                        <div className="mt-1" style={{ color: (formData.headline_text_color || '#ffffff'), fontSize: `${Math.max(12, Number((formData as any).cover_headline_font_size || 36) * 0.45)}px` }} dangerouslySetInnerHTML={{ __html: formData.welcome_text }} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Modo (fit)</label>
                  <select
                    value={(formData as any).cover_image_fit || 'cover'}
                    onChange={(e: any) => setFormData((p: any) => ({ ...p, cover_image_fit: e.target.value }))}
                    className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="cover">Cover (preencher)</option>
                    <option value="contain">Contain (encaixar)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Altura (px)</label>
                    <input
                      type="number"
                      min={100}
                      max={1200}
                      value={Number((formData as any).cover_image_height || 360)}
                      onChange={(e: any) => setFormData((p: any) => ({ ...p, cover_image_height: Number(e.target.value) }))}
                      className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Offset X (px)</label>
                    <input
                      type="number"
                      min={-2000}
                      max={2000}
                      value={Number((formData as any).cover_image_offset_x || 0)}
                      onChange={(e: any) => setFormData((p: any) => ({ ...p, cover_image_offset_x: Number(e.target.value) }))}
                      className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Offset Y (px)</label>
                    <input
                      type="number"
                      min={-2000}
                      max={2000}
                      value={Number((formData as any).cover_image_offset_y || 0)}
                      onChange={(e: any) => setFormData((p: any) => ({ ...p, cover_image_offset_y: Number(e.target.value) }))}
                      className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div />
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Alinhamento Vertical</label>
                    <select
                      value={(formData as any).cover_image_position ? String((formData as any).cover_image_position).split(' ')[1] : 'center'}
                      onChange={(e: any) => {
                        const v = e.target.value || 'center';
                        const h = (String((formData as any).cover_image_position || 'center').split(' ')[0]) || 'center';
                        const pos = h === 'center' && v === 'center' ? 'center' : `${h} ${v}`;
                        setFormData((p: any) => ({ ...p, cover_image_position: pos }));
                      }}
                      className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                    >
                      <option value="top">Topo</option>
                      <option value="center">Centro</option>
                      <option value="bottom">Rodapé</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Alinhamento Horizontal</label>
                    <select
                      value={(formData as any).cover_image_position ? String((formData as any).cover_image_position).split(' ')[0] || 'center' : 'center'}
                      onChange={(e: any) => {
                        const h = e.target.value || 'center';
                        const v = (String((formData as any).cover_image_position || 'center').split(' ')[1]) || 'center';
                        const pos = h === 'center' && v === 'center' ? 'center' : `${h} ${v}`;
                        setFormData((p: any) => ({ ...p, cover_image_position: pos }));
                      }}
                      className="w-full mt-1 p-3 rounded-lg border bg-white dark:bg-slate-950 text-sm"
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Headline overlay controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Ajustes do Headline</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Mostrar Headline</label>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!(formData as any).show_headline_overlay}
                    onChange={(e) => {
                      setFormData((p: any) => ({ ...p, show_headline_overlay: !!e.target.checked }));
                      if (quickSave) quickSave({ show_headline_overlay: !!e.target.checked });
                    }}
                  />
                  <span className="text-sm">Exibir sobreposição</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Posição</label>
              <select
                value={(formData as any).cover_headline_position || 'center'}
                onChange={(e) => {
                  setFormData((p: any) => ({ ...p, cover_headline_position: e.target.value }));
                  if (quickSave) quickSave({ cover_headline_position: e.target.value });
                }}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Cor do Texto</label>
              <input
                type="color"
                value={(formData as any).headline_text_color || '#ffffff'}
                onChange={(e) => {
                  setFormData((p: any) => ({ ...p, headline_text_color: e.target.value }));
                  if (quickSave) quickSave({ headline_text_color: e.target.value });
                }}
                className="w-12 h-10 p-0 border rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Tamanho da Fonte (px)</label>
              <input
                type="number"
                value={(formData as any).cover_headline_font_size ?? 36}
                onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_font_size: Number(e.target.value) }))}
                onBlur={(e) => { if (quickSave) quickSave({ cover_headline_font_size: Number((e.target as HTMLInputElement).value) }); }}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Offset X (px)</label>
              <input
                type="number"
                value={(formData as any).cover_headline_offset_x ?? 0}
                onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_offset_x: Number(e.target.value) }))}
                onBlur={(e) => { if (quickSave) quickSave({ cover_headline_offset_x: Number((e.target as HTMLInputElement).value) }); }}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Offset Y (px)</label>
              <input
                type="number"
                value={(formData as any).cover_headline_offset_y ?? 0}
                onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_offset_y: Number(e.target.value) }))}
                onBlur={(e) => { if (quickSave) quickSave({ cover_headline_offset_y: Number((e.target as HTMLInputElement).value) }); }}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Z-index</label>
              <input
                type="number"
                value={(formData as any).cover_headline_z_index ?? 100}
                onChange={(e) => setFormData((p: any) => ({ ...p, cover_headline_z_index: Number(e.target.value) }))}
                onBlur={(e) => { if (quickSave) quickSave({ cover_headline_z_index: Number((e.target as HTMLInputElement).value) }); }}
                className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Quebrar linhas</label>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!(formData as any).cover_headline_wrap}
                    onChange={(e) => {
                      setFormData((p: any) => ({ ...p, cover_headline_wrap: !!e.target.checked }));
                      if (quickSave) quickSave({ cover_headline_wrap: !!e.target.checked });
                    }}
                  />
                  <span className="text-sm">Wrap</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Forçar 2 linhas</label>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!(formData as any).cover_headline_force_two_lines}
                    onChange={(e) => {
                      setFormData((p: any) => ({ ...p, cover_headline_force_two_lines: !!e.target.checked }));
                      if (quickSave) quickSave({ cover_headline_force_two_lines: !!e.target.checked });
                    }}
                  />
                  <span className="text-sm">Forçar duas linhas</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* PDF do Catálogo: Upload + Toggle */}
        <div className="col-span-full border-t border-slate-100 pt-8 mt-4">
          <label className="text-xs font-bold text-slate-400 uppercase">Catálogo em PDF (Arquivo Oficial)</label>
          <div className="mt-3 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {formData.catalog_pdf_url ? 'Catálogo Vinculado' : 'Nenhum PDF selecionado'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">PDF de até 20MB</p>
                </div>
              </div>

              {formData.catalog_pdf_url && (
                <button
                  onClick={() => setFormData((p: any) => ({ ...p, catalog_pdf_url: null }))}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Remover PDF vinculado"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <label className={`cursor-pointer bg-slate-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2`}>
              <Upload size={16} />
              {uploadingPdf ? 'Enviando...' : 'Subir Novo PDF'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  try {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 20 * 1024 * 1024) {
                      addToast({ title: 'O arquivo deve ser menor que 20MB', type: 'error' });
                      return;
                    }
                    setUploadingPdf(true);

                    // Upload via server-side endpoint (uses service role)
                    const slug = String(formData.slug || formData.name || 'company').replace(/[^a-z0-9\-]/gi, '-').toLowerCase();
                    const baseName = `${slug}-catalogo-${Date.now()}`;
                    const fd = new FormData();
                    fd.append('file', file as any);
                    fd.append('filename', baseName);
                    // attach company id if available so server can persist the URL
                    let companyIdToSend = String(formData.id || formData.company_id || '').trim();
                    if (!companyIdToSend) {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user && user.id) {
                          const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
                          companyIdToSend = String((profile as any)?.company_id || '');
                        }
                      } catch (e) {
                        // ignore — we'll send empty and server will skip updating companies
                      }
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
                        addToast({ title: 'Permissão negada', description: 'Apenas administradores da distribuidora podem enviar o catálogo PDF.', type: 'error' });
                        return;
                      }
                      throw new Error(json?.error || 'Upload failed');
                    }
                    setFormData((p: any) => ({ ...p, catalog_pdf_url: json.publicUrl }));
                    addToast({ title: 'Catálogo PDF enviado com sucesso!', type: 'success' });
                  } catch (err: any) {
                    console.error('Erro no upload:', err);
                    addToast({ title: 'Erro ao enviar o PDF', description: err?.message || String(err), type: 'error' });
                  } finally {
                    setUploadingPdf(false);
                  }
                }}
                disabled={uploadingPdf}
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Eye size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Exibir botão de download no Catálogo</p>
                <p className="text-xs text-slate-500 font-medium">Os clientes poderão baixar este PDF no rodapé das páginas.</p>
              </div>
            </div>
            <button
              onClick={() => setFormData((p: any) => ({ ...p, show_pdf_catalog: !p.show_pdf_catalog }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${formData.show_pdf_catalog ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.show_pdf_catalog ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Social networks inputs */}
        <div className="col-span-full mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SocialAutoInput label="Instagram" network="instagram" field="instagram_url" />
            <SocialAutoInput label="Facebook" network="facebook" field="facebook_url" />
            <SocialAutoInput label="LinkedIn" network="linkedin" field="linkedin_url" />
          </div>
        </div>

      </div>
    </div>
  );
}

export default TabInstitucional;
