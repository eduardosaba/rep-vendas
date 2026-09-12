'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  Eye,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageBuilder from '@/components/dashboard/company/PageBuilder';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const RESERVED_SLUGS = [
  'empresa',
  'produtos',
  'checkout',
  'cart',
  'login',
  'register',
  'sobre',
  'admin',
  'api',
  'dashboard',
  'settings',
  'catalogo',
];

function generateSlug(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function CompanyPagesManager() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [companySlug, setCompanySlug] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [autoSlugMode, setAutoSlugMode] = useState<boolean>(true);
  const [content, setContent] = useState<unknown>('{}');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Carregar dados da distribuidora e lista de páginas
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Resolve company slug
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, catalog_slug')
          .eq('id', user.id)
          .maybeSingle();

        let resolvedSlug = profile?.catalog_slug || '';
        if (!resolvedSlug && profile?.company_id) {
          const { data: comp } = await supabase
            .from('companies')
            .select('slug')
            .eq('id', profile.company_id)
            .maybeSingle();
          resolvedSlug = comp?.slug || '';
        }
        setCompanySlug(resolvedSlug);
      }

      // 2. Fetch pages via API
      const res = await fetch('/api/company/pages');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setPages(json.data);
      } else {
        toast.error(json?.error || 'Erro ao carregar páginas');
      }
    } catch (err: any) {
      toast.error('Falha ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSlugReserved = useMemo(() => {
    return RESERVED_SLUGS.includes(slug.trim().toLowerCase());
  }, [slug]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (autoSlugMode && !editingId) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setAutoSlugMode(true);
    setContent('{}');
    setIsActive(true);
  };

  const handleSelectPage = (page: any) => {
    setEditingId(page.id);
    setTitle(page.title || '');
    setSlug(page.slug || '');
    setAutoSlugMode(false);
    setContent(page.content || '{}');
    setIsActive(!!page.is_active);
  };

  const handleSavePage = async () => {
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim().toLowerCase();

    if (!trimmedTitle) {
      toast.error('Informe o título da página');
      return;
    }
    if (!trimmedSlug) {
      toast.error('Informe o slug da página');
      return;
    }
    if (isSlugReserved) {
      toast.error(`O slug "${trimmedSlug}" é reservado pelo sistema. Por favor escolha outro.`);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: trimmedTitle,
        slug: trimmedSlug,
        content,
        is_active: isActive,
      };

      let res: Response;
      if (editingId) {
        payload.id = editingId;
        res = await fetch('/api/company/pages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/company/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Erro ao salvar página');
        return;
      }

      toast.success(editingId ? 'Página atualizada com sucesso!' : 'Página criada com sucesso!');
      await loadData();
      if (!editingId && json.data?.id) {
        setEditingId(json.data.id);
      }
    } catch (err: any) {
      toast.error('Erro na comunicação com a API');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (id: string, pageTitle: string) => {
    if (!confirm(`Deseja realmente excluir a página "${pageTitle}"?`)) return;

    try {
      const res = await fetch('/api/company/pages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.error || 'Erro ao excluir página');
        return;
      }

      toast.success('Página excluída com sucesso');
      if (editingId === id) handleResetForm();
      await loadData();
    } catch (err) {
      toast.error('Erro ao excluir página');
    }
  };

  const filteredPages = useMemo(() => {
    if (!searchTerm.trim()) return pages;
    const term = searchTerm.toLowerCase();
    return pages.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(term)) ||
        (p.slug && p.slug.toLowerCase().includes(term))
    );
  }, [pages, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header com indicador e instrução */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Globe className="text-primary" size={24} /> Páginas Personalizadas da Empresa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Crie páginas institucionais e regulatórias adicionais (ex: Política de Trocas, Garantia, Entregas e Prazos, FAQ, Termos).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData} disabled={loading} size="sm">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
          <Button variant="primary" onClick={handleResetForm} size="sm">
            <Plus size={16} /> Nova Página
          </Button>
        </div>
      </div>

      {/* Grid Principal: Lista à Esquerda | Construtor à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Lista de Páginas */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <FileText size={16} /> Suas Páginas ({pages.length})
            </h3>
          </div>

          <input
            type="text"
            placeholder="Buscar página..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-primary/20"
          />

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <Loader2 className="animate-spin" size={16} /> Carregando páginas...
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma página encontrada. Clique em <strong>Nova Página</strong> para começar.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredPages.map((page) => {
                const isEditing = editingId === page.id;
                const publicUrl = companySlug
                  ? `/catalogo/${companySlug}/empresa/p/${page.slug}`
                  : null;

                return (
                  <div
                    key={page.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEditing
                        ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleSelectPage(page)}
                      >
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {page.title || page.slug}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          /p/{page.slug}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          page.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {page.is_active ? 'Ativa' : 'Rascunho'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                      {publicUrl ? (
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          title="Ver página no catálogo público"
                        >
                          <ExternalLink size={12} /> Ver Pública
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sem slug público</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSelectPage(page)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePage(page.id, page.title || page.slug)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel Direito: Formulário e Construtor de Páginas (PageBuilder) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-slate-800 dark:text-white">
                {editingId ? 'Editar Página' : 'Criar Nova Página'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingId
                  ? 'Modifique o conteúdo e salve as alterações.'
                  : 'Preencha o título e monte os blocos da página.'}
              </p>
            </div>

            {editingId && companySlug && slug && (
              <a
                href={`/catalogo/${companySlug}/empresa/p/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                <Eye size={14} /> Ver Pública
              </a>
            )}
          </div>

          {/* Dados Principais: Título, Slug e Status */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Título da Página
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Política de Trocas e Devoluções"
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="md:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Slug URL (/p/...)
                </label>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => setAutoSlugMode(!autoSlugMode)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {autoSlugMode ? 'Manual' : 'Auto'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setAutoSlugMode(false);
                  setSlug(generateSlug(e.target.value));
                }}
                placeholder="ex: politica-de-trocas"
                className={`w-full p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm font-mono focus:ring-2 ${
                  isSlugReserved
                    ? 'border-red-400 focus:ring-red-200 text-red-600'
                    : 'border-slate-200 dark:border-slate-800 focus:ring-primary/20'
                }`}
              />
              {isSlugReserved && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <ShieldAlert size={12} /> O slug "{slug}" é um caminho reservado pelo sistema.
                </p>
              )}
            </div>

            <div className="md:col-span-12 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status da Página:
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isActive ? 'Publicada e Ativa' : 'Rascunho (Inativa)'}
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Construtor de Blocos (PageBuilder) */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Conteúdo da Página (Blocos Visuais)
            </label>
            <PageBuilder value={content} pageTitle={title} onChange={(c) => setContent(c)} />
          </div>

          {/* Ações Inferiores */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            {editingId && (
              <Button variant="outline" onClick={handleResetForm}>
                Cancelar Edição
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleSavePage}
              disabled={saving || isSlugReserved}
              className="px-6"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Página'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
