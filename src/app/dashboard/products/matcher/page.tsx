'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCcw,
  Search,
  Link as LinkIcon,
  Wand2,
  Check,
} from 'lucide-react';
import SmartImageUpload from '@/components/SmartImageUpload';

interface Product {
  id: string;
  name: string | null;
  reference_code: string | null;
  image_url: string | null;
  images: string[];
  brand: string | null;
}

interface StagingImage {
  id: string;
  storage_path: string | null;
  original_name: string | null;
  publicUrl: string;
  imported_from_csv: boolean;
}

export default function MatcherPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Filtros
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [productImageFilter, setProductImageFilter] = useState<
    'all' | 'with' | 'without'
  >('all');
  const [sortOption, setSortOption] = useState<
    'name_asc' | 'name_desc' | 'ref_asc'
  >('ref_asc');
  const [searchProduct, setSearchProduct] = useState('');
  const [showImportedOnly, setShowImportedOnly] = useState(false);

  // Seleção e Drag-and-Drop
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(
    null
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    setLogs((prev) => [...prev, { msg: message, type }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, reference_code, image_url, images, brand')
        .eq('user_id', user.id)
        .order('reference_code', { ascending: true });

      const pData: Product[] = (productsData || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        reference_code: p.reference_code,
        image_url: p.image_url,
        images: Array.isArray(p.images) ? p.images : [],
        brand: p.brand,
      }));
      setProducts(pData);

      const brands = Array.from(
        new Set(pData.map((p) => p.brand).filter(Boolean))
      ) as string[];
      setAvailableBrands(brands);

      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id);

      const imgs: StagingImage[] = (imagesData || []).map((img: any) => {
        let publicUrl = img.url || '';
        if (!publicUrl && img.storage_path) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(img.storage_path);
          publicUrl = data?.publicUrl || '';
        }
        return {
          id: String(img.id),
          storage_path: img.storage_path,
          original_name: img.file_name || img.original_name || null,
          publicUrl,
          imported_from_csv: !!img.imported_from_csv,
        };
      });
      setImages(imgs);
      addLog(
        `Pronto para operar: ${pData.length} produtos carregados.`,
        'info'
      );
    } catch (err: any) {
      addLog(`Erro no carregamento: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // LOGICA DE VÍNCULO AUTOMÁTICO (Baseado no nome do arquivo)
  const handleAutoMatch = async () => {
    setLoading(true);
    let matchesCount = 0;
    addLog('Iniciando busca automática por referência...', 'info');

    for (const img of images) {
      if (!img.original_name) continue;

      // Limpa o nome do arquivo (remove extensão e espaços)
      const fileNameClean = img.original_name
        .split('.')[0]
        .trim()
        .toUpperCase();

      const matchedProduct = products.find(
        (p) => p.reference_code?.trim().toUpperCase() === fileNameClean
      );

      if (matchedProduct) {
        try {
          const updatedImages = Array.from(
            new Set([...matchedProduct.images, img.publicUrl])
          );
          await supabase
            .from('products')
            .update({
              image_url: matchedProduct.image_url || img.publicUrl,
              images: updatedImages,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matchedProduct.id);

          await supabase.from('staging_images').delete().eq('id', img.id);
          matchesCount++;
          addLog(`Match encontrado: ${fileNameClean}`, 'success');
        } catch (e) {
          addLog(`Erro ao processar ${fileNameClean}`, 'error');
        }
      }
    }

    if (matchesCount > 0) {
      toast.success(`${matchesCount} imagens vinculadas automaticamente!`);
      fetchData();
    } else {
      toast.info('Nenhum nome de arquivo coincidiu com as referências.');
    }
    setLoading(false);
  };

  const handleLink = async (
    productId?: string | null,
    imageIdsInput?: string[]
  ) => {
    const pid = productId || selectedProductId;
    const iids = imageIdsInput || selectedImageIds;

    if (!pid || iids.length === 0)
      return toast.error('Selecione produto e imagem.');

    try {
      setLoading(true);
      const targetProduct = products.find((p) => p.id === pid);
      if (!targetProduct) throw new Error('Produto não encontrado');

      const selectedImages = images.filter((i) => iids.includes(i.id));
      const newImagesUrls = selectedImages.map((i) => i.publicUrl);
      const updatedImagesList = Array.from(
        new Set([...targetProduct.images, ...newImagesUrls])
      );

      await supabase
        .from('products')
        .update({
          image_url: targetProduct.image_url || newImagesUrls[0],
          images: updatedImagesList,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);

      await supabase.from('staging_images').delete().in('id', iids);

      fetchData();
      setSelectedImageIds([]);
      setSelectedProductId(null);
      addLog(`Vinculado: ${targetProduct.reference_code}`, 'success');
    } catch (err: any) {
      addLog(`Erro: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchProduct.toLowerCase();
    let base = products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.reference_code || '').toLowerCase().includes(term)
    );
    if (brandFilter !== 'all')
      base = base.filter((p) => p.brand === brandFilter);
    if (productImageFilter !== 'all') {
      base = base.filter((p) => {
        const hasImg = p.images.length > 0 || p.image_url;
        return productImageFilter === 'with' ? hasImg : !hasImg;
      });
    }
    return base;
  }, [products, searchProduct, brandFilter, productImageFilter]);

  const filteredImages = useMemo(
    () => images.filter((i) => !showImportedOnly || i.imported_from_csv),
    [images, showImportedOnly]
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* HEADER E AÇÕES */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black">Matcher de Imagens</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoMatch}
            disabled={loading || images.length === 0}
            className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center gap-2"
          >
            <Wand2 size={14} /> Vínculo Automático
          </button>
          <button
            onClick={() => handleLink()}
            disabled={loading || selectedImageIds.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center gap-2"
          >
            <LinkIcon size={14} /> Vincular Seleção
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* COLUNA ESQUERDA: PRODUTOS COM MINIATURAS */}
        <div className="border-r flex flex-col bg-white dark:bg-slate-900">
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Buscar modelo ou referência..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="flex-1 text-[10px] font-black uppercase p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none"
              >
                <option value="all">Todas as Marcas</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={productImageFilter}
                onChange={(e) => setProductImageFilter(e.target.value as any)}
                className="flex-1 text-[10px] font-black uppercase p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none"
              >
                <option value="all">Todos</option>
                <option value="without">Sem Imagem</option>
                <option value="with">Com Imagem</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverProductId(null);
                  const data = e.dataTransfer.getData(
                    'application/x-product-images'
                  );
                  if (data) handleLink(p.id, JSON.parse(data));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverProductId(p.id);
                }}
                onDragLeave={() => setDragOverProductId(null)}
                className={`p-4 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selectedProductId === p.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : dragOverProductId === p.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-inner'
                      : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border flex-shrink-0 shadow-sm">
                    <img
                      src={p.image_url || p.images[0] || '/placeholder.png'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {p.reference_code}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase">
                      {p.name}
                    </p>

                    {/* MINI MINIATURAS (VINCULADAS) */}
                    {p.images.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {p.images.slice(0, 4).map((img, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-md border border-slate-200 overflow-hidden bg-white"
                          >
                            <img
                              src={img}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {p.images.length > 4 && (
                          <span className="text-[8px] font-black text-slate-400">
                            +{p.images.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {p.images.length > 0 && (
                  <Check className="text-emerald-500 flex-shrink-0" size={18} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: FOTOS PENDENTES */}
        <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
          <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Fotos Pendentes ({filteredImages.length})
            </h3>
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="text-[10px] font-black uppercase text-primary underline"
            >
              {showUploader ? 'Fechar' : 'Upload'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  const ids = selectedImageIds.includes(img.id)
                    ? selectedImageIds
                    : [img.id];
                  e.dataTransfer.setData(
                    'application/x-product-images',
                    JSON.stringify(ids)
                  );
                  if (!selectedImageIds.includes(img.id))
                    setSelectedImageIds([img.id]);
                }}
                onClick={() =>
                  setSelectedImageIds((prev) =>
                    prev.includes(img.id)
                      ? prev.filter((i) => i !== img.id)
                      : [...prev, img.id]
                  )
                }
                className={`group aspect-square rounded-[2rem] border-4 overflow-hidden bg-white shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                  selectedImageIds.includes(img.id)
                    ? 'border-indigo-500 scale-95 shadow-xl'
                    : 'border-transparent hover:shadow-md'
                }`}
              >
                <img
                  src={img.publicUrl}
                  className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform"
                />
                <div className="absolute bottom-2 left-0 right-0 text-[8px] font-black text-center bg-white/80 backdrop-blur truncate px-2">
                  {img.original_name}
                </div>
              </div>
            ))}
          </div>

          {/* CONSOLE DE OPERAÇÕES */}
          <div className="h-40 bg-slate-900 p-4 font-mono text-[9px] overflow-y-auto border-t border-slate-800">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {`> [${new Date().toLocaleTimeString()}] ${log.msg}`}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
