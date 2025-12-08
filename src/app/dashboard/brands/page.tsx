'use client';

import { useState, useEffect } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  Tag,
  Percent,
  Image as ImageIcon,
  Edit2,
  X,
  RefreshCw, 
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  commission_percent: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false); 

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [newName, setNewName] = useState('');
  const [newCommission, setNewCommission] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const supabase = sharedSupabase;

  const fetchBrands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar marcas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleSyncFromProducts = async () => {
    setSyncing(true);
    const toastId = toast.loading('Buscando novas marcas...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('brand')
        .eq('user_id', user.id)
        .not('brand', 'is', null);

      if (prodError) throw prodError;

      const distinctBrands = Array.from(new Set(
        productsData
          .map(p => p.brand?.trim())
          .filter(b => b && b.length > 0)
      )) as string[];

      const existingNames = brands.map(b => b.name.toLowerCase());
      const newBrands = distinctBrands.filter(
        brandName => !existingNames.includes(brandName.toLowerCase())
      );

      if (newBrands.length === 0) {
        toast.info('Tudo certo', {
          id: toastId,
          description: 'Nenhuma marca nova encontrada nos produtos.'
        });
        return;
      }

      const toInsert = newBrands.map(name => ({
        user_id: user.id,
        name: name,
        logo_url: null,
        commission_percent: 0
      }));

      const { error: insertError } = await supabase.from('brands').insert(toInsert);
      if (insertError) throw insertError;

      toast.success('Sucesso!', {
        id: toastId,
        description: `${newBrands.length} marcas importadas automaticamente.`
      });
      
      fetchBrands(); 

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
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setNewName(brand.name);
    setNewCommission(brand.commission_percent ? String(brand.commission_percent) : '');
    setLogoPreview(brand.logo_url);
    setLogoFile(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingBrand(null);
    setNewName('');
    setNewCommission('');
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    setSubmitting(true);
    
    const toastId = toast.loading(logoFile ? 'Enviando logo e salvando...' : 'Salvando marca...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      let logoUrl = editingBrand ? editingBrand.logo_url : null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        // ISOLAMENTO
        const fileName = `${user.id}/brands/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`brands/${fileName}`, logoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(`brands/${fileName}`);

        logoUrl = data.publicUrl;
      }

      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({
            name: newName,
            commission_percent: Number(newCommission) || 0,
            logo_url: logoUrl,
          })
          .eq('id', editingBrand.id);

        if (error) throw error;
        toast.success('Marca atualizada!', { id: toastId });
      } else {
        const { error } = await supabase.from('brands').insert({
          user_id: user.id,
          name: newName,
          commission_percent: Number(newCommission) || 0,
          logo_url: logoUrl,
        });

        if (error) throw error;
        toast.success('Marca adicionada!', { id: toastId });
      }

      handleCancelEdit();
      fetchBrands();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar', { 
        id: toastId,
        description: error.message 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Produtos vinculados perderão a informação da marca.')) return;
    
    const toastId = toast.loading('Removendo...');

    try {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (error) throw error;

      setBrands((prev) => prev.filter((b) => b.id !== id));
      if (editingBrand?.id === id) handleCancelEdit();

      toast.success('Marca removida', { id: toastId });
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
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marcas & Comissões</h1>
            <p className="text-sm text-gray-500">
              Gerencie as marcas e logotipos para o catálogo PDF.
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
          <div className={`p-6 rounded-xl border shadow-sm sticky top-6 transition-colors ${editingBrand ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-200'}`}>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {editingBrand ? <Edit2 size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />}
              {editingBrand ? 'Editar Marca' : 'Nova Marca'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome da Marca *</label>
                <input
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Nike, Adidas..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Comissão (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full p-2.5 pl-9 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-white"
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    placeholder="0"
                  />
                  <Percent size={16} className="absolute left-3 top-3 text-gray-400" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Opcional. Apenas para controle interno.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Logotipo (Para o PDF)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden group bg-white">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} className="h-full w-full object-contain p-2 z-10" alt="Preview" />
                  ) : (
                    <div className="text-center text-gray-400 z-10">
                      <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <span className="text-xs font-medium">Clique para enviar</span>
                    </div>
                  )}
                  {logoPreview && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="text-white text-xs font-bold">Trocar Imagem</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="flex gap-2">
                {editingBrand && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-bold hover:bg-gray-50 flex items-center justify-center transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting || !newName}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : editingBrand ? 'Atualizar' : 'Salvar Marca'}
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
              <p className="text-gray-400 mt-2 text-sm">Carregando marcas...</p>
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Tag className="text-gray-400 h-8 w-8" />
              </div>
              <h3 className="text-gray-900 font-medium text-lg">Nenhuma marca cadastrada</h3>
              <p className="text-gray-500 text-sm mt-1">Cadastre manualmente ou clique em "Buscar dos Produtos".</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className={`bg-white p-4 rounded-xl border shadow-sm relative group hover:shadow-md transition-all ${editingBrand?.id === brand.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'}`}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg p-0.5 z-10">
                    <button onClick={() => handleEdit(brand)} className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(brand.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="h-20 w-full flex items-center justify-center mb-3 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden group-hover:border-primary/20 transition-colors">
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.logo_url} className="w-full h-full object-contain p-2" alt={brand.name} />
                    ) : (
                      <span className="text-2xl font-bold text-gray-300 uppercase select-none">{brand.name.substring(0, 2)}</span>
                    )}
                  </div>

                  <h4 className="font-bold text-center text-gray-800 truncate px-1" title={brand.name}>
                    {brand.name}
                  </h4>

                  {brand.commission_percent > 0 ? (
                    <div className="mt-3 text-center">
                      <span className="bg-green-50 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold border border-green-100 inline-flex items-center gap-1">
                        <Percent size={10} /> {brand.commission_percent}% Comis.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 h-6"></div> 
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}