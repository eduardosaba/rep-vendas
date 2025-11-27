'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Upload, Loader2, Save, X, Plus, Star, Zap } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Estado para múltiplas imagens
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    reference_code: '',
    price: '',
    brand: '',
    category: '', // Novo campo
    description: '',
    is_launch: false, // Novo campo
    is_best_seller: false, // Novo campo
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const finalReference = formData.reference_code.trim() 
        ? formData.reference_code 
        : `REF-${Date.now().toString().slice(-6)}`;

      // 1. Upload das Imagens
      const uploadPromises = imageFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${finalReference}-${Date.now()}-${index}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        return data.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // 2. Inserir no Banco
      const { error: insertError } = await supabase.from('products').insert({
        user_id: user.id,
        name: formData.name,
        reference_code: finalReference,
        price: parseFloat(formData.price.replace(',', '.')),
        brand: formData.brand || null,
        category: formData.category || null,
        description: formData.description || null,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null, // Capa (compatibilidade)
        images: uploadedUrls, // Galeria completa
      });

      if (insertError) throw insertError;

      addToast({ title: 'Produto criado com sucesso!', type: 'success' });
      router.push('/dashboard/products');
    } catch (error: any) {
      console.error(error);
      addToast({ title: 'Erro ao salvar', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products" className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto *</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Tênis Esportivo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referência (SKU)</label>
                <input type="text" value={formData.reference_code} onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Automático se vazio" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
                <input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Detalhes do produto..." />
            </div>
          </div>

          {/* Galeria */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex justify-between items-center">
              Galeria de Fotos <span className="text-xs font-normal text-gray-500">{previewUrls.length} fotos</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                  {index === 0 && <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-1">Capa</div>}
                </div>
              ))}
              <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                <Plus size={24} className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500 font-medium">Adicionar</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              </label>
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Categorização</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Nike" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Calçados" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Destaques</h3>
            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors">
              <input type="checkbox" checked={formData.is_launch} onChange={(e) => setFormData({ ...formData, is_launch: e.target.checked })} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Zap size={16} className="text-purple-500" /> Lançamento
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
              <input type="checkbox" checked={formData.is_best_seller} onChange={(e) => setFormData({ ...formData, is_best_seller: e.target.checked })} className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500" />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Star size={16} className="text-yellow-500 fill-yellow-500" /> Mais Vendido
              </div>
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-70 flex justify-center gap-2 shadow-md">
            {loading ? <Loader2 className="animate-spin" /> : <Save />} Salvar Produto
          </button>
        </div>
      </form>
    </div>
  );
}