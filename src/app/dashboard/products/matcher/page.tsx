/* eslint-disable max-lines */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, Search } from 'lucide-react';
import SmartImageUpload from '@/components/SmartImageUpload';

interface Product {
  id: string;
  name: string;
  reference_code?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  brand?: string | null;
}
interface StagingImage {
  id: string;
  storage_path?: string | null;
  original_name?: string | null;
  publicUrl: string;
  imported_from_csv?: boolean;
}

// Raw DB staging image shape intentionally not typed to avoid
// coupling with Supabase client typings in this client component.

export default function MatcherPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [productImageFilter, setProductImageFilter] = useState<
    'all' | 'with' | 'without'
  >('all');
  const [sortOption, setSortOption] = useState<
    'name_asc' | 'name_desc' | 'ref_asc'
  >('name_asc');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(
    null
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs((p) => [...p, `${icon}${message}`]);
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
        .order('created_at', { ascending: false });
      const pData: Product[] = (productsData || []).map((p: Product) => ({
        id: p.id,
        name: p.name,
        reference_code: p.reference_code,
        image_url: p.image_url,
        images: Array.isArray(p.images)
          ? (p.images as string[])
              .map((it) => (typeof it === 'string' ? it : String(it)))
              .filter(Boolean)
          : [],
        brand: p.brand,
      }));
      setProducts(pData);
      // populate brands for filter
      const brands = Array.from(
        new Set(pData.map((p) => p.brand).filter(Boolean))
      );
      setAvailableBrands(brands as string[]);

      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const imgs: StagingImage[] = (imagesData || []).map((img) => {
        let publicUrl = img.url || '';
        if (!publicUrl && img.storage_path) {
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(img.storage_path);
          publicUrl = data?.publicUrl || '';
        }
        return {
          id: img.id,
          storage_path: img.storage_path,
          original_name: img.file_name || img.original_name || null,
          publicUrl,
          imported_from_csv: !!img.imported_from_csv,
        };
      });
      setImages(imgs);
      addLog(
        `Carregados: ${pData.length} produtos e ${imgs.length} imagens.`,
        'info'
      );
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erro ao carregar dados');
      addLog(`Erro ao carregar dados: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleImageSelection = (id: string) =>
    setSelectedImageIds((p) =>
      p.includes(id) ? p.filter((i) => i !== id) : [...p, id]
    );

  const handleLink = async (
    productId?: string | null,
    imageIdsInput?: string[]
  ) => {
    const pid = productId || selectedProductId;
    const iids = imageIdsInput || selectedImageIds;
    if (!pid || iids.length === 0) {
      toast.error('Selecione produto e imagem');
      return;
    }
    try {
      setLoading(true);
      const product = products.find((p) => p.id === pid);
      if (!product) throw new Error('Produto não encontrado');
      const imagesObj = images.filter((i) => iids.includes(i.id));
      const current = Array.isArray(product.images) ? product.images : [];
      const combined = Array.from(
        new Set([...current, ...imagesObj.map((i) => i.publicUrl)])
      );
      const { error } = await supabase
        .from('products')
        .update({
          image_url: product.image_url || combined[0],
          images: combined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);
      if (error) throw error;
      await supabase.from('staging_images').delete().in('id', iids);
      setProducts((p) =>
        p.map((x) =>
          x.id === pid
            ? {
                ...x,
                images: combined,
                image_url: product.image_url || combined[0],
              }
            : x
        )
      );
      setImages((i) => i.filter((img) => !iids.includes(img.id)));
      setSelectedImageIds([]);
      setSelectedProductId(null);
      addLog('Imagens vinculadas', 'success');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Erro ao vincular');
      addLog(`Erro ao vincular: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = (searchProduct || '').toLowerCase();
    let base = products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.reference_code || '').toLowerCase().includes(term)
    );

    if (brandFilter !== 'all')
      base = base.filter((p) => p.brand === brandFilter);

    if (productImageFilter !== 'all') {
      base = base.filter((p) => {
        const hasImage =
          Boolean(p.image_url) ||
          (Array.isArray(p.images) && p.images.length > 0);
        return productImageFilter === 'with' ? hasImage : !hasImage;
      });
    }

    base.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'ref_asc':
          return (a.reference_code || '').localeCompare(b.reference_code || '');
        default:
          return 0;
      }
    });

    return base;
  }, [products, searchProduct, brandFilter, productImageFilter, sortOption]);

  const filteredImages = useMemo(
    () => images.filter((i) => !showImportedOnly || i.imported_from_csv),
    [images, showImportedOnly]
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            className="p-2 rounded bg-white shadow"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold">Matcher de Produtos</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 bg-white rounded">
            <RefreshCcw size={16} />
          </button>
          <button
            onClick={() => setShowImportedOnly((s) => !s)}
            className="px-3 py-1 bg-white rounded"
          >
            {showImportedOnly ? 'Apenas importadas' : 'Todas'}
          </button>
          <button
            onClick={() => handleLink()}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded"
          >
            Vincular
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Produtos ({filteredProducts.length})</h3>
            <div className="flex items-center gap-2">
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="text-sm rounded border px-2 py-1"
              >
                <option value="all">Todas as marcas</option>
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
                className="text-sm rounded border px-2 py-1"
              >
                <option value="all">Todos</option>
                <option value="with">Com imagem</option>
                <option value="without">Sem imagem</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(
                    e.target.value as 'name_asc' | 'name_desc' | 'ref_asc'
                  )
                }
                className="text-sm rounded border px-2 py-1"
              >
                <option value="name_asc">Nome A → Z</option>
                <option value="name_desc">Nome Z → A</option>
                <option value="ref_asc">Ref. A → Z</option>
              </select>
            </div>
          </div>

          <div className="relative mb-2">
            <input
              placeholder="Buscar..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full mb-0 p-2 border rounded pl-9"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {loading ? (
              <div className="text-gray-500">Carregando...</div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 border rounded cursor-pointer ${selectedProductId === p.id ? 'ring-2 ring-[var(--primary)]' : ''} ${dragOverProductId === p.id ? 'bg-green-50 ring-2 ring-green-400' : ''}`}
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
                      'application/x-product-images'
                    );
                    if (data) {
                      try {
                        const ids = JSON.parse(data);
                        if (Array.isArray(ids) && ids.length > 0)
                          handleLink(p.id, ids);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.reference_code}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Fotos ({filteredImages.length})</h3>
            <button
              onClick={() => setShowUploader((s) => !s)}
              className="px-3 py-1 bg-white border rounded"
            >
              {showUploader ? 'Fechar' : 'Adicionar'}
            </button>
          </div>

          {showUploader && (
            <div className="mb-3">
              <SmartImageUpload
                onUploadReady={async (file) => {
                  try {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) throw new Error('Não autenticado');
                    const filename = `${user.id}/${Date.now()}-${(file as File).name || 'upload'}`;
                    const { error: uploadError } = await supabase.storage
                      .from('product-images')
                      .upload(filename, file as File);
                    if (uploadError) throw uploadError;
                    const { data: publicData } = supabase.storage
                      .from('product-images')
                      .getPublicUrl(filename);
                    const { data: insertData, error: insertError } =
                      await supabase
                        .from('staging_images')
                        .insert([
                          {
                            user_id: (await supabase.auth.getUser()).data.user
                              ?.id,
                            storage_path: filename,
                            url: publicData?.publicUrl || null,
                            file_name: (file as File).name,
                          },
                        ])
                        .select()
                        .maybeSingle();
                    if (insertError) throw insertError;
                    // Refresh data and auto-select the newly inserted image
                    await fetchData();
                    if (insertData && insertData.id)
                      setSelectedImageIds([insertData.id]);
                  } catch (err: unknown) {
                    console.error(err);
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    toast.error('Erro no upload');
                    addLog(`Erro no upload: ${msg}`, 'error');
                  }
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  let idsToDrag = selectedImageIds;
                  if (!idsToDrag.includes(img.id)) {
                    idsToDrag = [img.id];
                    setSelectedImageIds([img.id]);
                  }
                  e.dataTransfer.setData(
                    'application/x-product-images',
                    JSON.stringify(idsToDrag)
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={`p-1 border rounded cursor-pointer ${selectedImageIds.includes(img.id) ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => toggleImageSelection(img.id)}
              >
                <img
                  src={img.publicUrl}
                  alt={img.original_name || 'img'}
                  className="w-full h-28 object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={logsEndRef} className="sr-only" />
    </div>
  );
}
