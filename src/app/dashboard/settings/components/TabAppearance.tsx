import { SYSTEM_FONTS } from '@/lib/fonts';
import {
  Brush,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function TabAppearance(props: any) {
  const {
    THEME_PRESETS,
    applyTheme,
    selectedThemeName,
    logoPreview,
    supabase,
    setLogoPreview,
    formData,
    setFormData,
    SYSTEM_FONTS: _sf = SYSTEM_FONTS,
    applyDashboardFont,
    catalogSettings,
    setCatalogSettings,
    uploadBannersToStorage,
    currentBanners,
    setCurrentBanners,
    currentBannersMobile,
    setCurrentBannersMobile,
    moveBanner,
    moveBannerMobile,
  } = props;

  // Garantir que banners sejam arrays para evitar erros ao usar .map
  const safeCurrentBanners = Array.isArray(currentBanners)
    ? currentBanners
    : [];
  const safeCurrentBannersMobile = Array.isArray(currentBannersMobile)
    ? currentBannersMobile
    : [];
  const [copyToMobile, setCopyToMobile] = useState(true);
  const [bannerMode, setBannerMode] = useState<string | null>(null);

  // initialize bannerMode from incoming settings/formData when available
  useEffect(() => {
    try {
      const initial =
        (catalogSettings && (catalogSettings as any).banner_mode) ||
        (formData && formData.banner_mode) ||
        null;
      setBannerMode(initial);
    } catch (e) {
      // ignore
    }
  }, [catalogSettings, formData]);

  useEffect(() => {
    try {
      setFormData((prev: any) => ({
        ...(prev || {}),
        banners: Array.isArray(currentBanners) ? currentBanners : [],
        banners_mobile: copyToMobile
          ? Array.isArray(currentBanners)
            ? currentBanners
            : []
          : Array.isArray(currentBannersMobile)
            ? currentBannersMobile
            : [],
      }));

      // also update mobile state when copying is enabled so UI controls reflect the same list
      if (copyToMobile) {
        try {
          setCurrentBannersMobile?.(
            Array.isArray(currentBanners) ? currentBanners : []
          );
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // setFormData may be optional; ignore failures
    }
  }, [currentBanners, currentBannersMobile, setFormData, copyToMobile]);

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-8">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Brush size={18} /> Identidade e Banners
        </h3>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Brush size={18} /> Sugestões de Estilo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {THEME_PRESETS.map((theme: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  applyTheme(theme);
                  try {
                    setFormData((prev: any) => ({
                      ...(prev || {}),
                      primary_color: theme.primary,
                      secondary_color: theme.secondary,
                      ...(theme.footer_background_color
                        ? {
                            footer_background_color:
                              theme.footer_background_color,
                          }
                        : {}),
                      ...(theme.footer_text_color
                        ? { footer_text_color: theme.footer_text_color }
                        : {}),
                      ...(theme.footerBackground
                        ? { footer_background_color: theme.footerBackground }
                        : {}),
                      ...(theme.footerTextColor
                        ? { footer_text_color: theme.footerTextColor }
                        : {}),
                    }));
                  } catch (e) {
                    // ignore if setFormData not provided
                  }
                  try {
                    setCatalogSettings((prev: any) => ({
                      ...(prev || {}),
                      primary_color: theme.primary,
                      secondary_color: theme.secondary,
                      ...(theme.footer_background_color
                        ? {
                            footer_background_color:
                              theme.footer_background_color,
                          }
                        : {}),
                      ...(theme.footer_text_color
                        ? { footer_text_color: theme.footer_text_color }
                        : {}),
                      ...(theme.footerBackground
                        ? { footer_background_color: theme.footerBackground }
                        : {}),
                      ...(theme.footerTextColor
                        ? { footer_text_color: theme.footerTextColor }
                        : {}),
                    }));
                  } catch (e) {
                    // ignore if setCatalogSettings not provided
                  }
                  toast.success(
                    `Tema ${theme.name} selecionado! Clique em salvar.`
                  );
                }}
                className={`group flex flex-col gap-3 p-3 rounded-2xl border-2 transition-all text-left ${selectedThemeName === theme.name ? 'border-primary bg-slate-50 shadow-lg' : 'border-slate-100 hover:border-primary hover:bg-slate-50'}`}
                aria-pressed={selectedThemeName === theme.name}
                title={theme.name}
              >
                <div className="flex h-10 w-full rounded-lg overflow-hidden border border-slate-200">
                  <div
                    className="w-1/2 h-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div
                    className="w-1/4 h-full"
                    style={{ backgroundColor: theme.secondary }}
                  />
                  <div
                    className="w-1/4 h-full"
                    style={{ backgroundColor: theme.header }}
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-500 group-hover:text-primary">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-xs font-black uppercase text-slate-500">
                Logo da Marca
              </label>
              <div className="h-48 w-full border-2 border-dashed rounded-[2rem] flex items-center justify-center bg-slate-50 relative group">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    className="max-h-full p-6 object-contain"
                  />
                ) : (
                  <ImageIcon className="text-slate-200" size={64} />
                )}
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]">
                  <span className="text-white font-black text-[10px] uppercase tracking-widest bg-primary px-4 py-2 rounded-xl">
                    Alterar Logo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e: any) => {
                      const file = e.target.files?.[0];
                      const inputEl = e.currentTarget; // captura antes do await
                      if (!file) return;
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) throw new Error('Usuário não autenticado');
                        const fileExt = file.name.split('.').pop();
                        const fileName = `logo-${Date.now()}.${fileExt}`;
                        const filePath = `${user.id}/branding/${fileName}`;
                        const { error: uploadError } = await supabase.storage
                          .from('product-images')
                          .upload(filePath, file, { upsert: true });
                        if (uploadError) throw uploadError;
                        const { data } = supabase.storage
                          .from('product-images')
                          .getPublicUrl(filePath);
                        // update preview and form state
                        setLogoPreview?.(data.publicUrl);
                        try {
                          setFormData((p: any) => ({
                            ...p,
                            logo_url: data.publicUrl,
                          }));
                        } catch (e) {
                          // ignore if setFormData not provided
                        }
                        toast.success('Logo enviada com sucesso');
                        // reset input value so same file can be reselected
                        if (inputEl) inputEl.value = '';
                      } catch (err: any) {
                        console.error('Erro ao fazer upload da logo:', err);
                        toast.error(
                          'Falha no upload da logo: ' +
                            (err?.message || String(err))
                        );
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Capa institucional movida para aba Institucional (admin da distribuidora) */}

            <div className="col-span-full md:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-3">
                Fonte do Sistema
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Escolha a fonte principal usada na sidebar e no catálogo
                público. Você pode pré-visualizar antes de salvar.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <select
                  value={formData.font_family || ''}
                  onChange={async (e: any) => {
                    const selectedName = e.target.value || null;
                    const preset =
                      _sf.find((p: any) => p.name === selectedName) || null;
                    setFormData((p: any) => ({
                      ...p,
                      font_family: selectedName,
                      font_url: preset?.import ?? null,
                    }));
                    try {
                      if (preset && typeof window !== 'undefined') {
                        applyDashboardFont(preset.name);
                      } else if (!selectedName) {
                        applyDashboardFont(null);
                      }
                    } catch (err) {
                      console.warn('applyDashboardFont failed', err);
                    }
                  }}
                  className="p-3 rounded-lg border bg-white dark:bg-slate-950 dark:border-slate-700 text-sm w-full sm:w-72"
                >
                  <option value="">Inter (Padrão)</option>
                  {_sf.map((f: any) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <div className="flex-1">
                  <label className="text-xs text-gray-500">
                    URL da fonte (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="URL para carregar fonte (ex: Google Fonts)"
                    value={formData.font_url || ''}
                    onChange={(e: any) =>
                      setFormData((p: any) => ({
                        ...p,
                        font_url: e.target.value || null,
                      }))
                    }
                    className="w-full p-3 rounded-lg border bg-white dark:bg-slate-950 dark:border-slate-700 text-sm"
                  />
                  <div className="text-xs text-gray-400 mt-2">
                    Se você fornecer uma URL, ela será usada ao salvar e
                    sobrescreverá o preset selecionado.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
              <label className="text-xs font-black uppercase text-slate-500 block">
                Cores do Tema
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="space-y-5 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">
                    Primária
                  </span>
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color || ''}
                    onChange={(e: any) => {
                      const v = e.target.value;
                      try {
                        setFormData((p: any) => ({ ...p, primary_color: v }));
                      } catch (err) {}
                      try {
                        setCatalogSettings((p: any) => ({
                          ...(p || {}),
                          primary_color: v,
                        }));
                      } catch (err) {}
                    }}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="space-y-5 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">
                    Secundária
                  </span>
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color || ''}
                    onChange={(e: any) => {
                      const v = e.target.value;
                      try {
                        setFormData((p: any) => ({ ...p, secondary_color: v }));
                      } catch (err) {}
                      try {
                        setCatalogSettings((p: any) => ({
                          ...(p || {}),
                          secondary_color: v,
                        }));
                      } catch (err) {}
                    }}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">
                    Rodapé (Fundo)
                  </span>
                  <input
                    type="color"
                    name="footer_background_color"
                    value={formData.footer_background_color || ''}
                    onChange={(e: any) => {
                      const v = e.target.value;
                      try {
                        setFormData((p: any) => ({
                          ...p,
                          footer_background_color: v,
                        }));
                      } catch (err) {}
                    }}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">
                    Rodapé (Texto)
                  </span>
                  <input
                    type="color"
                    name="footer_text_color"
                    value={formData.footer_text_color || ''}
                    onChange={(e: any) => {
                      const v = e.target.value;
                      try {
                        setFormData((p: any) => ({
                          ...p,
                          footer_text_color: v,
                        }));
                      } catch (err) {}
                    }}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos de Catálogo movidos para aba Institucional (admin da distribuidora) */}

          <div className="mt-6 bg-white dark:bg-slate-900 p-4 rounded-[1rem] border border-gray-200 shadow-sm">
            <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
              Modo de exibição dos Banners
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {['fit', 'fill', 'stretch'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    // persist banner_mode to formData/catalogSettings so it will be saved
                    setBannerMode(mode);
                    try {
                      setCatalogSettings((p: any) => ({
                        ...(p || {}),
                        banner_mode: mode,
                        ...(copyToMobile ? { banner_mode_mobile: mode } : {}),
                      }));
                    } catch (e) {}
                    try {
                      setFormData((p: any) => ({
                        ...(p || {}),
                        banner_mode: mode,
                        ...(copyToMobile ? { banner_mode_mobile: mode } : {}),
                      }));
                    } catch (e) {}
                  }}
                  className={`px-3 py-2 rounded-xl border transition-all text-xs whitespace-nowrap ${
                    bannerMode === mode
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {mode === 'fit'
                    ? 'Ajustar (Contain)'
                    : mode === 'fill'
                      ? 'Preencher (Cover)'
                      : 'Esticar'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Escolha como os banners serão ajustados no catálogo público.
              'Ajustar' evita corte da imagem.
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-500">
                Banners Desktop (1400x400)
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyToMobile}
                    onChange={(e) => setCopyToMobile(Boolean(e.target.checked))}
                    className="w-4 h-4"
                  />
                  <span className="text-xs font-medium">
                    Copiar para mobile
                  </span>
                </label>
                <label className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase cursor-pointer hover:bg-primary transition-colors">
                  Adicionar{' '}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={async (e: any) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      try {
                        const urls = await uploadBannersToStorage(
                          files,
                          'desktop'
                        );
                        if (Array.isArray(urls) && urls.length > 0) {
                          const next = [...safeCurrentBanners, ...urls].filter(
                            (v, idx, arr) => arr.indexOf(v) === idx
                          );
                          setCurrentBanners(next);
                          if (copyToMobile) setCurrentBannersMobile(next);
                          toast.success('Banners enviados com sucesso');
                        } else {
                          toast.error('Nenhum banner foi gerado');
                        }
                      } catch (err) {
                        console.error('Erro ao enviar banners:', err);
                        toast.error('Falha ao enviar banners');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeCurrentBanners.map((url: string, i: number) => (
                <div
                  key={i}
                  className="relative aspect-[14/4] rounded-2xl overflow-hidden group border-2 border-transparent hover:border-primary transition-all shadow-md"
                >
                  {url ? (
                    <img src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                      Imagem indisponível
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => moveBanner(i, 'up')}
                      disabled={i === 0}
                      className="p-2 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-lg hover:scale-110 transition-transform"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveBanner(i, 'down')}
                      disabled={i === safeCurrentBanners.length - 1}
                      className="p-2 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-lg hover:scale-110 transition-transform"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      onClick={() => {
                        const next = safeCurrentBanners.filter(
                          (_: any, idx: number) => idx !== i
                        );
                        setCurrentBanners(next);
                      }}
                      className="p-2 bg-red-500 rounded-full text-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-black px-2 py-1 rounded-md uppercase">
                    Posição: {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-500">
                Banners Mobile (768x400)
              </label>
              <label className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase cursor-pointer hover:bg-primary transition-colors">
                Adicionar{' '}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={async (e: any) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    try {
                      const urls = await uploadBannersToStorage(
                        files,
                        'mobile'
                      );
                      if (Array.isArray(urls) && urls.length > 0) {
                        const next = [
                          ...safeCurrentBannersMobile,
                          ...urls,
                        ].filter((v, idx, arr) => arr.indexOf(v) === idx);
                        setCurrentBannersMobile(next);
                        toast.success('Banners mobile enviados com sucesso');
                      } else {
                        toast.error('Nenhum banner mobile foi gerado');
                      }
                    } catch (err) {
                      console.error('Erro ao enviar banners mobile:', err);
                      toast.error('Falha ao enviar banners mobile');
                    }
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(safeCurrentBannersMobile && safeCurrentBannersMobile.length
                ? safeCurrentBannersMobile
                : safeCurrentBanners
              ).map((url: string, i: number) => (
                <div
                  key={i}
                  className="relative aspect-video rounded-2xl overflow-hidden group border shadow-sm border-transparent hover:border-primary transition-all"
                >
                  {url ? (
                    <img src={url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                      Imagem indisponível
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => moveBannerMobile(i, 'up')}
                      disabled={i === 0}
                      className="p-1.5 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-md"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveBannerMobile(i, 'down')}
                      disabled={
                        i ===
                        (safeCurrentBannersMobile &&
                        safeCurrentBannersMobile.length
                          ? safeCurrentBannersMobile.length - 1
                          : safeCurrentBanners
                            ? safeCurrentBanners.length - 1
                            : 0)
                      }
                      className="p-1.5 bg-white rounded-full text-slate-900 disabled:opacity-30 shadow-md"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={() => {
                        const src =
                          safeCurrentBannersMobile &&
                          safeCurrentBannersMobile.length
                            ? safeCurrentBannersMobile
                            : safeCurrentBanners;
                        const next = src.filter(
                          (_: any, idx: number) => idx !== i
                        );
                        setCurrentBannersMobile(next);
                      }}
                      className="p-1.5 bg-red-500 rounded-full text-white shadow-md"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabAppearance;
