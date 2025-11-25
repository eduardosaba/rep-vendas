'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Upload, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    reference_code: '',
    price: '',
    brand: '',
    description: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let imageUrl = null;

      // Upload da Imagem
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = formData.reference_code
          ? `${formData.reference_code}-${Date.now()}.${fileExt}`
          : `${Date.now()}.${fileExt}`;

        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('product-images').getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Inserir no Banco
      const { error: insertError } = await supabase.from('products').insert({
        user_id: user.id,
        name: formData.name,
        reference_code: formData.reference_code || null,
        price: parseFloat(formData.price.replace(',', '.')),
        brand: formData.brand || null,
        description: formData.description || null,
        image_url: imageUrl,
      });

      if (insertError) throw insertError;

      addToast({ title: 'Produto criado com sucesso!', type: 'success' });
      router.push('/dashboard/products');
    } catch (error: any) {
      console.error(error);
      addToast({
        title: 'Erro ao salvar',
        description: error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Produto *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referência (SKU)
              </label>
              <input
                type="text"
                value={formData.reference_code}
                onChange={(e) =>
                  setFormData({ ...formData, reference_code: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço (R$) *
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Imagem */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">
            Imagem
          </h3>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="h-64 w-auto object-contain rounded-lg"
              />
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <Upload size={24} className="text-indigo-600 mb-2" />
                <span className="text-sm text-gray-700">
                  Clique para enviar foto
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Salvar Produto
          </button>
        </div>
      </form>
    </div>
  );
}
