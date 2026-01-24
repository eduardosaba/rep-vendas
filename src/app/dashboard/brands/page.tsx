'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/errorUtils';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Tag,
  Percent,
  Image as ImageIcon,
  Edit2,
  X,
  RefreshCw,
  AlertTriangle, // Novo ícone para o modal
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import SmartImageUpload from '@/components/SmartImageUpload';

// --- TIPAGEM ---
interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  commission_percent: number;
}

interface BrandFormData {
  name: string;
  commission: string;
  logoFile: File | null;
  logoPreview: string | null;
}

const INITIAL_FORM_DATA: BrandFormData = {
  name: '',
  commission: '',
  logoFile: null,
  logoPreview: null,
};

// --- COMPONENTE DE CARD (UI Isolada) ---
const BrandCard = ({
  brand,
  isEditing,
  onEdit,
  onRequestDelete, // Nome atualizado para clareza
}: {
  brand: Brand;
  isEditing: boolean;
  onEdit: (b: Brand) => void;
  onRequestDelete: (id: string) => void;
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm relative group hover:shadow-md transition-all ${
        isEditing
          ? 'border-primary ring-1 ring-primary'
          : 'border-gray-200 dark:border-slate-800 hover:border-primary/50'
      }`}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-0.5 z-10 border border-gray-100 dark:border-slate-700">
        <button
          onClick={() => onEdit(brand)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
          title="Editar"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onRequestDelete(brand.id)}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="h-20 w-full flex items-center justify-center mb-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 overflow-hidden group-hover:border-primary/20 transition-colors">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            className="w-full h-full object-contain p-2"
            alt={brand.name}
          />
        ) : (
          <span className="text-2xl font-bold text-gray-300 dark:text-slate-600 uppercase select-none">
            {brand.name.substring(0, 2)}
          </span>
        )}
      </div>

      <h4
        className="font-bold text-center text-gray-800 dark:text-gray-200 truncate px-1"
        title={brand.name}
      >
        {brand.name}
      </h4>

      {brand.commission_percent > 0 ? (
        <div className="mt-3 text-center">
          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] px-2 py-1 rounded-full font-bold border border-green-100 dark:border-green-900/30 inline-flex items-center gap-1">
            <Percent size={10} /> {brand.commission_percent}% Comis.
          </span>
        </div>
      ) : (
        <div className="mt-3 h-6"></div>
      )}
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function BrandsPage() {
  const supabase = createClient();
  const formRef = useRef<HTMLDivElement>(null);
  const tempLogoUrlRef = useRef<string | null>(null);

  // Estados de Dados
  const [brands, setBrands] = useState<Brand[]>([]);

  // Estados de UI/Loading
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estado para o Modal de Exclusão
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados do Formulário
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(INITIAL_FORM_DATA);

  // --- AÇÕES ---

  const fetchBrands = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error: unknown) {
      console.error(getErrorMessage(error));
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Função OTIMIZADA com RPC (SQL)
  const handleSyncFromProducts = async () => {
    setSyncing(true);
    const toastId = toast.loading('Sincronizando marcas do catálogo...');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('sync_brands', {
        p_user_id: user.id,
      });

      if (error) throw error;

      toast.success('Marcas sincronizadas com sucesso!', {
        id: toastId,
        description: 'Novas marcas foram importadas automaticamente.',
      });

      fetchBrands();
    } catch (error: unknown) {
      console.error(getErrorMessage(error));
      toast.error('Erro ao sincronizar', {
        id: toastId,
        description:
          getErrorMessage(error) ||
          'Verifique se a função sync_brands foi criada no banco.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const resetForm = () => {
    setEditingBrand(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      commission: brand.commission_percent
        ? String(brand.commission_percent)
        : '',
      logoFile: null,
      logoPreview: brand.logo_url,
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // replaced by SmartImageUpload usage in the form below

  const uploadLogo = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    // Store under brands/{userId}/{timestamp}.{ext}
    const key = `brands/${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(key, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('product-images').getPublicUrl(key);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSubmitting(true);

    const toastId = toast.loading(
      formData.logoFile ? 'Enviando logo...' : 'Salvando alterações...'
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');

      let finalLogoUrl = editingBrand?.logo_url ?? null;

      // If the user uploaded in background, `formData.logoPreview` may already
      // contain the public URL returned by the upload. Prefer that when it's
      // a remote URL (starts with http). Otherwise, if a file is present,
      // upload it now.
      if (
        formData.logoPreview &&
        typeof formData.logoPreview === 'string' &&
        formData.logoPreview.startsWith('http')
      ) {
        finalLogoUrl = formData.logoPreview;
      } else if (formData.logoFile) {
        finalLogoUrl = await uploadLogo(user.id, formData.logoFile);
      }

      const payload = {
        name: formData.name,
        commission_percent: Number(formData.commission) || 0,
        logo_url: finalLogoUrl,
        user_id: user.id,
      };

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({
            name: payload.name,
            commission_percent: payload.commission_percent,
            logo_url: payload.logo_url,
          })
          .eq('id', editingBrand.id);
        if (error) throw error;
        toast.success('Marca atualizada!', { id: toastId });
      } else {
        const { error } = await supabase.from('brands').insert(payload);
        if (error) throw error;
        toast.success('Marca criada!', { id: toastId });
      }

      resetForm();
      fetchBrands();
    } catch (error: unknown) {
      console.error(getErrorMessage(error));
      toast.error('Erro ao salvar', {
        id: toastId,
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Solicita Exclusão (Abre Modal)
  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  // 2. Confirma Exclusão (Executa)
  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;

      setBrands((prev) => prev.filter((b) => b.id !== deleteId));
      if (editingBrand?.id === deleteId) resetForm();

      toast.success('Marca removida com sucesso.');
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      toast.error('Erro ao remover', { description: msg });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shadow-sm">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Marcas & Comissões
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie fabricantes e logotipos para o catálogo.
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncFromProducts}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 active:scale-95"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Buscar dos Produtos'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULÁRIO (Sidebar Sticky) */}
        <div className="lg:col-span-1" ref={formRef}>
          <div
            className={`p-6 rounded-xl border shadow-sm sticky top-6 transition-all duration-300 ${
              editingBrand
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 dark:bg-primary/10 dark:border-primary/20'
                : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {editingBrand ? (
                <Edit2 size={18} className="text-primary" />
              ) : (
                <Plus size={18} className="text-primary" />
              )}
              {editingBrand ? 'Editar Marca' : 'Nova Marca'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                  Nome da Marca *
                </label>
                <input
                  className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white dark:bg-slate-950 dark:text-white"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Nike, Adidas..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                  Comissão (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2.5 pl-9 border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white dark:bg-slate-950 dark:text-white"
                    value={formData.commission}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        commission: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                  <Percent
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Opcional. Auxilia no cálculo de relatórios.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  Logotipo
                </label>
                <div>
                  <SmartImageUpload
                    onUploadReady={async (file) => {
                      try {
                        // show temporary preview
                        const objectURL = URL.createObjectURL(file as File);
                        setFormData((prev) => ({
                          ...prev,
                          logoFile: file as File,
                          logoPreview: objectURL,
                        }));
                        tempLogoUrlRef.current = objectURL;

                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) return;

                        const publicUrl = await uploadLogo(
                          user.id,
                          file as File
                        );

                        setFormData((prev) => {
                          if (prev.logoPreview === objectURL) {
                            return {
                              ...prev,
                              logoPreview: publicUrl,
                              logoFile: null,
                            };
                          }
                          return prev;
                        });
                      } catch (err) {
                        console.error('Erro upload logo (Smart):', err);
                        toast.error('Falha ao enviar logo. Tente novamente.');
                      } finally {
                        try {
                          if (tempLogoUrlRef.current) {
                            URL.revokeObjectURL(tempLogoUrlRef.current);
                            tempLogoUrlRef.current = null;
                          }
                        } catch {}
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingBrand && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    title="Cancelar Edição"
                  >
                    <X size={20} />
                  </button>
                )}
                <Button
                  type="submit"
                  isLoading={submitting}
                  leftIcon={submitting ? undefined : <Plus size={18} />}
                  variant="primary"
                  className="flex-1 py-3 shadow-md"
                  disabled={!formData.name}
                >
                  {editingBrand ? 'Salvar Alterações' : 'Adicionar Marca'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* LISTA DE MARCAS (Grid) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 min-h-[300px]">
              <Loader2 className="animate-spin text-primary h-8 w-8 mb-2" />
              <p className="text-gray-400 text-sm">Carregando catálogo...</p>
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center min-h-[300px]">
              <div className="h-16 w-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Tag className="text-gray-400 h-8 w-8" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium text-lg">
                Nenhuma marca cadastrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xs mx-auto">
                Use o formulário ao lado ou clique em "Buscar dos Produtos" para
                importar automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  isEditing={editingBrand?.id === brand.id}
                  onEdit={handleEdit}
                  onRequestDelete={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Excluir Marca?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Esta ação é irreversível. Produtos vinculados a esta marca
                perderão a referência.
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
