'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Link as LinkIcon,
  Search,
  Image as ImageIcon,
  Check,
  Loader2,
  Filter,
  RefreshCcw,
  Layers,
  Terminal,
} from 'lucide-react';

// Tipos
interface Product {
  id: string;
  name: string;
  reference_code: string;
  image_url: string | null;
  images: string[] | null;
}

interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

export default function MatcherPage() {
  const supabase = sharedSupabase;

  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportedOnly, setShowImportedOnly] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);

  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  // Console de Logs
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs(prev => [...prev, `${icon}${message}`]);
  };

  // --- 1. Carregar Dados ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // A. Buscar Produtos
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, reference_code, image_url, images')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const productsWithoutImage = productsData?.filter((p) => !p.image_url) || [];
      const productsWithImage = productsData?.filter((p) => p.image_url) || [];
      setProducts([...productsWithoutImage, ...productsWithImage]);

      // B. Buscar Imagens da Piscina
      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const imagesWithUrls = (imagesData || []).map((img: any) => {
        let publicUrl = '';
        if (img.url) {
          publicUrl = img.url;
        } else if (img.storage_path) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(img.storage_path);
          publicUrl = data?.publicUrl || '';
        } else if (img.publicUrl) {
          publicUrl = img.publicUrl;
        }

        const originalName = img.file_name || img.original_name || '';
        const importedFlag = !!img.imported_from_csv;

        const alreadyLinked = (productsData || []).some((p: any) => {
          const imgs = p.images || [];
          return imgs.includes(publicUrl) || p.image_url === publicUrl;
        });

        return {
          ...img,
          publicUrl,
          original_name: originalName,
          imported_from_csv: importedFlag,
          alreadyLinked,
        };
      });

      setImages(imagesWithUrls);
      if (imagesWithUrls.length > 0) {
        addLog(`Carregados ${imagesWithUrls.length} imagens e ${productsData?.length} produtos.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados');
      addLog('Erro ao carregar dados iniciais.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // --- 2. Ação de Vincular ---
  const handleLink = async (productId?: string | null, imageIdsInput?: string[]) => {
    const pid = productId || selectedProductId;
    const iids = imageIdsInput || selectedImageIds;

    if (!pid || iids.length === 0) {
      if (!pid && iids.length === 0) toast.warning('Selecione produto e imagens');
      else if (!pid) toast.warning('Selecione um produto');
      else if (iids.length === 0) toast.warning('Selecione pelo menos uma foto');
      return;
    }

    setLinking(true);
    addLog(`Vinculando ${iids.length} fotos ao produto...`);

    try {
      const productObj = products.find((p) => p.id === pid);
      const imagesObj = images.filter((img) => iids.includes(img.id));

      if (!productObj || imagesObj.length === 0) throw new Error('Itens não encontrados');

      const currentImages = productObj.images || [];
      const newUrls = imagesObj.map((img) => img.publicUrl);
      const combinedImages = Array.from(new Set([...currentImages, ...newUrls]));
      const newCoverUrl = combinedImages[0]; 

      // Atualizar Produto
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_url: newCoverUrl,
          images: combinedImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);

      if (updateError) throw updateError;

      // Remover da Staging
      const { error: deleteError } = await supabase
        .from('staging_images')
        .delete()
        .in('id', iids);

      if (deleteError) throw deleteError;

      // Atualizar UI
      setImages((prev) => prev.filter((i) => !iids.includes(i.id)));
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === pid) {
            return { ...p, image_url: newCoverUrl, images: combinedImages };
          }
          return p;
        })
      );

      setSelectedProductId(null);
      setSelectedImageIds([]);
      setDragOverProductId(null);

      const msg = iids.length > 1 ? `${iids.length} fotos vinculadas!` : 'Foto vinculada!';
      toast.success(msg);
      addLog(`Sucesso: ${msg} Produto: ${productObj.name}`, 'success');

    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao vincular', { description: error.message });
      addLog(`Erro ao vincular: ${error.message}`, 'error');
    } finally {
      setLinking(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.reference_code.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-4 pt-4 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products" className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Matcher de Produtos</h1>
            <p className="text-sm text-gray-500">Clique nas fotos e arraste para um produto.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={fetchData} className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm" title="Recarregar">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowImportedOnly((s) => !s)}
            className={`p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 shadow-sm ${showImportedOnly ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
            title="Alternar: apenas importadas"
          >
            {showImportedOnly ? 'Importadas' : 'Todas'}
          </button>

          <button
            onClick={() => handleLink()}
            disabled={!selectedProductId || selectedImageIds.length === 0 || linking}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg
                ${!selectedProductId || selectedImageIds.length === 0 ? 'bg-gray-300 cursor-not-allowed opacity-50' : 'bg-primary hover:bg-primary/90 hover:scale-105'}
              `}
          >
            {linking ? <Loader2 className="animate-spin" /> : <LinkIcon size={20} />}
            {selectedImageIds.length > 1 ? `VINCULAR (${selectedImageIds.length})` : 'VINCULAR'}
          </button>
        </div>
      </div>

      {/* CONSOLE DE LOGS (Visível apenas se houver logs) */}
      {logs.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-gray-900 text-green-400 p-3 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-32 overflow-y-auto">
            <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold flex items-center gap-2">
              <Terminal size={14} /> LOG DE ATIVIDADE
            </div>
            {logs.map((log, index) => (
              <div key={index} className="truncate py-0.5 border-b border-gray-800/50 last:border-0 font-mono">
                <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden px-4">
        {/* ESQUERDA: Produtos */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[40vh] md:h-auto">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Filter size={16} /> Produtos ({filteredProducts.length})
            </h3>
            <div className="relative w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 flex-1 bg-gray-50/30">
            {loading ? (
              <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-gray-400"><Check size={48} className="mx-auto mb-2 text-green-200" /><p>Nenhum produto encontrado.</p></div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverProductId(product.id); }}
                  onDragLeave={() => setDragOverProductId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverProductId(null);
                    const data = e.dataTransfer.getData('application/x-product-images');
                    if (data) {
                      try {
                        const ids = JSON.parse(data);
                        if (Array.isArray(ids) && ids.length > 0) handleLink(product.id, ids);
                      } catch (err) { console.error('Erro drag', err); }
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm flex justify-between items-center ${selectedProductId === product.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 bg-white hover:border-indigo-300'} ${dragOverProductId === product.id ? 'ring-2 ring-green-500 bg-green-50 scale-[1.02]' : ''}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                      {product.images && product.images.length > 0 ? (
                        product.images.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} alt="" className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-100" />
                        ))
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300"><ImageIcon size={16} /></div>
                      )}
                      {product.images && product.images.length > 3 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+{product.images.length - 3}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-medium text-sm truncate ${selectedProductId === product.id ? 'text-indigo-900' : 'text-gray-900'}`}>{product.name}</h4>
                      <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2">{product.reference_code}</p>
                    </div>
                  </div>
                  {selectedProductId === product.id ? (
                    <div className="h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0"><Check size={14} /></div>
                  ) : <div className="h-6 w-6 rounded-full border-2 border-gray-200 flex-shrink-0"></div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* DIREITA: Imagens (Staging) */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[40vh] md:h-auto">
          <div className="p-4 border-b bg-gray-50 sticky top-0 z-10 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <ImageIcon size={16} /> Fotos Disponíveis ({images.length})
            </h3>
            {selectedImageIds.length > 0 && (
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{selectedImageIds.length} selecionadas</span>
            )}
          </div>

          <div className="overflow-y-auto p-4 flex-1 bg-gray-50/30">
            {loading ? (
              <div className="p-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : images.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p>Nenhuma foto disponível.</p>
                <Link href="/dashboard/products/import-visual" className="text-indigo-600 text-sm hover:underline mt-2 font-medium">Carregar fotos</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {images.filter((img) => !showImportedOnly || (img as any).imported_from_csv).map((img) => (
                  <div
                    key={img.id}
                    draggable={true}
                    onDragStart={(e) => {
                      let idsToDrag = selectedImageIds;
                      if (!idsToDrag.includes(img.id)) {
                        idsToDrag = [img.id];
                        setSelectedImageIds([img.id]);
                      }
                      e.dataTransfer.setData('application/x-product-images', JSON.stringify(idsToDrag));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => toggleImageSelection(img.id)}
                    className={`aspect-square rounded-xl border-2 cursor-pointer overflow-hidden relative group shadow-sm bg-white transition-all ${selectedImageIds.includes(img.id) ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 shadow-md scale-[0.98]' : 'border-transparent hover:border-indigo-300'}`}
                  >
                    <img src={img.publicUrl} alt="Staging" className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" />
                    {(img as any).imported_from_csv && <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold">Importada</div>}
                    {(img as any).alreadyLinked && <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">Vinculada</div>}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] p-1 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">{img.original_name}</div>
                    {selectedImageIds.includes(img.id) && (
                      <div className="absolute top-2 right-2 h-6 w-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md animate-in zoom-in">
                        {selectedImageIds.length > 1 ? <Layers size={12} /> : <Check size={14} />}
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