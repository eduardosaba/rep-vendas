'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import {
  ArrowLeft,
  Link as LinkIcon,
  Search,
  Image as ImageIcon,
  Check,
  Loader2,
  Filter,
} from 'lucide-react';

// Tipos para os dados
interface Product {
  id: string;
  name: string;
  reference_code: string;
  image_url: string | null;
}

interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

export default function MatcherPage() {
  const { addToast } = useToast();

  // Estados de Dados
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Seleção
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Estados de Busca
  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  // --- 1. Carregar Dados Iniciais ---
  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // A. Buscar Produtos SEM imagem (prioridade)
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, reference_code, image_url')
        .eq('user_id', user.id)
        .is('image_url', null) // Traz apenas os que precisam de foto
        .order('name');

      // B. Buscar Imagens da "Piscina"
      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Gerar URLs para as imagens
      const imagesWithUrls = (imagesData || []).map((img) => {
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(img.storage_path);
        return { ...img, publicUrl: data.publicUrl };
      });

      setProducts(productsData || []);
      setImages(imagesWithUrls);
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erro ao carregar dados', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 2. Ação de Vincular ---
  const handleLink = async () => {
    if (!selectedProductId || !selectedImageId) return;
    setLinking(true);

    try {
      const image = images.find((img) => img.id === selectedImageId);
      if (!image) return;

      // A. Atualizar Produto com a URL da imagem
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: image.publicUrl })
        .eq('id', selectedProductId);

      if (updateError) throw updateError;

      // B. Remover Imagem da Staging (pois agora ela pertence ao produto)
      // Nota: Não deletamos o arquivo do Storage, apenas o registro da tabela temporária
      const { error: deleteError } = await supabase
        .from('staging_images')
        .delete()
        .eq('id', selectedImageId);

      if (deleteError) throw deleteError;

      // C. Atualizar UI Localmente (Remove das listas)
      setProducts((prev) => prev.filter((p) => p.id !== selectedProductId));
      setImages((prev) => prev.filter((i) => i.id !== selectedImageId));

      // Limpa seleção
      setSelectedProductId(null);
      setSelectedImageId(null);

      addToast({ title: 'Vinculado com sucesso!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      addToast({
        title: 'Erro ao vincular',
        description: error.message,
        type: 'error',
      });
    } finally {
      setLinking(false);
    }
  };

  // Filtragem local
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.reference_code.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-4 pt-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Matcher de Produtos
            </h1>
            <p className="text-sm text-gray-500">
              {products.length} produtos sem foto • {images.length} fotos
              disponíveis
            </p>
          </div>
        </div>

        {/* Botão de Ação Principal */}
        <button
          onClick={handleLink}
          disabled={!selectedProductId || !selectedImageId || linking}
          className={`
            flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg
            ${
              !selectedProductId || !selectedImageId
                ? 'bg-gray-300 cursor-not-allowed opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'
            }
          `}
        >
          {linking ? (
            <Loader2 className="animate-spin" />
          ) : (
            <LinkIcon size={20} />
          )}
          VINCULAR SELECIONADOS
        </button>
      </div>

      {/* Área de Trabalho (Split Screen) */}
      <div className="flex-1 flex gap-6 overflow-hidden px-4">
        {/* COLUNA ESQUERDA: Produtos */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Filter size={18} /> Produtos sem Imagem
            </h3>
            <div className="relative w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar nome ou ref..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Carregando...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Check size={48} className="mx-auto mb-2 text-green-200" />
                <p>Tudo pronto! Nenhum produto pendente.</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                    ${
                      selectedProductId === product.id
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-gray-100 hover:border-indigo-200 bg-white'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {product.reference_code}
                      </p>
                    </div>
                    {selectedProductId === product.id && (
                      <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Imagens */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <ImageIcon size={18} /> Galeria de Fotos
            </h3>
          </div>

          <div className="overflow-y-auto p-4 flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Carregando...</div>
            ) : images.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p>Nenhuma foto disponível.</p>
                <Link
                  href="/dashboard/products/import-visual"
                  className="text-indigo-600 text-sm hover:underline mt-2 inline-block"
                >
                  Carregar fotos agora
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`
                      aspect-square rounded-lg border-2 cursor-pointer overflow-hidden relative group
                      ${
                        selectedImageId === img.id
                          ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2'
                          : 'border-transparent hover:border-gray-300'
                      }
                    `}
                  >
                    <img
                      src={img.publicUrl}
                      alt="Staging"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Overlay com nome original */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.original_name}
                    </div>

                    {selectedImageId === img.id && (
                      <div className="absolute top-2 right-2 h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
