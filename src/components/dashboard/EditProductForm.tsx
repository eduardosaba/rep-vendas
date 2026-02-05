'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { updateProductAction } from '@/app/actions/product-actions';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import {
  ArrowLeft,
  Loader2,
  Save,
  Image as ImageIcon,
  Package,
  Barcode,
  Palette,
  Sparkles,
  X,
  Copy,
  UploadCloud,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import ImageWithRetry from '@/components/ui/ImageWithRetry';

// --- SUB-COMPONENTE: UPLOAD ---
const ImageUploader = ({
  images,
  onUpload,
  onRemove,
  onSetCover,
  isShared,
}: {
  images: { url: string; path: string | null }[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
  isShared: boolean;
}) => {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const supabaseClient = createClient();

  const StorageFirstImage = ({
    storagePath,
    externalUrl,
    alt,
  }: {
    storagePath: string | null;
    externalUrl: string | null;
    alt?: string;
  }) => {
    const placeholder = 'https://via.placeholder.com/600x600?text=Sem+imagem';

    // Prefer the internal storage proxy first (works with private buckets).
    // If proxy fails, fall back to the external URL once.
    const [src, setSrc] = React.useState<string>(() => {
      if (storagePath) {
        const pathClean = storagePath.startsWith('/')
          ? storagePath.slice(1)
          : storagePath;
        return `/api/storage-image?path=${encodeURIComponent(pathClean)}`;
      }
      if (externalUrl) return externalUrl;
      return placeholder;
    });

    const triedStorage = React.useRef(false);
    const triedExternal = React.useRef(false);

    return (
      <img
        src={src}
        className="w-full h-full object-contain p-1 cursor-zoom-in"
        alt={alt || 'Product image'}
        onClick={() => src && setZoomImage(src)}
        onError={(e) => {
          const t = e.currentTarget as HTMLImageElement;
          // If current src is external and storagePath is available, try storage once
          if (!triedStorage.current && storagePath && src === externalUrl) {
            triedStorage.current = true;
            const pathClean = storagePath.startsWith('/')
              ? storagePath.slice(1)
              : storagePath;
            setSrc(`/api/storage-image?path=${encodeURIComponent(pathClean)}`);
            return;
          }

          // If current src is storage proxy and we have an external url, try it once
          if (!triedExternal.current && externalUrl && src !== externalUrl) {
            triedExternal.current = true;
            setSrc(externalUrl);
            return;
          }

          // Avoid infinite loop and show placeholder
          t.onerror = null;
          setSrc(placeholder);
        }}
        loading="lazy"
        style={{ height: 'auto' }}
      />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
        <ImageIcon size={18} className="text-primary" /> Galeria de Imagens
      </h3>

      {isShared && (
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full uppercase mb-3">
          <Copy size={12} /> Imagens Compartilhadas (Master)
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {images.map((imgEntry, index) => {
          const entry = imgEntry as { url: string; path: string | null };
          const url = entry?.url || '';
          const path = entry?.path || null;
          const external = url && url.startsWith('http') ? url : null;

          return (
            <div
              key={index}
              className={`relative aspect-square rounded-lg overflow-hidden border group transition-all bg-gray-50 dark:bg-slate-800 ${
                index === 0
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                  : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              <StorageFirstImage
                storagePath={path}
                externalUrl={external}
                alt={`Imagem ${index + 1}`}
              />

              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                title="Remover imagem"
              >
                <X size={14} />
              </button>

              {index === 0 ? (
                <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-white text-[10px] text-center py-1 font-bold z-10">
                  CAPA
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetCover(index)}
                  className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 hover:bg-primary/80 transition-colors z-10"
                >
                  Definir Capa
                </button>
              )}
            </div>
          );
        })}

        <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-blue-300 transition-all group relative">
          <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-primary/10 dark:group-hover:bg-primary/20 group-hover:text-primary transition-colors">
            <UploadCloud size={24} />
          </div>
          <span className="text-xs text-gray-500 mt-2 font-medium">
            Adicionar
          </span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={onUpload}
          />
        </label>
      </div>

      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-6xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <img
              src={zoomImage}
              alt="Ampliado"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
            >
              <X size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Normalize image entry helper (top-level so subcomponents can use)
// Normalize an entry into an array of objects { url, path }
// - Strings may contain multiple URLs separated by ';'
// - Objects may already contain url and storage_path/path
function normalizeImageEntry(
  entry: any
): { url: string; path: string | null }[] {
  if (!entry) return [];

  // If it's a string, it can contain multiple ; separated URLs
  if (typeof entry === 'string') {
    return entry
      .split(';')
      .map((u: string) => u.trim())
      .filter(Boolean)
      .map((u: string) => ({ url: u, path: null }));
  }

  // If it's an object, normalize known keys
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    const url =
      entry.optimized_url ||
      entry.optimizedUrl ||
      entry.url ||
      entry.src ||
      entry.publicUrl ||
      entry.public_url ||
      '';
    const path = entry.storage_path || entry.path || entry.image_path || null;
    return [{ url: String(url || ''), path: path || null }];
  }

  return [];
}

// Normalize and expand image entries into a flat array of {url,path} objects.
function normalizeAndExplodeImageEntries(
  images: any
): { url: string; path: string | null }[] {
  if (!images) return [];
  const arr = Array.isArray(images) ? images : [images];
  const out: { url: string; path: string | null }[] = [];

  for (const entry of arr) {
    const items = normalizeImageEntry(entry);
    for (const it of items) {
      if (it.url) out.push({ url: it.url.trim(), path: it.path });
    }
  }

  // Remove duplicates by url while preserving order
  const seen = new Set<string>();
  return out.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
}

// --- COMPONENTE PRINCIPAL ---
export function EditProductForm({ product }: { product: Product }) {
  const router = useRouter();
  const supabase = createClient();

  // (normalizeImageEntry is declared at file top so ImageUploader can use it)

  // Estados
  const [loading, setLoading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [needsDetach, setNeedsDetach] = useState(false);

  // Listas Auxiliares
  const [brandsList, setBrandsList] = useState<{ id: string; name: string }[]>(
    []
  );
  const [categoriesList, setCategoriesList] = useState<
    { id: string; name: string }[]
  >([]);

  // Helpers de formatação inicial
  const formatInitialPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper para parsear technical_specs (detecta JSON strings)
  const parseTechnicalSpecs = (specs: any) => {
    if (!specs)
      return { mode: 'text', text: '', table: [{ key: '', value: '' }] };

    // Se for objeto, usa modo tabela
    if (typeof specs === 'object' && !Array.isArray(specs)) {
      return {
        mode: 'table',
        text: JSON.stringify(specs, null, 2),
        table: Object.entries(specs).map(([k, v]) => ({
          key: k,
          value: String(v),
        })),
      };
    }

    // Se for string, tenta parsear como JSON
    if (typeof specs === 'string') {
      try {
        const parsed = JSON.parse(specs);

        // Se parseou para um objeto simples { k: v }
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            mode: 'table',
            text: specs,
            table: Object.entries(parsed).map(([k, v]) => ({
              key: k,
              value: String(v),
            })),
          };
        }

        // Se parseou para um array, tentamos extrair pares {key, value} ou [key, value]
        if (Array.isArray(parsed)) {
          const rows: { key: string; value: string }[] = [];
          for (const item of parsed) {
            if (!item) continue;
            if (typeof item === 'object' && !Array.isArray(item)) {
              // objeto com campos key/value ou {k: v} (pegamos key/value se existir)
              if ('key' in item && 'value' in item) {
                rows.push({ key: String(item.key), value: String(item.value) });
              } else {
                // objeto genérico: adicionar todas as entradas
                for (const [k, v] of Object.entries(item)) {
                  rows.push({ key: k, value: String(v) });
                }
              }
            } else if (Array.isArray(item) && item.length >= 2) {
              rows.push({ key: String(item[0]), value: String(item[1]) });
            } else {
              // item simples: ignorar ou colocar como valor genérico
            }
          }
          if (rows.length > 0) {
            return { mode: 'table', text: specs, table: rows };
          }
        }
      } catch (e) {
        // Não é JSON válido, mantém como texto
      }
      // Fallback simples: tentar parsear texto livre com linhas "key: value"
      try {
        const lines = String(specs)
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const rows: { key: string; value: string }[] = [];
        for (const line of lines) {
          let sep = null as string | null;
          if (line.includes(':')) sep = ':';
          else if (line.includes('=')) sep = '=';
          else if (line.includes(' - ')) sep = ' - ';
          if (!sep) continue;
          const parts = line.split(sep);
          const key = parts.shift()?.trim() || '';
          const value = parts.join(sep).trim();
          if (key) rows.push({ key, value });
        }
        if (rows.length > 0) {
          return { mode: 'table', text: specs, table: rows };
        }
      } catch (e) {
        // ignore
      }

      return {
        mode: 'text',
        text: specs,
        table: [{ key: '', value: '' }],
      };
    }

    return { mode: 'text', text: '', table: [{ key: '', value: '' }] };
  };

  const techSpecs = parseTechnicalSpecs(product.technical_specs);

  // Inicializa o formulário
  const [formData, setFormData] = useState({
    name: product.name || '',
    reference_code: product.reference_code || '',
    class_core: (product as any)?.class_core || '',
    slug: product.slug || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    color: product.color || '',

    price: formatInitialPrice(product.price),
    sale_price: formatInitialPrice(product.sale_price),
    original_price: formatInitialPrice(product.original_price),

    discount_percent: 0,

    brand: product.brand || '',
    category: product.category || '',
    description: product.description || '',
    technical_specs_mode: techSpecs.mode,
    technical_specs_text: techSpecs.text,
    technical_specs_table: techSpecs.table,
    track_stock: product.track_stock ?? false,
    stock_quantity: product.stock_quantity ?? 0,
    is_launch: product.is_launch ?? false,
    is_best_seller: product.is_best_seller || product.bestseller || false,
    images: normalizeAndExplodeImageEntries(
      product.images || (product.image_url ? [product.image_url] : [])
    ).filter(Boolean),
  });

  // DEBUG: log das imagens para diagnóstico rápido (remover depois)
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug(
        '[DEBUG] EditProductForm formData.images:',
        formData.images
      );
    } catch (e) {}
  }, [formData.images]);

  // Listener para confirmar saída
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Carregar Marcas e Categorias
  useEffect(() => {
    const fetchAux = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [bRes, cRes] = await Promise.all([
        supabase
          .from('brands')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name'),
        supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name'),
      ]);

      if (bRes.data) setBrandsList(bRes.data);
      if (cRes.data) setCategoriesList(cRes.data);
    };
    fetchAux();
  }, [supabase]);

  // Handlers
  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    setNeedsDetach(true);
    setUploadProgress(0);
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];
    let progressInterval: any = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Login necessário');
      // 1) Create temporary previews immediately so user sees selected images
      const tempEntries = files.map((file) => ({
        file,
        tempUrl: URL.createObjectURL(file),
      }));

      // Append temp previews as objects so UI shows them at once
      updateField('images', [
        ...(formData.images || []),
        ...tempEntries.map((t) => ({ url: t.tempUrl, path: null })),
      ]);

      // 2) Upload each file and replace its temp preview with the final publicUrl + storage path
      for (const entry of tempEntries) {
        const file = entry.file;
        const fileExt = file.name.split('.').pop();
        const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const fullPath = `${user.id}/products/${baseName}`;

        let simulated = 0;
        progressInterval = setInterval(() => {
          simulated = Math.min(95, simulated + Math.random() * 12 + 5);
          setUploadProgress(Math.round(simulated));
        }, 300);

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fullPath, file);

        if (uploadError) throw uploadError;

        if (progressInterval) clearInterval(progressInterval);

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fullPath);

        // Replace the tempUrl object in formData.images with the real object {url, path}
        setFormData((prev) => {
          const imgs = [...(prev.images || [])];
          const idx = imgs.findIndex((x: any) => x && x.url === entry.tempUrl);
          const newObj = { url: data.publicUrl, path: fullPath };
          if (idx !== -1) imgs[idx] = newObj;
          else imgs.push(newObj as any);
          return { ...prev, images: imgs } as any;
        });

        // Revoke the object URL after a short delay to avoid breaking image rendering
        setTimeout(() => {
          try {
            URL.revokeObjectURL(entry.tempUrl);
          } catch {}
        }, 2000);
      }
      // If the product was using a shared image (master/shared copy),
      // request a copy-on-write so the product gets its own copy before
      // we persist the user's new upload. This runs async in background.
      try {
        const isShared = (product as any)?.image_is_shared;
        const sourcePath = (product as any)?.image_path;
        if (isShared && sourcePath) {
          fetch('/api/image/copy-on-write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath, productId: product.id }),
          }).catch((e) => {
            console.error('Failed to request copy-on-write', e);
          });
        }
      } catch (err) {
        console.error('copy-on-write trigger error', err);
      }

      setUploadingImage(false);
      setUploadProgress(null);
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao enviar imagens', { description: error.message });
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
    }
  };

  const removeImage = (index: number) => {
    updateField(
      'images',
      formData.images.filter((_, i) => i !== index)
    );
    setNeedsDetach(true);
  };

  const setAsCover = (index: number) => {
    const newImages = [...formData.images];
    const selectedRaw = newImages.splice(index, 1)[0];

    // Normalizar entrada selecionada para garantir que `url` seja string
    let normalizedSelected: { url: string; path: string | null };
    if (typeof selectedRaw === 'string') {
      normalizedSelected = { url: selectedRaw, path: null };
    } else if (selectedRaw && typeof selectedRaw === 'object') {
      normalizedSelected = {
        url:
          (selectedRaw as any).url ||
          (selectedRaw as any).tempUrl ||
          (selectedRaw as any).path ||
          '',
        path: (selectedRaw as any).path || null,
      };
    } else {
      normalizedSelected = { url: String(selectedRaw || ''), path: null };
    }

    // Coloca o item normalizado no início
    newImages.unshift(normalizedSelected as any);
    updateField('images', newImages);
    toast.success('Capa atualizada (Salve para confirmar)');
    setNeedsDetach(true);

    // Se for um blob URL (preview local), não chamar o endpoint de enfileiramento
    const selectedUrl = normalizedSelected.url || '';
    if (!product?.id) return;
    if (selectedUrl.startsWith('blob:')) {
      toast.info('Capa temporária selecionada. Aguarde o upload finalizar.');
      return;
    }

    (async () => {
      try {
        // Tenta encontrar um product_image já existente que corresponda à URL (optimized_url, storage_path ou url)
        try {
          const { data: pi } = await supabase
            .from('product_images')
            .select('id, sync_status')
            .eq('product_id', product.id)
            .or(
              `optimized_url.eq.${encodeURIComponent(selectedUrl)},storage_path.eq.${encodeURIComponent(selectedUrl)},url.eq.${encodeURIComponent(selectedUrl)}`
            )
            .limit(1)
            .maybeSingle();

          if (pi && pi.id && pi.sync_status === 'synced') {
            // Chama o endpoint administrativo para set-cover
            const res = await fetch('/api/admin/set-cover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.id,
                productImageId: pi.id,
              }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
              toast.success('Capa atualizada com sucesso.');
              // Força refresh para refletir nova capa
              try {
                router.refresh();
              } catch {}
              return;
            }
          }
        } catch (e) {
          // Falha na busca — seguir fallback para enfileirar
          console.warn('product_images lookup failed', e);
        }

        // Fallback: enfileirar via mark-image-pending (compatibilidade)
        const res = await fetch('/api/admin/mark-image-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, url: selectedUrl }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error('mark-image-pending failed', json);
          toast.error('Falha ao enfileirar sincronização da imagem.');
        } else if (json.alreadySynced) {
          toast.success('Imagem já sincronizada.');
        } else {
          toast.info('Imagem enfileirada para sincronização.');
        }
      } catch (err) {
        console.error('mark-image-pending error', err);
      }
    })();
  };

  const generateDescription = () => {
    if (!formData.name) return toast.warning('Preencha o nome primeiro.');
    setGeneratingDesc(true);
    setTimeout(() => {
      const desc = `O **${formData.name}** oferece qualidade e estilo. \n\nIdeal para quem busca durabilidade e design moderno.\n\nPrincipais características:\n- Alta resistência\n- Acabamento premium`;
      updateField('description', desc);
      setGeneratingDesc(false);
      toast.success('Descrição gerada!');
    }, 1000);
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const float = parseFloat(numbers) / 100;
    return float.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePriceChange = (
    field: 'price' | 'sale_price' | 'original_price',
    value: string
  ) => {
    if (!value) {
      updateField(field, '');
      return;
    }
    updateField(field, formatCurrency(value));
  };

  // Ficha técnica: manipulação de linhas da tabela
  const addTechRow = () => {
    updateField('technical_specs_table', [
      ...(formData.technical_specs_table || []),
      { key: '', value: '' },
    ]);
  };

  const removeTechRow = (idx: number) => {
    const copy = [...(formData.technical_specs_table || [])];
    copy.splice(idx, 1);
    updateField(
      'technical_specs_table',
      copy.length ? copy : [{ key: '', value: '' }]
    );
  };

  const updateTechRow = (
    idx: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const copy = [...(formData.technical_specs_table || [])];
    copy[idx] = { ...copy[idx], [field]: value };
    updateField('technical_specs_table', copy);
  };

  const handleDeleteProduct = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      if (error) throw error;
      toast.success('Produto excluído.');
      // trigger revalidation for the public catalog
      try {
        const { data: pc } = await supabase
          .from('public_catalogs')
          .select('slug')
          .eq('user_id', product.user_id)
          .maybeSingle();
        if (pc?.slug) {
          await fetch(`/api/revalidate?slug=${encodeURIComponent(pc.slug)}`, {
            method: 'POST',
          });
        }
      } catch (e) {
        console.warn('revalidate failed', e);
      }

      router.push('/dashboard/products');
    } catch (error: any) {
      toast.error('Erro ao excluir', { description: error.message });
      setLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalPrice =
        parseFloat(formData.price.replace(/\./g, '').replace(',', '.')) || 0;
      const finalSalePrice = formData.sale_price
        ? parseFloat(formData.sale_price.replace(/\./g, '').replace(',', '.'))
        : null;
      const finalOriginalPrice = formData.original_price
        ? parseFloat(
            formData.original_price.replace(/\./g, '').replace(',', '.')
          )
        : null;

      let technical_specs: any = null;
      if (formData.technical_specs_mode === 'table') {
        const obj: Record<string, string> = {};
        (formData.technical_specs_table || []).forEach((r: any) => {
          if (r.key && r.key.trim() !== '') obj[r.key] = r.value;
        });
        technical_specs = Object.keys(obj).length > 0 ? obj : null;
      } else {
        technical_specs = formData.technical_specs_text
          ? String(formData.technical_specs_text)
          : null;
      }

      const isShared = (product as any).image_is_shared;

      // Proteção: mesclar imagens do form com as imagens existentes no banco
      // para evitar sobrescrever a galeria quando o form estiver incompleto.
      const normalizePayloadEntry = (it: any) =>
        typeof it === 'string'
          ? { url: it, path: null }
          : it || { url: '', path: null };

      let mergedImages: { url: string; path: string | null }[] = (
        formData.images || []
      ).map((it: any) => normalizePayloadEntry(it));

      try {
        // Se o usuário não forneceu imagens no form (ou está vazio), preserve as existentes
        const { data: current } = await supabase
          .from('products')
          .select('images, reference_code')
          .eq('id', product.id)
          .maybeSingle();

        const existing: any[] = (
          current && Array.isArray(current.images) ? current.images : []
        ) as any[];

        // Função auxiliar para gerar uma chave âncora (usa filename base e reference_code quando disponível)
        const anchorKey = (it: any) => {
          if (!it) return '';
          const candidate = (it.path || it.url || '') as string;
          const filename = candidate.split('/').pop() || '';
          const base = filename
            .replace(/-\d+w(\.[a-zA-Z0-9]+)?$/, '')
            .replace(/\.[a-zA-Z0-9]+$/, '');
          if (
            current?.reference_code &&
            base.includes(current.reference_code)
          ) {
            return `${current.reference_code}::${base}`;
          }
          return base || it.url || it.path || '';
        };

        if (!mergedImages || mergedImages.length === 0) {
          mergedImages = existing.map((it: any) => normalizePayloadEntry(it));
        } else {
          // Merge preservando ordem do form e adicionando itens existentes que não foram sobrescritos
          const seen = new Set<string>();
          const out: any[] = [];

          // Primeiro, insere os itens enviados pelo form (eles têm prioridade)
          for (const it of mergedImages) {
            const key = anchorKey(it);
            if (!seen.has(key)) {
              seen.add(key);
              out.push(normalizePayloadEntry(it));
            }
          }

          // Depois, anexa itens existentes que não estão presentes no form
          for (const it of existing) {
            const key = anchorKey(it);
            if (!seen.has(key)) {
              seen.add(key);
              out.push(normalizePayloadEntry(it));
            }
          }

          mergedImages = out;
        }
      } catch (e) {
        console.warn('Failed merging images in handleSubmit', e);
        // fallback: use form images as-is
        mergedImages = (formData.images || []).map((it: any) =>
          typeof it === 'string' ? { url: it, path: null } : it
        );
      }

      const payload = {
        name: formData.name,
        reference_code: formData.reference_code,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        color: formData.color || null,
        price: finalPrice,
        sale_price: finalSalePrice,
        original_price: finalOriginalPrice,
        brand: formData.brand || null,
        category: formData.category || null,
        description: formData.description || null,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock
          ? Number(formData.stock_quantity)
          : 0,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        // Persist images as objects {url, path} (merged/protected)
        images: mergedImages,
        image_url:
          formData.images && formData.images.length > 0
            ? formData.images[0].url || formData.images[0]
            : null,
        // image_path will be defined below with detach logic
        sync_status: (formData.images || []).some(
          (img: any) => !(img && img.path)
        )
          ? 'pending'
          : 'synced',
        image_optimized: (formData.images || []).every(
          (img: any) => !!(img && img.path)
        ),
        technical_specs,
        image_is_shared: isShared && !needsDetach,
        // if user requested detach, clear image_path on product level
        image_path: needsDetach
          ? null
          : formData.images && formData.images.length > 0
            ? formData.images[0].path || (product as any).image_path
            : (product as any).image_path,
        class_core: formData.class_core || null,
      };

      const result: any = await updateProductAction(product.id, payload);

      if (!result || !result.success) {
        const msg =
          result?.error || 'Falha desconhecida ao atualizar o produto.';
        toast.error('Erro ao atualizar', { description: msg });
        setLoading(false);
        return;
      }

      // Após persistir, se era compartilhado e o usuário personalizou,
      // solicitamos ao worker que realize a cópia (copy-on-write).
      if (isShared && needsDetach) {
        try {
          await fetch('/api/inngest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'image/copy_on_write.requested',
              data: {
                productId: product.id,
                sourcePath: (product as any).original_image_path,
                targetUserId: product.user_id,
              },
            }),
          });
        } catch (e) {
          console.error('Failed to enqueue copy-on-write', e);
        }
      }

      setHasChanges(false);
      toast.success('Produto atualizado!');
      router.push('/dashboard/products');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      <LoadingOverlay
        show={uploadingImage}
        progress={uploadProgress}
        message="Enviando imagens..."
      />
      {/* HEADER FIXO */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Editar Produto
              </h1>
              {hasChanges && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                  Não Salvo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              REF: {formData.reference_code || 'S/ Ref'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />{' '}
            <span className="hidden sm:inline">Excluir</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploadingImage || !hasChanges}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-md transition-transform active:scale-95 ${
              hasChanges ? '' : 'bg-gray-400 cursor-not-allowed opacity-70'
            }`}
            style={
              hasChanges
                ? {
                    backgroundColor: 'var(--primary, #2563eb)',
                    boxShadow:
                      '0 0 0 4px rgba(var(--primary-rgb, 37, 99, 235), 0.12)',
                    border:
                      '1px solid rgba(var(--primary-rgb, 37, 99, 235), 0.18)',
                  }
                : undefined
            }
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}{' '}
            Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ESQUERDA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
              Dados Básicos
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referência
                </label>
                <input
                  value={formData.reference_code}
                  onChange={(e) =>
                    updateField('reference_code', e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código de Barras
                </label>
                <div className="relative">
                  <input
                    value={formData.barcode}
                    onChange={(e) => updateField('barcode', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                  />
                  <Barcode
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                </div>

                {/* --- VISUALIZADOR DE CÓDIGO DE BARRAS (EAN-13) --- */}
                {formData.barcode && formData.barcode.length > 0 && (
                  <div className="mt-3 flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <span className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                      EAN-13
                    </span>
                    {}
                    <img
                      src={`https://bwipjs-api.metafloor.com/?bcid=ean13&text=${formData.barcode}&scale=2&height=10&includetext`}
                      alt={`Barcode ${formData.barcode}`}
                      className="max-h-16 mix-blend-multiply"
                      onError={(e) => {
                        // Fallback visual simples se falhar (ex: código não numérico)
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                </label>
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generatingDesc}
                  className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-1 rounded-md transition-colors"
                >
                  {generatingDesc ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}{' '}
                  IA
                </button>
              </div>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm leading-relaxed"
              />
            </div>
            {/* FICHA TÉCNICA (Texto / Tabela) */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ficha Técnica
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('technical_specs_mode', 'text')}
                    className={`px-2 py-1 rounded-md text-sm ${
                      formData.technical_specs_mode === 'text'
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={
                      formData.technical_specs_mode === 'text'
                        ? { backgroundColor: 'var(--primary)' }
                        : undefined
                    }
                  >
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('technical_specs_mode', 'table')}
                    className={`px-2 py-1 rounded-md text-sm ${
                      formData.technical_specs_mode === 'table'
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    style={
                      formData.technical_specs_mode === 'table'
                        ? { backgroundColor: 'var(--primary)' }
                        : undefined
                    }
                  >
                    Tabela
                  </button>
                </div>
              </div>

              {formData.technical_specs_mode === 'text' ? (
                <textarea
                  rows={6}
                  value={formData.technical_specs_text}
                  onChange={(e) =>
                    updateField('technical_specs_text', e.target.value)
                  }
                  placeholder="Digite a ficha técnica em texto livre..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm leading-relaxed"
                />
              ) : (
                <div className="space-y-2">
                  {(formData.technical_specs_table || []).map(
                    (row: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={row.key}
                          onChange={(e) =>
                            updateTechRow(idx, 'key', e.target.value)
                          }
                          placeholder="Atributo"
                          className="w-32 sm:w-40 min-w-0 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 outline-none text-sm"
                        />
                        <input
                          value={row.value}
                          onChange={(e) =>
                            updateTechRow(idx, 'value', e.target.value)
                          }
                          placeholder="Valor"
                          className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeTechRow(idx)}
                          className="p-2 rounded-md bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors flex-shrink-0"
                          title="Remover linha"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={addTechRow}
                      className="px-3 py-2 rounded-md bg-primary text-white text-sm"
                    >
                      Adicionar linha
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
              Preços
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  💰 Preço de Custo (R$)
                </label>
                <input
                  value={formData.price}
                  onChange={(e) => handlePriceChange('price', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-blue-50 dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-blue-700 dark:text-blue-400 text-lg font-medium"
                  placeholder="0,00"
                />
                <span className="text-xs text-gray-400 mt-1">
                  Quanto você paga
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  💵 Preço de Venda (R$)
                </label>
                <input
                  value={formData.sale_price}
                  onChange={(e) =>
                    handlePriceChange('sale_price', e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-lg font-bold"
                  placeholder="0,00"
                />
                <span className="text-xs text-gray-400 mt-1">
                  Sugerido ao cliente
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🏷️ Preço Promocional
                </label>
                <input
                  value={formData.original_price}
                  onChange={(e) =>
                    handlePriceChange('original_price', e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-gray-500 text-gray-600 dark:text-gray-400 font-medium"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* Se a galeria estiver vazia, mostrar a capa (`image_url` / `image_path`) como fallback */}
          {(() => {
            const hasImgs =
              Array.isArray(formData.images) && formData.images.length > 0;
            const fallbackCover = (product as any)?.image_url
              ? [
                  {
                    url: (product as any).image_url,
                    path: (product as any).image_path || null,
                  },
                ]
              : [];
            const imagesForUploader = hasImgs ? formData.images : fallbackCover;

            return (
              <ImageUploader
                images={imagesForUploader || []}
                onUpload={handleImageUpload}
                onRemove={removeImage}
                onSetCover={setAsCover}
                isShared={!!(product as any).image_is_shared}
              />
            );
          })()}
        </div>

        {/* DIREITA */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Organização
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marca
              </label>
              <select
                value={formData.brand || ''}
                onChange={(e) => updateField('brand', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                {brandsList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Classe (opcional)
              </label>
              <input
                value={formData.class_core || ''}
                onChange={(e) => updateField('class_core', e.target.value)}
                placeholder="Ex: Classe A"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Palette size={14} /> Cor
              </label>
              <input
                value={formData.color}
                onChange={(e) => updateField('color', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package size={18} /> Estoque
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Controlar Estoque
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.track_stock}
                  onChange={(e) => updateField('track_stock', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {formData.track_stock && (
              <div className="animate-in slide-in-from-top-2 fade-in">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    updateField('stock_quantity', Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono font-bold text-lg"
                />
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Visibilidade
            </h3>
            {[
              {
                key: 'is_launch',
                label: 'Lançamento',
                color: 'text-purple-600',
              },
              {
                key: 'is_best_seller',
                label: 'Best Seller',
                color: 'text-yellow-600',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    formData[item.key as keyof typeof formData] as boolean
                  }
                  onChange={(e) =>
                    updateField(
                      item.key as keyof typeof formData,
                      e.target.checked
                    )
                  }
                  className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${item.color}`}
                />
                <div
                  className={`flex items-center gap-2 text-sm font-medium ${item.color} dark:text-gray-300`}
                >
                  {item.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Excluir Produto?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Esta ação é permanente e não pode ser desfeita.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-3 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                className="py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
