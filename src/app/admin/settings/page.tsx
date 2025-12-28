'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Save,
  Upload,
  Image as ImageIcon,
  Loader2,
  Layout,
  Smartphone,
} from 'lucide-react';
import { SYSTEM_FONTS } from '@/lib/fonts';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/utils/getErrorMessage';

interface PlatformSettings {
  system_name: string;
  logo_url: string | null;
  primary_color: string;
  font_family?: string | null;
  font_url?: string | null;
  support_email: string;
  support_phone: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    system_name: '',
    logo_url: null,
    primary_color: '#4f46e5', // Cor default (Indigo)
    font_family: null,
    font_url: null,
    support_email: '',
    support_phone: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para Upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const supabase = createClient();

  const [globalFont, setGlobalFont] = useState<string | null>(null);
  const [globalAllowCustomFonts, setGlobalAllowCustomFonts] =
    useState<boolean>(true);

  // 1. Carregar Configurações ao abrir
  useEffect(() => {
    fetchSettings();
  }, []);

  // buscar config global para preview de fonte
  useEffect(() => {
    let mounted = true;
    fetch('/api/global_config')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setGlobalFont(j?.font_family ?? null);
        setGlobalAllowCustomFonts(
          typeof j?.allow_custom_fonts === 'boolean'
            ? j.allow_custom_fonts
            : true
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // injetar Google Font do global se necessário
  useEffect(() => {
    if (!globalFont) return;
    const f = SYSTEM_FONTS.find((x) => x.name === globalFont);
    if (!f || !f.import) return;
    if (document.querySelector(`link[data-rv-font="${f.name}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = f.import as string;
    l.setAttribute('data-rv-font', f.name);
    document.head.appendChild(l);
  }, [globalFont]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      // Se der erro de não encontrado, usamos os defaults
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          system_name: data.system_name || '',
          logo_url: data.logo_url,
          primary_color: data.primary_color || '#4f46e5',
          font_family: data.font_family ?? null,
          font_url: data.font_url ?? null,
          support_email: data.support_email || '',
          support_phone: data.support_phone || '',
        });
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    } catch (error: unknown) {
      logger.error('Erro ao carregar configurações', error);
      toast.error('Erro ao carregar configurações', {
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Manipular Arquivo de Logo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Upload de fonte global (extraiido do JSX para evitar aninhamento pesado)
  const handleGlobalFontUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('name', f.name.replace(/\.(woff2|woff|ttf|otf)$/i, ''));
    try {
      const res = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json?.url) {
        setSettings((p) => ({
          ...p,
          font_family:
            json.name || f.name.replace(/\.(woff2|woff|ttf|otf)$/i, ''),
          font_url: json.url,
        }));
        toast.success('Fonte global enviada');
      } else {
        toast.error('Erro ao enviar fonte global');
      }
    } catch (err) {
      console.error('upload global font', err);
      toast.error('Erro no upload');
    }
  };

  // 3. Salvar Tudo
  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Salvando configurações...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      let finalLogoUrl = settings.logo_url;

      // Upload da Logo (se o usuário selecionou um arquivo novo)
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        // Salva numa pasta 'system' para separar das fotos de produtos
        const fileName = `system/logo-${Date.now()}.${fileExt}`;

        // Usamos o bucket 'product-images' pois já está configurado e público
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        finalLogoUrl = urlData.publicUrl;
      }

      // Upsert na tabela (Sempre ID 1)
      const basePayload: any = {
        id: 1,
        system_name: settings.system_name,
        primary_color: settings.primary_color,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        logo_url: finalLogoUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      // Tentativa inicial incluindo campos de fonte (caso a coluna exista)
      const payloadWithFonts = {
        ...basePayload,
        font_family: settings.font_family ?? null,
        font_url: settings.font_url ?? null,
      };

      let upsertError: any = null;
      try {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(payloadWithFonts);
        if (error) throw error;
      } catch (err: any) {
        upsertError = err;
      }

      // Se falhou por causa de schema (coluna ausente), tentamos sem os campos de fonte
      if (upsertError) {
        const message = String(upsertError?.message || upsertError);
        if (
          upsertError?.code === 'PGRST116' ||
          /font_family/.test(message) ||
          /font_url/.test(message)
        ) {
          const { error: err2 } = await supabase
            .from('platform_settings')
            .upsert(basePayload);
          if (err2) throw err2;
        } else {
          throw upsertError;
        }
      }

      toast.success('Configurações salvas!', {
        id: toastId,
        description: 'O sistema será recarregado para aplicar as mudanças.',
      });

      // Atualiza estado local se mudou a URL
      if (finalLogoUrl !== settings.logo_url) {
        setSettings((prev) => ({ ...prev, logo_url: finalLogoUrl }));
      }

      // --- RECARREGAR PÁGINA ---
      // Necessário para atualizar o Header e Sidebar que são estáticos/globais
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: unknown) {
      logger.error('Erro ao salvar configurações', error);
      toast.error('Erro ao salvar', {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Configurações do Sistema
        </h1>
        <p className="text-gray-500">
          Personalize a identidade visual e contatos da sua plataforma SaaS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* COLUNA 1: FORMULÁRIOS */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Aparência */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Layout size={20} className="text-[var(--primary)]" /> Identidade
              Visual
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Sistema
                </label>
                <input
                  type="text"
                  value={settings.system_name}
                  onChange={(e) =>
                    setSettings({ ...settings, system_name: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                  placeholder="Ex: RepVendas Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor Principal (Marca)
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative overflow-hidden rounded-lg border border-gray-300 dark:border-slate-600 w-24 h-10">
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primary_color: e.target.value,
                        })
                      }
                      className="absolute -top-2 -left-2 w-[150%] h-[200%] cursor-pointer p-0 border-0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-bold mb-1">
                      Preview do Botão
                    </span>
                    <button
                      className="px-4 py-1.5 rounded-lg text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      Botão Exemplo
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Essa cor será usada em botões, links e destaques no painel do
                  cliente.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fonte Global (Torre de Controle)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Envie uma fonte customizada (woff2 recomendado) que será usada
                  como padrão para lojas que não escolheram sua própria fonte.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf"
                    onChange={handleGlobalFontUpload}
                    className=""
                  />
                  {settings.font_url && (
                    <div className="text-sm text-gray-600">
                      {settings.font_family} —{' '}
                      <a
                        href={settings.font_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        ver
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fonte do Sistema
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Escolha a fonte padrão que será aplicada quando o lojista não
                  escolher uma fonte customizada.
                </p>

                {/* Preview da fonte global */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2">
                    Fonte Global (Torre de Controle)
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 dark:bg-slate-950 flex items-center justify-between">
                    <div>
                      <div
                        style={{
                          fontFamily:
                            SYSTEM_FONTS.find((s) => s.name === globalFont)
                              ?.family || 'Inter, system-ui',
                        }}
                        className="text-lg"
                      >
                        Aa Bb Cc
                      </div>
                      <div className="text-[10px] font-bold text-gray-600 mt-1">
                        {globalFont || 'Inter (padrão)'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {globalAllowCustomFonts
                        ? 'Customização habilitada'
                        : 'Customização bloqueada'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() =>
                      setSettings((p) => ({ ...p, font_family: null }))
                    }
                    className={`p-3 rounded-lg border text-left ${settings.font_family === null ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="text-lg">Aa Bb Cc</div>
                    <div className="text-[10px] font-bold text-gray-600 mt-1">
                      Padrão do Sistema
                    </div>
                  </button>
                  {SYSTEM_FONTS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() =>
                        setSettings((p) => ({ ...p, font_family: f.name }))
                      }
                      style={{ fontFamily: f.family }}
                      className={`p-3 rounded-lg border text-left ${settings.font_family === f.name ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="text-lg">Aa Bb Cc</div>
                      <div className="text-[10px] font-bold text-gray-600 mt-1">
                        {f.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Contato e Suporte */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Smartphone size={20} className="text-green-500" /> Contato de
              Suporte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  value={settings.support_phone}
                  onChange={(e) =>
                    setSettings({ ...settings, support_phone: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email de Suporte
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) =>
                    setSettings({ ...settings, support_email: e.target.value })
                  }
                  className="w-full p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                  placeholder="suporte@seudominio.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 2: LOGOTIPO */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-blue-500" /> Logotipo
            </h2>

            <div className="flex flex-col items-center">
              <label className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors relative overflow-hidden group bg-white dark:bg-slate-950">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-full h-full object-contain p-4 z-10"
                  />
                ) : (
                  <div className="text-center text-gray-400 z-10">
                    <Upload size={32} className="mx-auto mb-2 opacity-50" />
                    <span className="text-sm font-medium">Carregar Logo</span>
                    <p className="text-xs mt-1 opacity-70">
                      PNG, JPG (Max 2MB)
                    </p>
                  </div>
                )}

                {/* Overlay Hover */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <span className="text-white text-sm font-bold flex items-center gap-2">
                    <Upload size={16} />{' '}
                    {logoPreview ? 'Trocar Imagem' : 'Selecionar'}
                  </span>
                </div>

                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Aparecerá no Login, Sidebar e Header. Recomendado: fundo
                transparente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de Ação */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 flex justify-end md:static md:bg-transparent md:border-0 md:p-0 md:mt-8 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ backgroundColor: settings.primary_color }}
        >
          {saving ? (
            <Loader2 className="animate-spin text-white" size={20} />
          ) : (
            <Save size={20} />
          )}
          Salvar Alterações Globais
        </button>
      </div>
    </div>
  );
}
