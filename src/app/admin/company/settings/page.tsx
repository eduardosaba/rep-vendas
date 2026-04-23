'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Palette,
  Info,
  Building2,
  Plus,
  Trash2,
  Globe,
  Pencil,
  X,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import PageBuilder from '@/components/dashboard/company/PageBuilder';
import { companyPageContentToHtml } from '@/lib/company-page-content';

type CompanyPageRow = {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  is_active: boolean;
};

type TabKey = 'comercial' | 'cms';

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('comercial');
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [companyPages, setCompanyPages] = useState<CompanyPageRow[]>([]);
  const [editingPages, setEditingPages] = useState<
    Record<string, { title: string; slug: string; content: unknown; is_active: boolean; saving?: boolean }>
  >({});
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
    content: '{}' as unknown,
    is_active: true,
  });

  const [sobreDraft, setSobreDraft] = useState<{ id?: string; title: string; content: unknown; is_active: boolean }>({
    title: 'Nossa História',
    content: '{}',
    is_active: true,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const [settings, setSettings] = useState({
    id: '',
    slug: '',
    catalog_slug: '',
    about_text: '',
      // shipping_policy removed
    primary_color: '#10b981',
    secondary_color: '#2563EB',
    contact_email: '',
    name: '',
    logo_url: '',
    cover_image: '',
    headline: '',
    welcome_text: '',
    support_whatsapp: '',
    hide_prices_globally: false,
    commission_trigger: 'liquidez',
    default_commission_rate: 5,
    require_customer_approval: true,
    block_new_orders: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [companyRes, pagesRes] = await Promise.all([
          fetch('/api/companies/me'),
          fetch('/api/company/pages'),
        ]);
        const json = await companyRes.json();
        const pagesJson = await pagesRes.json();
        if (!mounted) return;
        if (json.success && json.data) {
          setSettings((s) => ({ ...s, ...json.data }));
        } else {
          toast.error(json.error || 'NÃ£o foi possÃ­vel carregar dados da empresa');
        }

        if (pagesJson?.success) {
          setCompanyPages(Array.isArray(pagesJson.data) ? pagesJson.data : []);
          // inicializa rascunho de 'sobre' se existir
          const sobre = Array.isArray(pagesJson.data) ? pagesJson.data.find((p: any) => p.slug === 'sobre') : null;
          if (sobre) setSobreDraft({ id: sobre.id, title: sobre.title || 'Nossa História', content: sobre.content || '', is_active: Boolean(sobre.is_active) });
        }
      } catch (err) {
        toast.error('Erro ao carregar dados da empresa');
      } finally {
        if (mounted) {
          setLoading(false);
          setPagesLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const refreshPages = async () => {
    try {
      setPagesLoading(true);
      const res = await fetch('/api/company/pages');
      const json = await res.json();
      if (json?.success) {
        setCompanyPages(Array.isArray(json.data) ? json.data : []);
      }
    } catch {
      // ignore
    } finally {
      setPagesLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch('/api/companies/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Configurações atualizadas!');
      } else {
        toast.error(json.error || 'Falha ao salvar');
      }
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreatePage = async () => {
    if (!newPage.title.trim() || !newPage.slug.trim()) {
      toast.error('Informe título e slug da página');
      return;
    }

    try {
      setSavingPage(true);
      const res = await fetch('/api/company/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPage),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Falha ao criar página');
        return;
      }

      toast.success('Página criada com sucesso');
      setNewPage({ title: '', slug: '', content: '{}', is_active: true });
      await refreshPages();
    } catch {
      toast.error('Erro ao criar página');
    } finally {
      setSavingPage(false);
    }
  };

  const handleSaveSobre = async () => {
    try {
      setSavingPage(true);
      if (sobreDraft.id) {
        const res = await fetch('/api/company/pages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sobreDraft.id, title: sobreDraft.title, slug: 'sobre', content: sobreDraft.content, is_active: sobreDraft.is_active }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          toast.error(json?.error || 'Falha ao atualizar Nossa História');
          return;
        }
        toast.success('Nossa História atualizada');
      } else {
        const res = await fetch('/api/company/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sobreDraft.title || 'Nossa História', slug: 'sobre', content: sobreDraft.content, is_active: sobreDraft.is_active }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          toast.error(json?.error || 'Falha ao criar Nossa História');
          return;
        }
        toast.success('Nossa História criada');
      }
      await refreshPages();
    } catch (err) {
      toast.error('Erro ao salvar Nossa História');
    } finally {
      setSavingPage(false);
    }
  };

  const openPreview = (title: string, content: unknown) => {
    setPreviewTitle(title || 'Pré-visualização');
    setPreviewHtml(companyPageContentToHtml(content, title || 'Pré-visualização'));
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewHtml('');
    setPreviewTitle('');
  };

  const generatedPageHref = (slug: string) => {
    if (!settings.id || !slug) return '#';
    return `/generated_pages/${settings.id}/${String(slug).toLowerCase()}.html`;
  };

  const handleDeletePage = async (id: string) => {
    try {
      const res = await fetch('/api/company/pages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Falha ao remover página');
        return;
      }
      toast.success('Página removida');
      await refreshPages();
    } catch {
      toast.error('Erro ao remover página');
    }
  };

  const startEditPage = (page: CompanyPageRow) => {
    setEditingPages((prev) => ({
      ...prev,
      [page.id]: {
        title: page.title || '',
        slug: page.slug || '',
        content: page.content || '',
        is_active: Boolean(page.is_active),
      },
    }));
  };

  const cancelEditPage = (id: string) => {
    setEditingPages((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const updateEditField = (
    id: string,
    field: 'title' | 'slug' | 'content' | 'is_active',
    value: unknown
  ) => {
    setEditingPages((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { title: '', slug: '', content: '', is_active: true }),
        [field]: value,
      },
    }));
  };

  const handleUpdatePage = async (id: string) => {
    const draft = editingPages[id];
    if (!draft) return;
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast.error('Título e slug são obrigatórios');
      return;
    }

    try {
      updateEditField(id, 'title', draft.title);
      setEditingPages((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: true },
      }));

      const res = await fetch('/api/company/pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: draft.title,
          slug: draft.slug,
          content: draft.content,
          is_active: draft.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Falha ao atualizar página');
        return;
      }

      toast.success('Página atualizada');
      await refreshPages();
      cancelEditPage(id);
    } catch {
      toast.error('Erro ao atualizar página');
    } finally {
      setEditingPages((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || draft), saving: false },
      }));
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Gestão da Distribuidora</h1>
        <p className="text-slate-500">Perfil administrativo da empresa: branding, comercial e páginas extras do catálogo.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {[{ key: 'comercial', label: 'Comercial' }, { key: 'cms', label: 'Páginas CMS' }].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 'Institucional' and 'Branding' tabs removed — managed centrally in system settings */}

        {activeTab === 'comercial' && (
          <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
              <h3 className="font-bold">Privacidade B2B</h3>
              <p className="text-sm text-slate-500">Controle mestre para links de venda dos representantes e checkout publico.</p>

              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={Boolean(settings.hide_prices_globally)} onChange={(e) => setSettings({ ...settings, hide_prices_globally: e.target.checked })} className="mt-0.5" />
                <span><strong>Ocultar precos globalmente</strong><br />Todos os links de venda passam a exibir "Preco sob consulta".</span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={Boolean(settings.require_customer_approval)} onChange={(e) => setSettings({ ...settings, require_customer_approval: e.target.checked })} className="mt-0.5" />
                <span><strong>Exigir aprovacao de novo cliente</strong><br />Pedidos com cliente novo entram como pendentes para aprovacao interna.</span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={Boolean(settings.block_new_orders)} onChange={(e) => setSettings({ ...settings, block_new_orders: e.target.checked })} className="mt-0.5" />
                <span><strong>Bloquear novos pedidos no catalogo</strong><br />Mantem vitrine ativa, mas bloqueia envio de pedidos via checkout.</span>
              </label>

              <div className="pt-2">
                <Link href="/dashboard/equipe/comunicados" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:underline">
                  Gerenciar mural de comunicados para representantes
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
              <h3 className="font-bold">Regra de Comissão</h3>
              <p className="text-sm text-slate-500">Defina uma única regra de maturação da comissão para toda a distribuidora.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Gatilho de Comissão</span>
                  <select value={settings.commission_trigger} onChange={(e) => setSettings({ ...settings, commission_trigger: e.target.value === 'faturamento' ? 'faturamento' : 'liquidez' })} className="w-full mt-1 p-3 bg-slate-50 rounded-xl">
                    <option value="liquidez">Liquidez</option>
                    <option value="faturamento">Faturamento</option>
                  </select>
                </label>

                <label className="text-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Taxa padrão (%)</span>
                  <input type="number" min={0} max={100} step="0.01" value={settings.default_commission_rate} onChange={(e) => setSettings({ ...settings, default_commission_rate: Number(e.target.value) || 0 })} className="w-full mt-1 p-3 bg-slate-50 rounded-xl" />
                </label>
              </div>
            </div>
          </>
        )}

        {activeTab === 'cms' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
            <h3 className="font-bold flex items-center gap-2"><Globe size={18} /> Páginas Extras (CMS)</h3>
            <p className="text-sm text-slate-500">Crie páginas como sobre-nos, marca-própria e políticas. O conteúdo agora usa editor rico.</p>

            {/* Editor específico para 'Nossa História' */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-semibold">Nossa História (Página institucional)</h4>
              <p className="text-sm text-slate-500">Conteúdo exibido em /empresa/sobre. Você também pode editar a imagem de capa abaixo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Título</label>
                  <input value={sobreDraft.title} onChange={(e) => setSobreDraft((s) => ({ ...s, title: e.target.value }))} className="w-full mt-1 p-3 bg-white rounded-xl border border-slate-200" />
                </div>
                {/* Imagem de capa agora é gerenciada na aba Institucional */}
              </div>

              <div className="mt-3">
                <label className="text-xs font-bold text-slate-400 uppercase">Conteúdo</label>
                <div className="mt-1">
                  <PageBuilder
                    value={sobreDraft.content}
                    pageTitle={sobreDraft.title}
                    onChange={(serialized) => setSobreDraft((s) => ({ ...s, content: serialized }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                {settings.id ? (
                  <a
                    href={generatedPageHref('sobre')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <ExternalLink size={16} /> Abrir HTML gerado
                  </a>
                ) : null}
                <Button variant="ghost" onClick={() => openPreview(sobreDraft.title, sobreDraft.content)}>
                  <Eye size={16} /> Visualizar
                </Button>
                <Button variant="ghost" onClick={() => { setSobreDraft({ id: undefined, title: 'Nossa História', content: '{}', is_active: true }); }}>
                  Reset
                </Button>
                <Button onClick={handleSaveSobre} disabled={savingPage} className="gap-2">
                  <Save size={16} /> Salvar Nossa História
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Título</label>
                <input
                  value={newPage.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewPage((prev) => ({
                      ...prev,
                      title,
                      slug: prev.slug || title.toLowerCase().trim().replace(/\s+/g, '-'),
                    }));
                  }}
                  className="w-full mt-1 p-3 bg-slate-50 rounded-xl"
                  placeholder="Sobre Nós"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Slug</label>
                <input value={newPage.slug} onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 rounded-xl" placeholder="sobre-nos" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Conteúdo da página</label>
              <div className="mt-1">
                <PageBuilder
                  value={newPage.content}
                  pageTitle={newPage.title}
                  onChange={(serialized) => setNewPage((prev) => ({ ...prev, content: serialized }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => openPreview(newPage.title || 'Pré-visualização', newPage.content)}>
                <Eye size={16} /> Visualizar
              </Button>
              <Button onClick={handleCreatePage} disabled={savingPage} className="gap-2">
                <Plus size={16} /> Criar Página
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              {pagesLoading ? (
                <p className="text-sm text-slate-500">Carregando páginas...</p>
              ) : companyPages.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma página criada ainda.</p>
              ) : (
                companyPages.map((page) => {
                  const edit = editingPages[page.id];
                  const isEditing = Boolean(edit);
                  return (
                    <div key={page.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      {!isEditing ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-800">{page.title}</p>
                            <p className="text-xs text-slate-500">/catalogo/{settings.slug || settings.catalog_slug}/empresa/p/{page.slug}</p>
                            {settings.id ? (
                              <a
                                href={generatedPageHref(page.slug)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                              >
                                <ExternalLink size={12} /> Abrir HTML gerado
                              </a>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => startEditPage(page)} className="text-slate-700 hover:text-slate-900">
                              <Pencil size={16} />
                            </Button>
                            <Button variant="ghost" onClick={() => handleDeletePage(page.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input value={edit.title} onChange={(e) => updateEditField(page.id, 'title', e.target.value)} className="w-full p-3 bg-white rounded-xl border border-slate-200" placeholder="TÃ­tulo" />
                            <input value={edit.slug} onChange={(e) => updateEditField(page.id, 'slug', e.target.value)} className="w-full p-3 bg-white rounded-xl border border-slate-200" placeholder="Slug" />
                          </div>

                          <PageBuilder
                            value={edit.content}
                            pageTitle={edit.title}
                            onChange={(serialized) => updateEditField(page.id, 'content', serialized)}
                          />

                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={Boolean(edit.is_active)} onChange={(e) => updateEditField(page.id, 'is_active', e.target.checked)} />
                            PÃ¡gina ativa
                          </label>

                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => openPreview(edit.title, edit.content)}>
                              <Eye size={16} /> Visualizar
                            </Button>
                            <Button variant="ghost" onClick={() => cancelEditPage(page.id)}>
                              <X size={16} /> Cancelar
                            </Button>
                            <Button onClick={() => handleUpdatePage(page.id)} disabled={Boolean(edit.saving)} className="gap-2">
                              <Save size={16} /> Salvar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={savingSettings} className="h-14 px-10 rounded-2xl gap-2 text-lg shadow-lg">
          <Save size={20} /> Salvar Alterações
        </Button>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={closePreview} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 overflow-auto max-h-[80vh]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{previewTitle}</h2>
              </div>
              <div>
                <Button variant="ghost" onClick={closePreview}><X size={16} /></Button>
              </div>
            </div>
            <div className="mt-4 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
