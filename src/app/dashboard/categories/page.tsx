'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  Layers,
  Edit2,
  X,
  RefreshCw,
  AlertTriangle,
  Users,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

// --- TIPAGEM UNIFICADA ---
interface MetadataItem {
  id: string;
  name: string;
  image_url: string | null;
  type: 'category' | 'gender' | 'material';
}

export default function CategoriesAndGendersPage() {
  const supabase = createClient();
  const formRef = useRef<HTMLDivElement>(null);

  // Estados
  const [activeTab, setActiveTab] = useState<'category' | 'gender' | 'material'>('category');
  const [items, setItems] = useState<MetadataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Formulário e Modal
  const [editingItem, setEditingItem] = useState<MetadataItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    iconFile: null as File | null,
    iconPreview: null as string | null,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = useCallback(async (): Promise<MetadataItem[]> => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      if (activeTab === 'material') {
        // Não existe tabela dedicada a materiais — derivamos dos produtos
        const { data: productsData, error: prodErr } = await supabase
          .from('products')
          .select('material')
          .eq('user_id', user.id)
          .not('material', 'is', null);

        if (prodErr) throw prodErr;

        const unique = Array.from(
          new Set((productsData || []).map((p: any) => (p.material || '').trim()).filter(Boolean))
        );

        const mapped = unique.map((m: string, idx: number) => ({ id: `mat-${idx}`, name: m, image_url: null, type: 'material' }));
        // filter out hidden items for this user (session-scoped)
        const hiddenRaw = sessionStorage.getItem('rv_hidden_metadata_v1');
        const hidden = hiddenRaw ? JSON.parse(hiddenRaw) : {};
        const userHidden = (hidden[user.id] && hidden[user.id].materials) || [];
        const filtered = mapped.filter((m: any) => !userHidden.includes(m.name));
        setItems(filtered as MetadataItem[]);
        return filtered as MetadataItem[];
      } else {
        const table = activeTab === 'category' ? 'categories' : 'product_genders';
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;
        const mapped = (data || []).map((i: any) => ({ ...i, type: activeTab })) as MetadataItem[];
        // ensure we only show items that belong to the logged-in user (defensive check)
        const ownerOnly = mapped.filter((i: any) => (i as any).user_id === user.id);
        // apply per-user hidden list (session-scoped)
        const hiddenRaw = sessionStorage.getItem('rv_hidden_metadata_v1');
        const hidden = hiddenRaw ? JSON.parse(hiddenRaw) : {};
        const userHidden = (hidden[user.id] && hidden[user.id][activeTab]) || [];
        const filtered = ownerOnly.filter((i: any) => !userHidden.includes(i.id));
        setItems(filtered);
        return filtered;
      }
    } catch (error) {
      console.error('fetchItems error', error);
      toast.error('Erro ao carregar dados');
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase, activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading('Sincronizando com produtos...');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Chama a nova função RPC unificada
      const beforeNames = items.map((it) => it.name).sort();
      const { error: rpcErr } = await supabase.rpc('sync_product_metadata', { p_user_id: user.id });
      if (rpcErr) throw rpcErr;

      // Poll a curto prazo para permitir que a sincronização finalize e a lista mude
      const MAX_ATTEMPTS = 6;
      const DELAY_MS = 800;
      let synced = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const fetched = await fetchItems();
        const names = fetched.map((it) => it.name).sort();
        if (JSON.stringify(names) !== JSON.stringify(beforeNames)) {
          synced = true;
          break;
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      toast.success(synced ? 'Sincronização concluída!' : 'Sincronização concluída (sem mudanças detectadas)', { id: toastId });
    } catch (error: any) {
      console.error('handleSync error', error);
      const msg = error?.message || (error?.error && error.error.message) || JSON.stringify(error);

      // Handle missing constraint error (42704) specifically and give actionable guidance
      if (error?.code === '42704' || String(msg).toLowerCase().includes('constraint') && String(msg).toLowerCase().includes('does not exist')) {
        toast.error('Sincronização falhou: constraint ausente no banco. Rode a migração SQL em supabase/sql/sync_product_metadata_safe.sql no seu projeto Supabase (SQL Editor).', { id: toastId });
        try { await fetchItems(); } catch (e) { console.error('fetchItems after 42704 failed', e); }
        return;
      }

      // Handle duplicate-key conflict (23505) with friendlier guidance and refresh
      if (error?.code === '23505' || String(msg).toLowerCase().includes('duplicate key')) {
        let hint = 'Itens duplicados detectados.';
        if (String(msg).includes('uq_categories')) hint += ' Conflito em Categorias.';
        if (String(msg).includes('uq_product_genders')) hint += ' Conflito em Gêneros.';
        toast.error(`Sincronização falhou: ${hint} Verifique o cadastro no admin.`, { id: toastId });
        try { await fetchItems(); } catch (e) { console.error('fetchItems after duplicate error failed', e); }
      } else {
        toast.error(`Erro na sincronização: ${msg}`, { id: toastId });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveMaterialFromProducts = async (materialName: string) => {
    const toastId = toast.loading('Removendo material dos produtos...');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Login necessário');

      // Query ids matching and update in chunks to avoid statement timeout
      const { data: matches, error: selErr } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('material', materialName);

      if (selErr) throw selErr;
      const ids = (matches || []).map((r: any) => r.id).filter(Boolean);
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { error: updErr } = await supabase
          .from('products')
          .update({ material: null })
          .in('id', chunk)
          .eq('user_id', user.id);
        if (updErr) throw updErr;
      }
      toast.success('Material removido dos produtos', { id: toastId });
      fetchItems();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover material', { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let finalUrl = editingItem?.image_url || null;
      if (formData.iconFile) {
        const fileExt = formData.iconFile.name.split('.').pop();
        const path = `metadata/${user.id}/${activeTab}-${Date.now()}.${fileExt}`;
        await supabase.storage
          .from('product-images')
          .upload(path, formData.iconFile);
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);
        finalUrl = data.publicUrl;
      }

      const table = activeTab === 'category' ? 'categories' : 'product_genders';
      const payload = {
        name: formData.name,
        image_url: finalUrl,
        user_id: user.id,
      };

      if (editingItem) {
        await supabase.from(table).update(payload).eq('id', editingItem.id);
        toast.success('Atualizado!');
      } else {
        await supabase.from(table).insert(payload);
        toast.success('Criado!');
      }
      setEditingItem(null);
      setFormData({ name: '', iconFile: null, iconPreview: null });
      fetchItems();
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const toastId = toast.loading('Excluindo...');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Login necessário');
      // Instead of deleting in Supabase, persist a per-user hidden list in sessionStorage
      const hiddenKey = 'rv_hidden_metadata_v1';
      const raw = sessionStorage.getItem(hiddenKey);
      const hidden = raw ? JSON.parse(raw) : {};
      if (!hidden[user.id]) hidden[user.id] = { category: [], gender: [], material: [] };

      if (activeTab === 'material') {
        // deleteId contains the material name in this case
        if (!hidden[user.id].material.includes(deleteId)) hidden[user.id].material.push(deleteId);
        sessionStorage.setItem(hiddenKey, JSON.stringify(hidden));
        // update UI
        setItems((prev) => prev.filter((it) => it.name !== deleteId));
        toast.success('Material ocultado no catálogo virtual', { id: toastId });
        setDeleteId(null);
      } else {
        // for category/gender, deleteId is the metadata id
        const listKey = activeTab === 'category' ? 'category' : 'gender';
        if (!hidden[user.id][listKey].includes(deleteId)) hidden[user.id][listKey].push(deleteId);
        sessionStorage.setItem(hiddenKey, JSON.stringify(hidden));
        setItems((prev) => prev.filter((it) => it.id !== deleteId));
        toast.success('Item ocultado no catálogo virtual', { id: toastId });
        setDeleteId(null);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir', { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER COM TABS */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 dark:border-slate-800 pb-4 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600">
              <Layers size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-balance">
              Organização do Catálogo
            </h1>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('category')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'category' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <Tag size={16} /> Categorias
            </button>
            <button
              onClick={() => setActiveTab('gender')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gender' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <Users size={16} /> Gêneros
            </button>
            <button
              onClick={() => setActiveTab('material')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'material' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
            >
              <Tag size={16} /> Materiais
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          leftIcon={
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          }
        >
          Buscar dos Produtos
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1" ref={formRef}>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">
              {editingItem
                ? `Editar ${activeTab === 'category' ? 'Categoria' : activeTab === 'gender' ? 'Gênero' : 'Material'}`
                : `Novo ${activeTab === 'category' ? 'Categoria' : activeTab === 'gender' ? 'Gênero' : 'Material'}`}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full p-3 rounded-xl border dark:bg-slate-950 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                value={formData.name}
                placeholder="Nome ex: Masculino, Solar..."
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                required
              />

              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-slate-300 dark:border-slate-700 overflow-hidden relative group bg-slate-50/50">
                {formData.iconPreview ? (
                  <img
                    src={formData.iconPreview}
                    className="h-full w-full object-contain p-4"
                    alt="Preview"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Upload className="mx-auto mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Subir Ícone
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      setFormData((p) => ({
                        ...p,
                        iconFile: file,
                        iconPreview: URL.createObjectURL(file),
                      }));
                  }}
                />
              </label>

              <div className="flex gap-2">
                {editingItem && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingItem(null);
                      setFormData({
                        name: '',
                        iconFile: null,
                        iconPreview: null,
                      });
                    }}
                  >
                    <X />
                  </Button>
                )}
                <Button type="submit" isLoading={submitting} className="flex-1">
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* LISTAGEM EM CARDS */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center relative hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {item.type !== 'material' && (
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({
                            name: item.name,
                            iconFile: null,
                            iconPreview: item.image_url,
                          });
                          formRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg text-slate-600 hover:text-primary"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    {item.type === 'material' ? (
                      <button
                        onClick={() => setDeleteId(item.name)}
                        className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg text-red-600 hover:text-red-700"
                        title="Remover material dos produtos"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg text-red-600 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 overflow-hidden border border-slate-100 dark:border-slate-700">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        className="w-full h-full object-cover"
                        alt={item.name}
                      />
                    ) : item.type === 'category' ? (
                      <Tag className="text-slate-300" size={30} />
                    ) : item.type === 'gender' ? (
                      <Users className="text-slate-300" size={30} />
                    ) : (
                      <div className="text-slate-400 font-bold text-sm">{String(item.name).slice(0,2)}</div>
                    )}
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-xs tracking-widest">
                    {item.name}
                  </h4>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Excluir {activeTab === 'category' ? 'Categoria' : activeTab === 'gender' ? 'Gênero' : 'Material'}?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Esta ação é permanente e removerá também referências no seu catálogo virtual.
              Deseja continuar?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="py-3 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
