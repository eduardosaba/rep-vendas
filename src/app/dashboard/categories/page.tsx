'use client';

import { useState, useEffect } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner'; // Feedback Padrão
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  Layers,
  Image as ImageIcon,
  Edit2,
  X,
  RefreshCw,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  image_url: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const supabase = sharedSupabase;

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSyncFromProducts = async () => {
    setSyncing(true);
    const toastId = toast.loading('Analisando produtos...'); // Inicia loading

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('category')
        .eq('user_id', user.id)
        .not('category', 'is', null);

      if (prodError) throw prodError;

      const distinctCategories = Array.from(new Set(
        productsData
          .map(p => p.category?.trim())
          .filter(c => c && c.length > 0)
      )) as string[];

      const existingNames = categories.map(c => c.name.toLowerCase());
      const newCategories = distinctCategories.filter(
        catName => !existingNames.includes(catName.toLowerCase())
      );

      if (newCategories.length === 0) {
        toast.info('Tudo atualizado', {
          id: toastId,
          description: 'Nenhuma categoria nova encontrada nos produtos.'
        });
        return;
      }

      const toInsert = newCategories.map(name => ({
        user_id: user.id,
        name: name,
        image_url: null 
      }));

      const { error: insertError } = await supabase.from('categories').insert(toInsert);
      if (insertError) throw insertError;

      toast.success('Sincronização concluída!', {
        id: toastId, // Substitui o loading
        description: `${newCategories.length} categorias importadas com sucesso.`
      });
      
      fetchCategories(); 

    } catch (error: any) {
      toast.error('Erro ao sincronizar', { 
        id: toastId,
        description: error.message 
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setIconPreview(category.image_url);
    setIconFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewName('');
    setIconFile(null);
    setIconPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    setSubmitting(true);
    const toastId = toast.loading(iconFile ? 'Enviando imagem e salvando...' : 'Salvando categoria...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      let imageUrl = editingCategory ? editingCategory.image_url : null;

      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `${user.id}/cat-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`categories/${fileName}`, iconFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(`categories/${fileName}`);

        imageUrl = data.publicUrl;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: newName, image_url: imageUrl })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada!', { id: toastId });
      } else {
        const { error } = await supabase.from('categories').insert({
          user_id: user.id,
          name: newName,
          image_url: imageUrl,
        });

        if (error) throw error;
        toast.success('Categoria criada com sucesso!', { id: toastId });
      }

      handleCancelEdit();
      fetchCategories();
    } catch (error: any) {
      toast.error('Erro ao salvar', { 
        id: toastId,
        description: error.message 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Usamos toast.promise para feedback visual de exclusão se demorar
    // Mas como é rápido, um confirm + toast success resolve.
    if (!confirm('Tem certeza? Os produtos desta categoria ficarão sem classificação.')) return;

    const toastId = toast.loading('Removendo...');

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingCategory?.id === id) handleCancelEdit();
      
      toast.success('Categoria removida', { id: toastId });
    } catch (error: any) {
      toast.error('Erro ao remover', { 
        id: toastId,
        description: error.message 
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
            <p className="text-sm text-gray-500">
              Organize os departamentos do seu catálogo.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSyncFromProducts}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Buscando...' : 'Buscar dos Produtos'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO */}
        <div className="lg:col-span-1">
          <div className={`p-6 rounded-xl border shadow-sm sticky top-6 transition-colors ${editingCategory ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-200'}`}>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {editingCategory ? <Edit2 size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />}
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome</label>
                <input
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Solar, Receituário..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ícone / Capa (Opcional)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-gray-300 overflow-hidden relative group bg-white">
                  {iconPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconPreview} className="h-full w-full object-contain p-2 z-10" alt="Preview" />
                  ) : (
                    <div className="text-center text-gray-400 z-10">
                      <Upload className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <span className="text-xs font-medium">Clique para enviar</span>
                    </div>
                  )}
                  {iconPreview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="text-white text-xs font-bold">Trocar</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="flex gap-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || !newName}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : editingCategory ? 'Atualizar' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* LISTA */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100">
              <Loader2 className="animate-spin mx-auto text-primary h-8 w-8" />
              <p className="text-gray-400 mt-2 text-sm">Carregando...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <Layers className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-gray-900 font-medium text-lg">Nenhuma categoria</h3>
              <p className="text-gray-500 text-sm mt-1">Cadastre manualmente ou busque dos produtos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col items-center relative group transition-all hover:shadow-md ${editingCategory?.id === cat.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'}`}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-gray-100 z-10">
                    <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="h-16 w-16 flex items-center justify-center mb-3 bg-gray-50 rounded-full text-gray-400 overflow-hidden border border-gray-200 group-hover:border-primary/30 transition-colors">
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image_url} className="w-full h-full object-cover" alt={cat.name} />
                    ) : (
                      <Layers size={24} />
                    )}
                  </div>

                  <h4 className="font-bold text-center text-gray-800 text-sm truncate w-full px-1" title={cat.name}>
                    {cat.name}
                  </h4>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}