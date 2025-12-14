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
  AlertTriangle, // Ícone de alerta adicionado
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// --- TIPAGEM ---
interface Category {
  id: string;
  name: string;
  image_url: string | null;
}

interface CategoryFormData {
  name: string;
  iconFile: File | null;
  iconPreview: string | null;
}

const INITIAL_FORM_DATA: CategoryFormData = {
  name: '',
  iconFile: null,
  iconPreview: null,
};

// --- COMPONENTE DE CARD (UI Isolada) ---
const CategoryCard = ({
  category,
  isEditing,
  onEdit,
  onRequestDelete, // Mudamos o nome para deixar claro que solicita a exclusão
}: {
  category: Category;
  isEditing: boolean;
  onEdit: (c: Category) => void;
  onRequestDelete: (id: string) => void;
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm flex flex-col items-center relative group transition-all hover:shadow-md ${
        isEditing
          ? 'border-primary ring-1 ring-primary'
          : 'border-gray-200 dark:border-slate-800 hover:border-primary/50'
      }`}
    >
      {/* Ações (Hover) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-slate-700 z-10">
        <button
          onClick={() => onEdit(category)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
          title="Editar"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onRequestDelete(category.id)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Ícone / Imagem */}
      <div className="h-16 w-16 flex items-center justify-center mb-3 bg-gray-50 dark:bg-slate-800 rounded-full text-gray-400 dark:text-slate-600 overflow-hidden border border-gray-200 dark:border-slate-700 group-hover:border-primary/30 transition-colors">
        {category.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image_url}
            className="w-full h-full object-cover"
            alt={category.name}
          />
        ) : (
          <Layers size={24} />
        )}
      </div>

      {/* Nome */}
      <h4
        className="font-bold text-center text-gray-800 dark:text-gray-200 text-sm truncate w-full px-1"
        title={category.name}
      >
        {category.name}
      </h4>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function CategoriesPage() {
  const supabase = createClient();
  const formRef = useRef<HTMLDivElement>(null);

  // Estados
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estado para o Modal de Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulário
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(INITIAL_FORM_DATA);

  // --- AÇÕES ---

  const fetchCategories = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Sincronização OTIMIZADA com RPC
  const handleSyncFromProducts = async () => {
    setSyncing(true);
    const toastId = toast.loading('Analisando produtos...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('sync_categories', {
        current_user_id: user.id,
      });

      if (error) throw error;

      toast.success('Sincronização concluída!', {
        id: toastId,
        description: 'Categorias novas foram importadas.',
      });

      fetchCategories();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao sincronizar', {
        id: toastId,
        description: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      iconFile: null,
      iconPreview: category.image_url,
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        iconFile: file,
        iconPreview: URL.createObjectURL(file),
      }));
    }
  };

  const uploadImage = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/categories/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(`categories/${fileName}`, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(`categories/${fileName}`);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setSubmitting(true);
    const toastId = toast.loading(
      formData.iconFile ? 'Enviando imagem...' : 'Salvando categoria...'
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      let finalImageUrl = editingCategory?.image_url ?? null;

      if (formData.iconFile) {
        finalImageUrl = await uploadImage(user.id, formData.iconFile);
      }

      const payload = {
        name: formData.name,
        image_url: finalImageUrl,
        user_id: user.id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: payload.name, image_url: payload.image_url })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada!', { id: toastId });
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
        toast.success('Categoria criada!', { id: toastId });
      }

      resetForm();
      fetchCategories();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar', {
        id: toastId,
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Solicita exclusão (Abre o modal)
  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  // 2. Confirma exclusão (Executa a ação)
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;

      setCategories((prev) => prev.filter((c) => c.id !== deleteId));
      if (editingCategory?.id === deleteId) resetForm();

      toast.success('Categoria removida com sucesso.');
    } catch (error: any) {
      toast.error('Não foi possível excluir', { description: error.message });
    } finally {
      setIsDeleting(false);
      setDeleteId(null); // Fecha o modal
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Categorias
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organize os departamentos do seu catálogo.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleSyncFromProducts}
          disabled={syncing}
          className="active:scale-95 transition-transform"
          leftIcon={
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          }
        >
          {syncing ? 'Buscando...' : 'Buscar dos Produtos'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO (Sticky Sidebar) */}
        <div className="lg:col-span-1" ref={formRef}>
          <div
            className={`p-6 rounded-xl border shadow-sm sticky top-6 transition-all duration-300 ${
              editingCategory
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 dark:bg-primary/10 dark:border-primary/20'
                : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {editingCategory ? (
                <Edit2 size={18} className="text-primary" />
              ) : (
                <Plus size={18} className="text-primary" />
              )}
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                  Nome
                </label>
                <input
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white dark:bg-slate-950 dark:text-white"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Solar, Receituário..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  Ícone / Capa (Opcional)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-gray-300 dark:border-slate-700 overflow-hidden relative group bg-white dark:bg-slate-950">
                  {formData.iconPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.iconPreview}
                      className="h-full w-full object-contain p-2 z-10"
                      alt="Preview"
                    />
                  ) : (
                    <div className="text-center text-gray-400 dark:text-gray-500 z-10">
                      <Upload className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <span className="text-xs font-medium">
                        Clique para enviar
                      </span>
                    </div>
                  )}
                  {formData.iconPreview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="text-white text-xs font-bold">
                        Trocar
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    title="Cancelar"
                  >
                    <X size={20} />
                  </button>
                )}
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={!formData.name}
                  className="flex-1 shadow-md"
                  leftIcon={submitting ? undefined : <Plus size={18} />}
                >
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* LISTA (Grid) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 min-h-[300px]">
              <Loader2 className="animate-spin text-primary h-8 w-8 mb-2" />
              <p className="text-gray-400 mt-2 text-sm">Carregando...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[300px]">
              <Layers className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600 mb-3" />
              <h3 className="text-gray-900 dark:text-white font-medium text-lg">
                Nenhuma categoria
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                Cadastre manualmente ou clique em "Buscar dos Produtos" para
                importar automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isEditing={editingCategory?.id === cat.id}
                  onEdit={handleEdit}
                  onRequestDelete={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Excluir Categoria?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Esta ação é irreversível. Produtos associados a esta categoria
                ficarão "Sem Categoria".
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 size={16} className="animate-spin" />}
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
