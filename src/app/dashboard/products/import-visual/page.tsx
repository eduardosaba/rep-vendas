'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ImageDropzone } from '@/components/dashboard/ImageDropzone';
import { StagingProductCard } from '@/components/dashboard/StagingProductCard';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

export default function ImportVisualPage() {
  const { addToast } = useToast();
  const [stagingImages, setStagingImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 1. Carregar imagens pendentes ao abrir a página
  const fetchStagingImages = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Gerar URLs públicas para exibição
      const imagesWithUrls = data.map((img) => {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from('product-images')
          .getPublicUrl(img.storage_path);
        return { ...img, publicUrl };
      });

      setStagingImages(imagesWithUrls);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagingImages();
  }, []);

  // 2. Upload de novas imagens (Dropzone)
  const handleUpload = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload em paralelo
      await Promise.all(
        files.map(async (file) => {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const filePath = `staging/${fileName}`;

          // Upload Storage
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Insert DB
          const { error: dbError } = await supabase
            .from('staging_images')
            .insert({
              user_id: user.id,
              storage_path: filePath,
              original_name: file.name,
            });

          if (!dbError) successCount++;
        })
      );

      if (successCount > 0) {
        addToast({ title: `${successCount} fotos enviadas!`, type: 'success' });
        fetchStagingImages(); // Recarrega a lista
      }
    } catch (error) {
      addToast({
        title: 'Erro no upload',
        description: 'Algumas imagens podem ter falhado.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  // 3. Salvar Produto (A Transação Principal)
  const handleSaveProduct = async (
    id: string,
    data: { name: string; price: string; reference: string }
  ) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // A. Mover Imagem: staging/xxx -> public/REF.jpg
      // Nota: O Supabase Storage MOVE é chato, às vezes é melhor copiar e deletar.
      // Para simplificar, vamos MANTER o arquivo onde está mas usar a URL dele no produto,
      // ou idealmente mover para a pasta pública para organização.

      // Vamos assumir o caminho atual como definitivo por agora para evitar complexidade de "Move"
      // Mas vamos associá-lo ao produto.

      const { error: productError } = await supabase.from('products').insert({
        user_id: user.id,
        name: data.name,
        reference_code: data.reference,
        price: parseFloat(data.price.replace(',', '.')),
        image_url: image.publicUrl,
      });

      if (productError) throw productError;

      // B. Limpar Staging (apenas o registro da tabela, mantemos o arquivo pois agora é do produto)
      await supabase.from('staging_images').delete().eq('id', id);

      // C. Atualizar UI
      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      addToast({ title: 'Produto criado!', type: 'success' });
    } catch (error: any) {
      addToast({
        title: 'Erro ao salvar',
        description: error.message,
        type: 'error',
      });
    }
  };

  // 4. Deletar Imagem (Descartar)
  const handleDeleteImage = async (id: string) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      // Remove do Storage
      await supabase.storage
        .from('product-images')
        .remove([image.storage_path]);

      // Remove do Banco
      await supabase.from('staging_images').delete().eq('id', id);

      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      addToast({ title: 'Imagem descartada', type: 'info' });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Importação Visual
          </h1>
          <p className="text-sm text-gray-500">
            Transforme fotos em produtos rapidamente
          </p>
        </div>
      </div>

      {/* Área de Upload */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          1. Envie suas fotos
        </h3>
        {uploading ? (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-indigo-100 bg-indigo-50 rounded-xl text-indigo-600">
            <Loader2 size={32} className="animate-spin mb-2" />
            <p>Enviando imagens...</p>
          </div>
        ) : (
          <ImageDropzone onDrop={handleUpload} />
        )}
      </div>

      {/* Grid de Processamento */}
      {stagingImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              2. Preencha os dados ({stagingImages.length} pendentes)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stagingImages.map((img) => (
              <StagingProductCard
                key={img.id}
                id={img.id}
                imageUrl={img.publicUrl}
                originalName={img.original_name}
                onSave={handleSaveProduct}
                onDelete={handleDeleteImage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
