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
import { Button } from '@/components/ui/Button';

// --- TIPAGEM UNIFICADA ---
interface MetadataItem {
  id: string;
  name: string;
  image_url: string | null;
  type: 'category' | 'gender';
}

export default function CategoriesAndGendersPage() {
  const supabase = createClient();
  const formRef = useRef<HTMLDivElement>(null);

  // Estados
  const [activeTab, setActiveTab] = useState<'category' | 'gender'>('category');
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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const table = activeTab === 'category' ? 'categories' : 'product_genders';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setItems(data.map((i: any) => ({ ...i, type: activeTab })));
    } catch (error) {
      toast.error('Erro ao carregar dados');
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
      await supabase.rpc('sync_product_metadata', { p_user_id: user.id });

      toast.success('Sincronização concluída!', { id: toastId });
      fetchItems();
    } catch (error) {
      toast.error('Erro na sincronização', { id: toastId });
    } finally {
      setSyncing(false);
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

      const table = activeTab === 'category' ? 'categories' : 'product_genders';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Excluído!', { id: toastId });
      setDeleteId(null);
      fetchItems();
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
                ? `Editar ${activeTab === 'category' ? 'Categoria' : 'Gênero'}`
                : `Novo ${activeTab === 'category' ? 'Categoria' : 'Gênero'}`}
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
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-lg text-red-600 hover:text-red-700"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
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
                    ) : (
                      <Users className="text-slate-300" size={30} />
                    )}
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">
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
              Excluir {activeTab === 'category' ? 'Categoria' : 'Gênero'}?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Esta ação é permanente e removerá também referências nos produtos.
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
