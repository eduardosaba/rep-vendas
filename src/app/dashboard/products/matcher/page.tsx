'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Link as LinkIcon,
  Menu,
  Wand2,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  Terminal,
  X,
  Loader2,
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

// Debounce hook
function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
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
  // Busca com debounce
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);

  // Paginação / Infinite Scroll
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [ITEMS_PER_PAGE, setItemsPerPage] = useState(50);
  const [isMobile, setIsMobile] = useState(false);

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
  const [progress, setProgress] = useState(0);
  const [isMatching, setIsMatching] = useState(false);
  // mobile: mostrar/ocultar painel de produtos
  const [showProductsPanel, setShowProductsPanel] = useState(true);
  // mobile: modal para escolher produto quando imagens estão selecionadas
  const [showMobileProductPicker, setShowMobileProductPicker] = useState(false);
  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    setLogs((prev) => [...prev, { msg: message, type }]);
  };

  const fetchData = useCallback(async (isNextPage = false) => {
    try {
      if (!isNextPage) setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const currentPage = isNextPage ? page + 1 : 0;
      const from = currentPage * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query: any = supabase
        .from('products')
        .select('id, name, reference_code, image_url, gallery_images, brand')
        .eq('user_id', user.id)
        .order('reference_code', { ascending: true })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,reference_code.ilike.%${debouncedSearch}%`);
      }

      if (brandFilter !== 'all') {
        query = query.eq('brand', brandFilter);
      }

      const { data: productsData, error: pError } = await query;
      if (pError) throw pError;

      if ((productsData || []).length < ITEMS_PER_PAGE) setHasMore(false);

      const normalized = (productsData || []).map((p: any) => {
        let thumbUrls: string[] = [];

        // normalize gallery thumbnails
        if (Array.isArray(p.gallery_images)) {
          thumbUrls = p.gallery_images
            .map((img: any) => {
              if (img && typeof img === 'object') {
                const v480 = Array.isArray(img.variants)
                  ? img.variants.find((v: any) => v.size === 480)
                  : null;
                return (
                  v480?.url || (typeof img.url === 'string' ? img.url : img?.variants?.[0]?.url)
                );
              }
              return img;
            })
            .filter(Boolean);
        } else if (p.image_url) {
          thumbUrls = [typeof p.image_url === 'string' ? p.image_url : p.image_url?.url || p.image_url?.publicUrl || ''];
        }

        // normalize main image (force string)
        let mainImage: string | null = null;
        if (typeof p.image_url === 'string') {
          mainImage = p.image_url;
        } else if (p.image_url && typeof p.image_url === 'object') {
          const v480 = Array.isArray(p.image_url.variants)
            ? p.image_url.variants.find((v: any) => v.size === 480)
            : null;
          const v1200 = Array.isArray(p.image_url.variants)
            ? p.image_url.variants.find((v: any) => v.size === 1200)
            : null;
          mainImage = v480?.url || v1200?.url || p.image_url.url || p.image_url.publicUrl || null;
        }

        return {
          ...p,
          image_url: mainImage,
          images: thumbUrls,
        };
      });

      setProducts((prev) => (isNextPage ? [...prev, ...normalized] : normalized));
      setPage(currentPage);

      // Atualiza lista de marcas disponíveis (para select)
      try {
        const brands = Array.from(
          new Set((productsData || []).map((p: any) => p.brand).filter(Boolean))
        ) as string[];
        setAvailableBrands(brands);
      } catch (e) {
        // ignore
      }

      // Carrega staging images (apenas uma vez) e garante deduplicação por `id`
      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const mapped: StagingImage[] =
        imagesData?.map((img: any) => ({
          id: img.id,
          storage_path: img.storage_path,
          original_name: img.file_name || img.original_name,
          publicUrl:
            img.url || supabase.storage.from('product-images').getPublicUrl(img.storage_path).data.publicUrl,
          url: img.url,
          imported_from_csv: !!img.imported_from_csv,
        })) || [];

      // dedupe by id to avoid duplicate keys during render
      const deduped: StagingImage[] = Object.values(
        mapped.reduce((acc: Record<string, StagingImage>, it: StagingImage) => {
          acc[it.id] = it;
          return acc;
        }, {})
      );

      setImages(deduped);
    } catch (err: any) {
      addLog(`Erro: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, page, debouncedSearch, brandFilter, ITEMS_PER_PAGE]);

  // Ajusta itens por página com base no tamanho da viewport (menos itens em mobile)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setItemsPerPage(12);
        setIsMobile(true);
      } else {
        setItemsPerPage(50);
        setIsMobile(false);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      try {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recarrega quando a busca filtrada mudar
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchData(false);
  }, [debouncedSearch, brandFilter, productImageFilter]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    if (isMobile) return; // no infinite observer on mobile

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          fetchData(true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) obs.observe(observerTarget.current);
    return () => {
      if (observerTarget.current) obs.unobserve(observerTarget.current);
      obs.disconnect();
    };
  }, [observerTarget, hasMore, loading, fetchData]);

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
    setIsMatching(true);
    setProgress(0);
    setShowSmartModal(false);

    let successCount = 0;
    const total = smartMatches.length;

    for (let i = 0; i < total; i++) {
      const match = smartMatches[i];
      try {
        const prod = products.find((p) => p.id === match.productId);
        const img = images.find((it) => it.id === match.imageId);
        if (!prod || !img) continue;

        // 1. Busca estado atual (evita sobrescrever)
        const { data: currentProd } = await supabase
          .from('products')
          .select('image_variants, gallery_images, image_url')
          .eq('id', match.productId)
          .maybeSingle();

        const currentGallery = Array.isArray(currentProd?.gallery_images) ? currentProd!.gallery_images : [];

        // 2. Prepara a nova imagem com variantes
        const baseurl = img.publicUrl.replace(/-(480w|1200w)\.webp$/, '');
        const basePath = img.storage_path ? img.storage_path.replace(/-(480w|1200w)\.webp$/, '') : null;

        const variants = [
          { url: `${baseurl}-480w.webp`, path: basePath ? `${basePath}-480w.webp` : null, size: 480 },
          { url: `${baseurl}-1200w.webp`, path: basePath ? `${basePath}-1200w.webp` : null, size: 1200 },
        ];

        const newGalleryItem = {
          url: `${baseurl}-1200w.webp`,
          path: basePath ? `${basePath}-1200w.webp` : null,
          variants,
        };

        // 3. Monta updates
        const updates: any = { updated_at: new Date().toISOString() };

        if (!currentProd?.image_url) {
          updates.image_variants = variants;
          updates.image_url = newGalleryItem.url;
          updates.image_path = newGalleryItem.path;
        }

        const alreadyExists = currentGallery.some((g: any) => g.path === newGalleryItem.path || g.url === newGalleryItem.url);
        updates.gallery_images = alreadyExists ? currentGallery : [...currentGallery, newGalleryItem];

        await supabase.from('products').update(updates).eq('id', match.productId);
        await supabase.from('staging_images').delete().eq('id', img.id);

        successCount++;
        setProgress(Math.round(((i + 1) / total) * 100));
      } catch (e) {
        addLog(`Erro no match ${match.ref}`, 'error');
      }
    }

    toast.success(`${successCount} produtos vinculados!`);
    setIsMatching(false);
    setProgress(0);
    fetchData();
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

      // Busca estado atual do produto (image_variants, gallery_images, linked_images)
      const { data: currentProd } = await supabase
        .from('products')
        .select('image_variants, gallery_images, linked_images, image_url')
        .eq('id', pid)
        .maybeSingle();

      const currentCover = Array.isArray(currentProd?.image_variants)
        ? currentProd!.image_variants
        : [];
      const currentGallery = Array.isArray(currentProd?.gallery_images)
        ? currentProd!.gallery_images
        : [];

      // utilitário local para gerar variantes (opção rápida: fallback para usar a mesma URL)
      const makeVariants = (fullUrl: string, fullPath?: string | null) => {
        // Se não houver um pipeline que gere -480w/-1200w, usamos a mesma URL
        // tanto para a thumbnail quanto para o zoom para evitar 400/404.
        return {
          variants: [
            { url: fullUrl, path: fullPath || null, size: 480 },
            { url: fullUrl, path: fullPath || null, size: 1200 },
          ],
          coverVariants: [
            { url: fullUrl, path: fullPath || null, size: 480 },
            { url: fullUrl, path: fullPath || null, size: 1200 },
          ],
          url: fullUrl,
          path: fullPath || null,
        };
      };

      const builtItems = images
        .filter((i) => iids.includes(i.id))
        .map((i) => makeVariants(i.publicUrl, i.storage_path || null));

      const updates: any = { sync_status: 'synced', updated_at: new Date().toISOString() };

      // Se não existe capa, use a primeira selecionada como capa
      if (!currentCover || currentCover.length === 0) {
        const first = builtItems[0];
        if (first) {
          updates.image_variants = first.coverVariants;
          updates.image_url = first.url;
        }
      }

      // Append na gallery_images evitando duplicados
      const mergedGallery = [...currentGallery];
      for (const b of builtItems) {
        const exists = mergedGallery.some((it: any) => (it.path && b.path && it.path === b.path) || it.url === b.url);
        if (!exists) mergedGallery.push({ url: b.url, path: b.path, variants: b.variants });
      }

      updates.gallery_images = mergedGallery;
      updates.linked_images = Array.from(new Set([...(currentProd?.linked_images || []), ...builtItems.map((b) => b.url)]));

      // Mantém images (antigo) como lista de URLs para compatibilidade
      const existingImages = Array.isArray(currentProd?.linked_images) ? currentProd!.linked_images : [];
      updates.images = Array.from(new Set([...(existingImages || []), ...builtItems.map((b) => b.url)]));

      await supabase.from('products').update(updates).eq('id', pid);

      // Compatibilidade: insere em product_images também
      try {
        const galleryItems = builtItems.map((b, idx) => ({
          product_id: pid,
          url: b.url,
          is_primary: false,
          position: idx,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('product_images').upsert(galleryItems, { onConflict: 'product_id,url' });
      } catch (e) {
        // ignore gallery errors
      }

      await supabase.from('staging_images').delete().in('id', iids);
      toast.success('Vínculo realizado com sucesso!');
      fetchData();
      setSelectedImageIds([]);

      // Revalidate public catalog to ensure catalog shows new gallery images
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: pc, error: pcError } = await supabase
            .from('public_catalogs')
            .select('slug')
            .eq('user_id', user.id)
            .maybeSingle();
          if (pcError) {
            console.warn('public_catalogs fetch error (matcher):', pcError?.message || pcError);
          } else if (pc?.slug) {
            await fetch(`/api/revalidate?slug=${encodeURIComponent(pc.slug)}`, { method: 'POST' });
          }
        }
      } catch (e) {
        // ignore
      }
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
    // Server-side filtering handles search and brand; keep client-side image filter
    if (productImageFilter === 'all') return products;
    return products.filter((p) => {
      const hasImg = (p.images?.length || 0) > 0 || !!p.image_url;
      return productImageFilter === 'with' ? hasImg : !hasImg;
    });
  }, [products, productImageFilter]);

  // Desvincular imagem da galeria
  const handleUnlinkImage = async (productId: string, imageUrl: string) => {
    try {
      setLoading(true);
      const { data: prod } = await supabase
        .from('products')
        .select('gallery_images, image_variants, image_url')
        .eq('id', productId)
        .maybeSingle();

      if (!prod) return;

      const updatedGallery = (prod.gallery_images || []).filter((img: any) => img.url !== imageUrl);

      const updates: any = { gallery_images: updatedGallery, updated_at: new Date().toISOString() };

      if (prod.image_url === imageUrl) {
        const nextImg = updatedGallery[0];
        updates.image_url = nextImg?.url || null;
        updates.image_path = nextImg?.path || null;
        updates.image_variants = nextImg?.variants || null;
      }

      const { error } = await supabase.from('products').update(updates).eq('id', productId);
      if (error) throw error;

      toast.success('Imagem removida da galeria');
      fetchData();
    } catch (err: any) {
      toast.error('Erro ao remover imagem: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 overflow-hidden">
      {/* HEADER BAR */}
      <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          {/* Mobile toggle: mostra painel de produtos */}
          <button
            onClick={() => setShowProductsPanel((s) => !s)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            aria-label={showProductsPanel ? 'Fechar produtos' : 'Abrir produtos'}
          >
            {showProductsPanel ? <X size={18} /> : <Menu size={18} />}
          </button>
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

      {isMatching && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-slate-100 dark:text-slate-800 stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-indigo-600 stroke-current" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-slate-900 dark:text-white">{progress}%</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter">Vinculando Imagens</h3>
              <p className="text-sm text-slate-500 font-medium">Por favor, não feche esta aba.</p>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE DIVIDIDO */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* COLUNA ESQUERDA: PRODUTOS (SCROLL INDEPENDENTE) */}
        <aside
          className={
            `${showProductsPanel ? 'block' : 'hidden'} w-full md:block md:w-[400px] lg:w-[450px] border-r border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden`
          }
        >
          <div className="p-4 bg-white border-b space-y-3">
            {/* Close mobile panel */}
            <div className="flex items-center justify-between md:hidden">
              <div />
              <button
                onClick={() => setShowProductsPanel((s) => !s)}
                className="text-xs font-black uppercase text-slate-500 p-1 hover:bg-slate-100 rounded"
                aria-label={showProductsPanel ? 'Fechar produtos' : 'Abrir produtos'}
              >
                {showProductsPanel ? 'Fechar' : 'Abrir'}
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ref ou Nome (Busca inteligente)..."
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
                        <div key={idx} className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-100">
                          <img
                            src={imgUrl || p.image_url || '/placeholder.png'}
                            className="w-full h-full object-cover"
                          />
                          {(imgUrl || p.image_url) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const src = imgUrl || p.image_url || '';
                                if (confirm('Remover esta imagem da galeria?')) {
                                  handleUnlinkImage(p.id, src);
                                }
                              }}
                              title="Remover imagem"
                              className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                              <X size={10} />
                            </button>
                          )}
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
            {hasMore && (
              isMobile ? (
                <div className="flex items-center justify-center w-full py-4">
                  <button
                    onClick={() => fetchData(true)}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {loading ? 'Carregando...' : 'Carregar mais'}
                  </button>
                </div>
              ) : (
                <div ref={observerTarget} className="h-20 flex items-center justify-center w-full">
                  <div className="flex items-center gap-2 text-slate-400 animate-pulse">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Carregando mais produtos...</span>
                  </div>
                </div>
              )
            )}

            {!hasMore && products.length > 0 && (
              <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-50">
                Fim do catálogo
              </div>
            )}
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
              {/* Mobile: botão rápido para escolher produto quando houver seleção */}
              {selectedImageIds.length > 0 && (
                <button
                  onClick={() => setShowMobileProductPicker(true)}
                  className="md:hidden text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg uppercase"
                >
                  Vincular a...
                </button>
              )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
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
                      className="w-full h-full object-contain p-3 md:p-6 group-hover:scale-105 transition-transform duration-300"
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
      <footer className="h-32 bg-slate-900 border-t border-slate-800 flex flex-col z-0 relative">
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

      {/* Mobile: Product Picker Modal (quando selecionar imagens) */}
      {showMobileProductPicker && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black uppercase text-sm">Escolher Produto</h3>
              <button
                onClick={() => setShowMobileProductPicker(false)}
                className="text-slate-500 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await handleLink(p.id, selectedImageIds);
                    setShowMobileProductPicker(false);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-sm truncate uppercase">{p.reference_code}</div>
                    <div className="text-xs text-slate-500 truncate">{p.name}</div>
                  </div>
                  {p.image_url && <Check size={16} className="text-emerald-500" />}
                </button>
              ))}
              {hasMore && (
                <div className="pt-4">
                  <button
                    onClick={() => fetchData(true)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black"
                  >
                    Carregar mais
                  </button>
                </div>
              )}
              {filteredProducts.length === 0 && (
                <div className="p-6 text-center text-slate-400">Nenhum produto encontrado</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
