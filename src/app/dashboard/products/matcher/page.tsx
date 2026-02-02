'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Link as LinkIcon,
  Wand2,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

  const [_loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Filtros
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [productImageFilter, setProductImageFilter] = useState<
    'all' | 'with' | 'without'
  >('all');
  const [searchProduct, setSearchProduct] = useState('');

  // Seleção e Drag-and-Drop
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(
    null
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [_previewUrl, _setPreviewUrl] = useState<string | null>(null);

  // Inteligência de Vínculo
  const [smartMatches, setSmartMatches] = useState<
    { productId: string; imageId: string; ref: string; fileName: string }[]
  >([]);
  const [showSmartModal, setShowSmartModal] = useState(false);

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

      setProducts(productsData || []);
      setAvailableBrands(
        Array.from(
          new Set((productsData || []).map((p) => p.brand).filter(Boolean))
        ) as string[]
      );

      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id);
      setImages(
        imagesData?.map((img) => ({
          id: img.id,
          storage_path: img.storage_path,
          original_name: img.file_name || img.original_name,
          publicUrl:
            img.url ||
            supabase.storage
              .from('product-images')
              .getPublicUrl(img.storage_path).data.publicUrl,
          imported_from_csv: !!img.imported_from_csv,
        })) || []
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Erro: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LÓGICA DE VÍNCULO INTELIGENTE (ANALISAR ANTES DE SALVAR) ---
  const analyzeSmartMatch = () => {
    const matches: typeof smartMatches = [];

    images.forEach((img) => {
      const fileName = (img.original_name || '')
        .split('.')[0]
        .trim()
        .toUpperCase();
      const matchedProd = products.find(
        (p) => p.reference_code?.trim().toUpperCase() === fileName
      );

      if (matchedProd) {
        matches.push({
          productId: matchedProd.id,
          imageId: img.id,
          ref: matchedProd.reference_code || '',
          fileName: img.original_name || '',
        });
      }
    });

    if (matches.length === 0) {
      toast.info(
        'Nenhuma coincidência exata encontrada entre arquivos e referências.'
      );
    } else {
      setSmartMatches(matches);
      setShowSmartModal(true);
    }
  };

  const executeSmartMatch = async () => {
    setLoading(true);
    setShowSmartModal(false);
    addLog(
      `Iniciando processamento de ${smartMatches.length} vínculos...`,
      'info'
    );

    let successCount = 0;

    for (const match of smartMatches) {
      try {
        const targetProduct = products.find((p) => p.id === match.productId);
        const stagingImg = images.find((i) => i.id === match.imageId);

        if (!targetProduct || !stagingImg) continue;

        const updatedImages = Array.from(
          new Set([...(targetProduct.images || []), stagingImg.publicUrl])
        );

        await supabase
          .from('products')
          .update({
            image_url: targetProduct.image_url || stagingImg.publicUrl,
            images: updatedImages,
            sync_status: 'synced',
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.productId);

        await supabase.from('staging_images').delete().eq('id', match.imageId);
        successCount++;
      } catch (e) {
        addLog(`Erro no match ${match.ref}`, 'error');
      }
    }

    addLog(`${successCount} produtos vinculados automaticamente.`, 'success');
    toast.success(`${successCount} vínculos realizados!`);
    fetchData();
    setSmartMatches([]);
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
      const selectedImages = images.filter((i) => iids.includes(i.id));
      const newUrls = selectedImages.map((i) => i.publicUrl);

      const updatedImages = Array.from(
        new Set([...(targetProduct?.images || []), ...newUrls])
      );

      await supabase
        .from('products')
        .update({
          image_url: targetProduct?.image_url || newUrls[0],
          images: updatedImages,
          sync_status: 'synced',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);

      await supabase.from('staging_images').delete().in('id', iids);

      addLog(
        `Vinculado com sucesso: ${targetProduct?.reference_code}`,
        'success'
      );
      fetchData();
      setSelectedImageIds([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Erro ao vincular: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.reference_code || '')
          .toLowerCase()
          .includes(searchProduct.toLowerCase());
      const matchBrand = brandFilter === 'all' || p.brand === brandFilter;
      const hasImg = (p.images?.length || 0) > 0 || !!p.image_url;
      const matchImg =
        productImageFilter === 'all'
          ? true
          : productImageFilter === 'with'
            ? hasImg
            : !hasImg;
      return matchSearch && matchBrand && matchImg;
    });
  }, [products, searchProduct, brandFilter, productImageFilter]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* HEADER BAR */}
      <header className="p-4 bg-white dark:bg-slate-900 border-b flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
            Matcher Pro
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={analyzeSmartMatch}
            disabled={images.length === 0}
            className="px-6 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-all"
          >
            <Wand2 size={14} /> Vínculo Inteligente
          </button>
          <button
            onClick={() => handleLink()}
            disabled={!selectedProductId || selectedImageIds.length === 0}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 disabled:opacity-30 flex items-center gap-2 hover:bg-indigo-700 transition-all"
          >
            <LinkIcon size={14} /> Vincular Seleção
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* COLUNA ESQUERDA: PRODUTOS */}
        <aside className="w-full lg:w-[450px] border-r bg-white dark:bg-slate-900 flex flex-col shadow-sm z-10">
          <div className="p-4 border-b bg-slate-50/50 space-y-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Buscar por Ref ou Nome..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="flex-1 text-[9px] font-black uppercase p-2.5 rounded-xl bg-white border border-slate-200 outline-none"
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
                onChange={(e) =>
                  setProductImageFilter(
                    e.target.value as 'all' | 'with' | 'without'
                  )
                }
                className="flex-1 text-[9px] font-black uppercase p-2.5 rounded-xl bg-white border border-slate-200 outline-none"
              >
                <option value="all">Ver Tudo</option>
                <option value="without">Sem Foto</option>
                <option value="with">Com Foto</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverProductId(p.id);
                }}
                onDragLeave={() => setDragOverProductId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverProductId(null);
                  const data = e.dataTransfer.getData(
                    'application/x-matcher-images'
                  );
                  if (data) handleLink(p.id, JSON.parse(data));
                }}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                  selectedProductId === p.id
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
                    : dragOverProductId === p.id
                      ? 'border-emerald-500 bg-emerald-50 scale-[1.02]'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 shadow-inner">
                    <img
                      src={p.image_url || '/images/product-placeholder.svg'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs text-slate-800 dark:text-white truncate uppercase tracking-tighter">
                      {p.reference_code}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase">
                      {p.name}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {p.images?.slice(0, 4).map((img, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-md border border-slate-200 bg-white overflow-hidden shadow-xs"
                        >
                          <img
                            src={
                              typeof img === 'string'
                                ? img
                                : (img as { url?: string }).url || ''
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {p.image_url && (
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* COLUNA DIREITA: IMAGENS STAGING */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ImageIcon size={14} className="text-indigo-500" /> Fotos
              Importadas ({images.length})
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-[9px] text-slate-400 font-bold italic hidden sm:inline">
                Dica: Arraste para o código ao lado
              </span>
              <button
                onClick={() => setSelectedImageIds([])}
                className="text-[9px] font-black text-red-500 uppercase hover:underline"
              >
                Limpar Seleção
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-6">
              {images.map((img) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => {
                    const ids = selectedImageIds.includes(img.id)
                      ? selectedImageIds
                      : [img.id];
                    e.dataTransfer.setData(
                      'application/x-matcher-images',
                      JSON.stringify(ids)
                    );
                  }}
                  onClick={() =>
                    setSelectedImageIds((prev) =>
                      prev.includes(img.id)
                        ? prev.filter((i) => i !== img.id)
                        : [...prev, img.id]
                    )
                  }
                  className={`group relative aspect-square rounded-[2.5rem] bg-white border-4 transition-all cursor-grab active:cursor-grabbing overflow-hidden shadow-sm ${
                    selectedImageIds.includes(img.id)
                      ? 'border-indigo-500 ring-4 ring-indigo-100 scale-95 shadow-xl'
                      : 'border-transparent hover:border-slate-200 hover:shadow-lg'
                  }`}
                >
                  <img
                    src={img.publicUrl}
                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[8px] font-black text-white truncate text-center uppercase tracking-tighter">
                      {img.original_name}
                    </p>
                  </div>

                  {selectedImageIds.includes(img.id) && (
                    <div className="absolute top-4 left-4 h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-lg ring-2 ring-white">
                      {selectedImageIds.indexOf(img.id) + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* CONSOLE DE OPERAÇÕES (BASE TOTAL) */}
      <footer className="h-40 bg-slate-900 border-t border-slate-800 flex flex-col overflow-hidden shrink-0 z-30">
        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
            <Terminal size={12} /> Log de Matcher
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[9px] text-slate-500 hover:text-white transition-colors uppercase font-bold"
          >
            Limpar Logs
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1">
          {logs.length === 0 && (
            <p className="text-slate-700 italic">Aguardando operações...</p>
          )}
          {logs.map((log, i) => (
            <div
              key={i}
              className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              <span className="opacity-30 mr-2">
                [{new Date().toLocaleTimeString()}]
              </span>
              {log.msg}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </footer>

      {/* MODAL DE VÍNCULO INTELIGENTE (VALIDAÇÃO) */}
      {showSmartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Validar Vínculos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Encontramos {smartMatches.length} coincidências automáticas.
                  </p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 space-y-2 border border-slate-100">
                {smartMatches.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-2 border-b border-slate-200 last:border-0"
                  >
                    <span className="font-black text-indigo-600 uppercase">
                      {m.ref}
                    </span>
                    <span className="text-slate-400 italic truncate ml-4 max-w-[200px]">
                      {m.fileName}
                    </span>
                    <Check size={14} className="text-emerald-500 ml-2" />
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 items-start">
                <AlertCircle
                  size={18}
                  className="text-amber-600 mt-0.5 shrink-0"
                />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  <strong>Atenção:</strong> Ao confirmar, os arquivos de imagem
                  serão vinculados aos produtos e removidos da fila de
                  pendentes. Esta ação é definitiva para estas referências.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSmartModal(false)}
                  className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest py-6"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={executeSmartMatch}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest py-6 shadow-lg shadow-emerald-100"
                >
                  Confirmar Todos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
