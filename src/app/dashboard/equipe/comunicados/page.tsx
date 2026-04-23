'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  id: '',
  title: '',
  content: '',
  is_published: true,
};

export default function ComunicadosEquipePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/announcements', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Não foi possível carregar comunicados');
      }
      setAnnouncements((json.data || []) as Announcement[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar comunicados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const publishedCount = useMemo(
    () => announcements.filter((a) => a.is_published).length,
    [announcements]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      toast.error('Preencha título e conteúdo do comunicado');
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const payload = {
        id: form.id || undefined,
        title,
        content,
        is_published: form.is_published,
      };

      const res = await fetch('/api/company/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao salvar comunicado');
      }

      toast.success(editingId ? 'Comunicado atualizado' : 'Comunicado publicado');
      resetForm();
      loadAnnouncements();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar comunicado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/company/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao excluir comunicado');
      }

      toast.success('Comunicado removido');
      if (editingId === id) resetForm();
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir comunicado');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      id: item.id,
      title: item.title || '',
      content: item.content || '',
      is_published: Boolean(item.is_published),
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/equipe"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 inline-flex items-center gap-2">
              <Megaphone size={20} /> Comunicados da Distribuidora
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Publique avisos internos para todos os representantes da empresa.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4">
        <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
          {publishedCount} comunicado(s) publicado(s)
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Itens não publicados ficam em rascunho e nao aparecem no painel do representante.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide font-bold text-slate-500">
            {editingId ? 'Editar comunicado' : 'Novo comunicado'}
          </h2>
          {editingId ? (
            <button
              onClick={resetForm}
              className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>

        <input
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Titulo do aviso"
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
        />

        <textarea
          value={form.content}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          placeholder="Mensagem para os representantes"
          rows={4}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
        />

        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) =>
              setForm((p) => ({ ...p, is_published: e.target.checked }))
            }
          />
          Publicar imediatamente
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary,#2563eb)] text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : editingId ? (
            <>
              <Save size={16} /> Atualizar
            </>
          ) : (
            <>
              <Plus size={16} /> Criar comunicado
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="h-44 flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-10 text-center text-slate-500">
          Nenhum comunicado cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-slate-900 dark:text-slate-50">
                  {item.title}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    item.is_published
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.is_published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {item.content}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => startEdit(item)}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 disabled:opacity-60"
                >
                  {deletingId === item.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
