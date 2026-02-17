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
  Trash2,
  Terminal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Tipos mínimos usados neste componente
interface Product {
  id: string;
  name?: string;
  reference_code?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  brand?: string | null;
}

interface StagingImage {
  id: string;
  storage_path?: string;
  file_name?: string;
  original_name?: string;
  publicUrl: string;
  url?: string;
  imported_from_csv?: boolean;
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
  const [searchProduct, setSearchProduct] = useState('');

  // Seleção e Drag-and-Drop
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(
    null
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const [smartMatches, setSmartMatches] = useState<any[]>([]);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    setLogs((prev) => [...prev, { msg: message, type }]);
  };

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

      // Normaliza produtos garantindo `image_url` público quando possível
      const normalizedProducts = (productsData || []).map((p: any) => {
        let publicImg = p.image_url as string | null | undefined;
        try {
          if (publicImg && !publicImg.startsWith('http')) {
            publicImg = supabase.storage
              .from('product-images')
              .getPublicUrl(publicImg).data.publicUrl;
          } else if (
            !publicImg &&
            Array.isArray(p.images) &&
            p.images.length > 0
          ) {
            const first = p.images[0];
            publicImg =
              first && !first.startsWith('http')
                ? supabase.storage.from('product-images').getPublicUrl(first)
                    .data.publicUrl
                : first;
          }
        } catch (e) {
          publicImg = p.image_url;
        }

        // Normaliza entries de `images` para URLs públicas também
        let imagesArr: string[] = [];
        if (Array.isArray(p.images)) {
          imagesArr = p.images
            .filter(Boolean)
            .map((it: string) =>
              it && !it.startsWith('http')
                ? supabase.storage.from('product-images').getPublicUrl(it).data
                    .publicUrl
                : it
            );
        }

        return { ...p, image_url: publicImg, images: imagesArr } as Product;
      });

      setProducts(normalizedProducts || []);
      setAvailableBrands(
        Array.from(
          new Set(
            (normalizedProducts || []).map((p) => p.brand).filter(Boolean)
          )
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
          url: img.url,
          imported_from_csv: !!img.imported_from_csv,
        })) || []
      );
    } catch (err: any) {
      addLog(`Erro: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- LÓGICA DE VÍNCULO INTELIGENTE (REVISADA) ---
  const analyzeSmartMatch = () => {
    const matches: any[] = [];
    images.forEach((img) => {
      const fileName = (img.original_name || '')
        .split('.')[0]
        .trim()
        .toUpperCase();
      const matchedProd = products.find(
        (p) =>
          p.reference_code?.trim().toUpperCase() === fileName ||
          p.reference_code?.trim().toUpperCase().replace(/\s/g, '') ===
            fileName.replace(/\s/g, '')
      );

      if (matchedProd) {
        matches.push({
          productId: matchedProd.id,
          imageId: img.id,
          ref: matchedProd.reference_code,
          fileName: img.original_name,
        });
      }
    });

    if (matches.length === 0) {
      toast.info(
        'Nenhum código de arquivo coincide com as referências dos produtos.'
      );
    } else {
      setSmartMatches(matches);
      setShowSmartModal(true);
    }
  };

  const executeSmartMatch = async () => {
    setLoading(true);
    setShowSmartModal(false);
    let successCount = 0;

    for (const match of smartMatches) {
      try {
        const prod = products.find((p) => p.id === match.productId);
        const img = images.find((i) => i.id === match.imageId);
        if (!prod || !img) continue;

        // Normaliza imagens existentes do produto para URLs públicas
        const existing = (prod.images || []).map((it: string) =>
          it && !it.startsWith('http')
            ? supabase.storage.from('product-images').getPublicUrl(it).data
                .publicUrl
            : it
        );
        const updatedImages = Array.from(
          new Set([...(existing || []), img.publicUrl])
        );

        await supabase
          .from('products')
          .update({
            image_url: prod.image_url || img.publicUrl,
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

    toast.success(`${successCount} produtos vinculados automaticamente!`);
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
      return toast.error('Selecione um produto e ao menos uma imagem.');

    try {
      setLoading(true);
      const targetProduct = products.find((p) => p.id === pid);
      const selectedUrls = images
        .filter((i) => iids.includes(i.id))
        .map((i) => i.publicUrl);

      // Normaliza imagens existentes do produto para URLs públicas
      const existingImages = (targetProduct?.images || []).map((it: any) =>
        it && typeof it === 'string' && !it.startsWith('http')
          ? supabase.storage.from('product-images').getPublicUrl(it).data
              .publicUrl
          : it
      );

      const updatedImages = Array.from(
        new Set([...(existingImages || []), ...selectedUrls])
      );

      await supabase
        .from('products')
        .update({
          image_url:
            targetProduct?.image_url &&
            targetProduct.image_url.startsWith('http')
              ? targetProduct.image_url
              : selectedUrls[0],
          images: updatedImages,
          sync_status: 'synced',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);

      await supabase.from('staging_images').delete().in('id', iids);
      toast.success('Vínculo realizado com sucesso!');
      fetchData();
      setSelectedImageIds([]);
    } catch (err: any) {
      addLog(`Erro ao vincular: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir imagens (individual ou em massa)
  const handleDeleteImages = async (ids: string[]) => {
    const confirmDelete = window.confirm(
      ids.length === 1
        ? 'Deseja excluir esta imagem?'
        : `Deseja excluir as ${ids.length} imagens selecionadas?`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('staging_images')
        .delete()
        .in('id', ids);

      if (error) throw error;

      addLog(`${ids.length} imagem(ns) excluída(s).`, 'info');
      toast.success('Excluído com sucesso');
      setImages((prev) => prev.filter((img) => !ids.includes(img.id)));
      setSelectedImageIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err: any) {
      addLog(`Erro ao excluir: ${err.message}`, 'error');
      toast.error('Falha ao excluir');
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
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* HEADER BAR */}
      <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-black tracking-tighter text-slate-800 dark:text-white uppercase">
            Matcher Pro <span className="text-indigo-500">2.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeSmartMatch}
            disabled={images.length === 0}
            className="hidden md:flex gap-2 rounded-xl"
          >
            <Wand2 size={14} /> Vínculo Inteligente
          </Button>
          <Button
            size="sm"
            onClick={() => handleLink()}
            disabled={!selectedProductId || selectedImageIds.length === 0}
            className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            <LinkIcon size={14} /> Vincular Seleção
          </Button>
        </div>
      </header>

      {/* WORKSPACE DIVIDIDO */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* COLUNA ESQUERDA: PRODUTOS (SCROLL INDEPENDENTE) */}
        <aside className="w-full md:w-[400px] lg:w-[450px] border-r border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden">
          <div className="p-4 bg-white border-b space-y-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Ref ou Nome..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="flex-1 text-[10px] font-bold p-2 rounded-lg bg-slate-100 border-none uppercase focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Marcas</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={productImageFilter}
                onChange={(e) => setProductImageFilter(e.target.value as any)}
                className="flex-1 text-[10px] font-bold p-2 rounded-lg bg-slate-100 border-none uppercase focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Fotos: Todas</option>
                <option value="without">Sem Foto</option>
                <option value="with">Com Foto</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-32">
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
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between group ${
                  selectedProductId === p.id
                    ? 'border-indigo-600 bg-white shadow-lg'
                    : dragOverProductId === p.id
                      ? 'border-emerald-500 bg-emerald-50 scale-[1.02]'
                      : 'border-transparent bg-white/50 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 w-full">
                  <div className="min-w-0 order-1 sm:order-2 w-full">
                    <p className="font-black text-[11px] text-slate-800 dark:text-white truncate uppercase">
                      {p.reference_code}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 truncate uppercase">
                      {p.name}
                    </p>
                  </div>

                  <div className="flex-shrink-0 order-2 sm:order-1 mt-3 sm:mt-0">
                    {/* Mini-miniaturas circulares: mostra até 4 */}
                    <div className="flex items-center -space-x-2">
                      {(p.images || []).slice(0, 4).map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-100"
                        >
                          <img
                            src={imgUrl || p.image_url || '/placeholder.png'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {((p.images || []).length || 0) > 4 && (
                        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 border-2 border-white">
                          +{(p.images || []).length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {p.image_url && (
                  <Check size={14} className="text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* COLUNA DIREITA: IMAGENS (GRID COM SCROLL INDEPENDENTE) */}
        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ImageIcon size={14} className="text-indigo-500" /> Banco de
              Imagens ({images.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeleteImages(selectedImageIds)}
                disabled={selectedImageIds.length === 0}
                className="text-[10px] font-black text-red-500 uppercase hover:bg-red-50 px-3 py-1 rounded-lg disabled:opacity-40"
              >
                Excluir Seleção
              </button>
              <button
                onClick={() => setSelectedImageIds([])}
                className="text-[10px] font-black text-red-500 uppercase hover:bg-red-50 px-3 py-1 rounded-lg"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 pb-32">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
              {images.map((img) => (
                <div key={img.id} className="group relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImages([img.id]);
                    }}
                    className="absolute top-2 right-2 z-20 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    title="Excluir imagem"
                  >
                    <Trash2 size={12} />
                  </button>

                  <div
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
                    className={`relative aspect-square rounded-3xl bg-slate-50 border-4 transition-all cursor-grab active:cursor-grabbing overflow-hidden ${
                      selectedImageIds.includes(img.id)
                        ? 'border-indigo-600 scale-95 shadow-2xl'
                        : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    <img
                      src={img.publicUrl}
                      className="w-full h-full object-contain p-2 md:p-4 group-hover:scale-110 transition-transform duration-500"
                    />

                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[8px] font-bold text-white truncate text-center uppercase">
                        {img.original_name}
                      </p>
                    </div>

                    {selectedImageIds.includes(img.id) && (
                      <div className="absolute top-2 left-2 h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-[9px] shadow-xl">
                        {selectedImageIds.indexOf(img.id) + 1}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {images.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <ImageIcon size={64} className="opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">
                  Nenhuma foto pendente
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FOOTER LOGS (COMPACTO) */}
      <footer className="h-32 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0 z-50">
        <div className="px-4 py-1.5 bg-slate-800/50 flex items-center justify-between border-b border-slate-700">
          <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-2">
            <Terminal size={10} /> Console do Sistema
          </span>
          <button
            onClick={() => setLogs([])}
            className="text-[9px] text-slate-500 uppercase font-bold hover:text-white"
          >
            Limpar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1">
          {logs.map((log, i) => (
            <div
              key={i}
              className={
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'success'
                    ? 'text-emerald-400'
                    : 'text-slate-500'
              }
            >
              <span className="opacity-30 mr-2">
                [{new Date().toLocaleTimeString()}]
              </span>{' '}
              {log.msg}
            </div>
          ))}
        </div>
      </footer>

      {/* MODAL INTELIGENTE (REVISADO) */}
      {showSmartModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    Vínculo Automático
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase">
                    {smartMatches.length} Coincidências Encontradas
                  </p>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                {smartMatches.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[10px] font-bold py-2 border-b border-slate-200 last:border-0"
                  >
                    <span className="text-indigo-600 uppercase tracking-tighter">
                      {m.ref}
                    </span>
                    <span className="text-slate-400 truncate ml-4 max-w-[200px]">
                      {m.fileName}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSmartModal(false)}
                  className="flex-1 rounded-2xl font-black uppercase text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={executeSmartMatch}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px]"
                >
                  Vincular Tudo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
