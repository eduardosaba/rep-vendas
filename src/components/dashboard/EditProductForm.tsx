'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  updateProductAction,
  syncProductGallery,
} from '@/app/actions/product-actions';
import { toast } from 'sonner';
import { Product } from '@/lib/types';
import {
  ArrowLeft,
  ArrowRight,
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
import {
  normalizeImageEntry,
  normalizeAndExplodeImageEntries,
  getBaseKeyFromUrl,
  dedupePreferOptimized,
  ensureOptimizedFirst,
} from '@/lib/imageHelpers';
import { formatImageUrl, buildGalleryItem } from '@/lib/imageUtils';

// Remove arquivos de storage associados a uma imagem (inclui variantes)
const deleteImageFromStorage = async (supabaseClient: any, imagePath: string | null) => {
  if (!imagePath) return { success: true };
  try {
    // Normalize base (remove -480w/-1200w suffixes)
    const base = String(imagePath).replace(/-(480w|1200w)\.webp$/, '');
    const candidates = [
      imagePath,
      `${base}-480w.webp`,
      `${base}-1200w.webp`,
    ].map((p) => (p ? String(p).replace(/^\//, '') : p));

    const unique = Array.from(new Set(candidates)).filter(Boolean) as string[];
    if (unique.length === 0) return { success: true };

    const { error } = await supabaseClient.storage.from('product-images').remove(unique);
    if (error) {
      console.error('deleteImageFromStorage error', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (e) {
    console.error('deleteImageFromStorage exception', e);
    return { success: false, error: e };
  }
};

// Utility: generate variant via canvas (returns Blob)
async function generateVariant(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

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
    const placeholder = '/images/product-placeholder.svg';

    // Normalize and prioritize storage path
    const [src, setSrc] = React.useState<string>(() => {
      // 1. Try storage path first (most reliable)
      if (storagePath && typeof storagePath === 'string') {
        return formatImageUrl(storagePath);
      }

      // 2. Try external URL second
      if (externalUrl && typeof externalUrl === 'string') {
        // If external URL is actually a storage URL, use proxy
        if (
          externalUrl.includes('supabase.co/storage') ||
          externalUrl.includes('/storage/v1/object')
        ) {
          return formatImageUrl(externalUrl);
        }
        return externalUrl;
      }

      return placeholder;
    });

    const triedStorage = React.useRef(false);
    const triedExternal = React.useRef(false);
    const triedPlaceholder = React.useRef(false);

    return (
      <img
        src={src}
        className="w-full h-full object-contain p-1 cursor-zoom-in"
        alt={alt || 'Product image'}
        onClick={() => src && src !== placeholder && setZoomImage(src)}
        onError={(e) => {
          const t = e.currentTarget as HTMLImageElement;

          // Strategy 1: If showing external and have storage path, try storage
          if (!triedStorage.current && storagePath && src === externalUrl) {
            triedStorage.current = true;
            setSrc(formatImageUrl(storagePath) as string);
            return;
          }

          // Strategy 2: If showing storage and have external, try external
          if (
            !triedExternal.current &&
            externalUrl &&
            src !== externalUrl &&
            src !== placeholder
          ) {
            triedExternal.current = true;
            setSrc(externalUrl);
            return;
          }

          // Strategy 3: Show placeholder to avoid infinite loop
          if (!triedPlaceholder.current) {
            triedPlaceholder.current = true;
            t.onerror = null;
            setSrc(placeholder);
            return;
          }
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
          const external = typeof url === 'string' && url.startsWith('http') ? url : null;

          return (
            <div
              key={path || url || index}
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

// Helpers moved to `src/lib/imageHelpers.ts`

// buildGalleryItem moved to src/lib/imageUtils.ts

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
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
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

  // Prepara e limpa a galeria do produto antes de persistir
  const prepareProductGallery = (items: any[]) => {
    const raw = Array.isArray(items) ? items : [];
    const cleaned = raw
      .map((it: any) => (typeof it === 'string' ? { url: it, path: null } : it || { url: '', path: null }))
      .map((it: any) => buildGalleryItem(it))
      .filter(Boolean) as any[];

    const imagesField = cleaned.map((g: any) => ({ url: g.url || '', path: g.path || null }));
    return { gallery: cleaned, imagesField };
  };

  // DEBUG: diagnóstico de imagens recebidas do banco
  useEffect(() => {
    console.group('[EditProductForm] Diagnóstico de Imagens do Produto');
    console.log('product.gallery_images:', (product as any).gallery_images);
    console.log('product.images:', product.images);
    console.log('product.image_url:', product.image_url);
    console.log('product.image_path:', (product as any).image_path);
    console.groupEnd();
  }, []);

  // Normaliza a galeria recebida do banco ao carregar o produto
  useEffect(() => {
    try {
      if (!product) return;
      const rawGallery = Array.isArray((product as any).gallery_images)
        ? (product as any).gallery_images
        : [];

      const normalizedImages = rawGallery.map(buildGalleryItem).filter(Boolean as any);

      if (normalizedImages && normalizedImages.length > 0) {
        setFormData((prev) => ({ ...prev, images: normalizedImages } as any));
      }
    } catch (e) {
      console.warn('Normalization of gallery failed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Note: preserve `gender` exactly as stored in `products` table for edit form

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
    gender: (product as any).gender || null,
    description: product.description || '',
    technical_specs_mode: techSpecs.mode,
    technical_specs_text: techSpecs.text,
    technical_specs_table: techSpecs.table,
    track_stock: product.track_stock ?? false,
    stock_quantity: product.stock_quantity ?? 0,
    is_launch: product.is_launch ?? false,
    is_best_seller: product.is_best_seller || product.bestseller || false,
    // status: active/inactive
    is_active: (product as any).is_active ?? (product as any).active ?? true,
    images: ensureOptimizedFirst(
      dedupePreferOptimized(
        normalizeAndExplodeImageEntries(
          // Prefer migrated fields: gallery_images, then legacy images, then single image_url
          (product as any).gallery_images ||
            product.images ||
            (product.image_url ? [product.image_url] : [])
        ).filter(Boolean)
      )
    ),
  });

  // debug logging removed

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

      // Append temp previews as objects with placeholder variants so UI shows them at once
      updateField('images', [
        ...(formData.images || []),
        ...tempEntries.map((t) => ({
          url: t.tempUrl,
          path: null,
          variants: [
            { size: 480, url: t.tempUrl, path: null },
            { size: 1200, url: t.tempUrl, path: null },
          ],
        })),
      ]);

        // 2) For each file, generate 480/1200 variants client-side and upload both
        for (const entry of tempEntries) {
          const file = entry.file;
          const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

          let simulated = 0;
          progressInterval = setInterval(() => {
            simulated = Math.min(95, simulated + Math.random() * 12 + 5);
            setUploadProgress(Math.round(simulated));
          }, 300);

          try {
            const blob480 = await generateVariant(file, 480).catch(() => null);
            const blob1200 = await generateVariant(file, 1200).catch(() => null);

            const final1200 = blob1200
              ? new File([blob1200], `${baseName}-1200w.webp`, { type: 'image/webp' })
              : file;
            const final480 = blob480
              ? new File([blob480], `${baseName}-480w.webp`, { type: 'image/webp' })
              : final1200;

            const fullPath480 = `${user.id}/products/${baseName}-480w.webp`;
            const fullPath1200 = `${user.id}/products/${baseName}-1200w.webp`;

            // upload 480 then 1200
            const { error: e480 } = await supabase.storage.from('product-images').upload(fullPath480, final480, { cacheControl: '3600', upsert: true });
            if (e480) throw e480;
            const { error: e1200 } = await supabase.storage.from('product-images').upload(fullPath1200, final1200, { cacheControl: '3600', upsert: true });
            if (e1200) throw e1200;

            const { data: d1200 } = supabase.storage.from('product-images').getPublicUrl(fullPath1200);

            // Replace the tempUrl object in formData.images with the full structured gallery item (with variants)
            const galleryItem = buildGalleryItem({ url: d1200.publicUrl, path: fullPath1200 });
            setFormData((prev) => {
              const imgs = [...(prev.images || [])];
              const idx = imgs.findIndex((x: any) => x && x.url === entry.tempUrl);
              if (galleryItem) {
                if (idx !== -1) imgs[idx] = galleryItem as any;
                else imgs.push(galleryItem as any);
              }
              return { ...prev, images: imgs } as any;
            });

            setNeedsDetach(true);
          } catch (err: any) {
            console.error('Upload failed', err);
            toast.error('Erro ao enviar imagem: ' + (err?.message || String(err)));
          } finally {
            if (progressInterval) clearInterval(progressInterval);
            setUploadProgress(null);
            setUploadingImage(false);
          }
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

  const removeImage = async (index: number) => {
    // Remoção segura: não apaga arquivos físicos do Master/Clone.
    try {
      // 1) Atualiza estado local removendo o item
      const newImages = (formData.images || []).filter((_, i) => i !== index);
      updateField('images', newImages);

      // 2) Normaliza para o formato a ser persistido
      const normalized = (newImages || []).map((it: any) =>
        typeof it === 'string' ? { url: it, path: null } : it
      );

      const gallery = (normalized || [])
        .map((it: any) => buildGalleryItem(typeof it === 'string' ? { url: it, path: null } : it))
        .filter(Boolean) as any[];

      const updateData: any = {
        images: normalized,
        gallery_images: gallery,
        image_variants: gallery.length > 0 ? gallery[0].variants : null,
        image_url: gallery.length > 0 ? gallery[0].url : null,
        image_path: gallery.length > 0 ? gallery[0].path : null,
      };

      // 3) Persiste alteração (somente campos no produto)
      const res: any = await updateProductAction(product.id, updateData);
      if (!res || !res.success) {
        console.warn('removeImage: updateProductAction failed', res);
        toast.error('Falha ao persistir remoção da imagem');
        return;
      }

      toast.success('Imagem removida da galeria (sem deletar arquivos)');
      setNeedsDetach(true);
      try {
        router.refresh();
      } catch (err) {
        // ignore
      }
    } catch (e) {
      console.error('removeImage error', e);
      toast.error('Erro ao remover imagem');
    }
  };

  const setAsCover = async (index: number) => {
    const selectedImage = (formData.images || [])[index];
    if (!selectedImage) return;

    // Reordena mantendo objetos completos
    const updated = [selectedImage, ...(formData.images || []).filter((_, i) => i !== index)];

    // Normaliza cada item com variantes garantidas
    const gallery = (updated || []).map((it: any) => buildGalleryItem(it)).filter(Boolean) as any[];

    const imageVariants = gallery.length > 0 ? gallery[0].variants || null : null;
    const imageUrl = gallery.length > 0 ? gallery[0].url : null;
    const imagePath = gallery.length > 0 ? gallery[0].path : null;

    try {
      const res: any = await updateProductAction(product.id, {
        gallery_images: gallery,
        image_variants: imageVariants,
        image_url: imageUrl,
        image_path: imagePath,
      });

      if (!res || !res.success) {
        console.warn('setAsCover: updateProductAction failed', res);
        toast.error('Falha ao definir capa');
        return;
      }

      setFormData((prev) => ({ ...prev, images: updated } as any));
      setHasChanges(false);
      toast.success('Nova capa definida!');
      try {
        router.refresh();
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('Erro ao definir capa:', e);
      toast.error('Erro ao atualizar a capa.');
    }
  };

  // Mini galeria horizontal para navegar rapidamente entre produtos do mesmo usuário
  const MiniProductGallery = ({ currentId }: { currentId: string }) => {
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 8;

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const start = page * pageSize;
          const end = start + pageSize; // fetch one extra to detect "hasMore"

          const { data } = await supabase
            .from('products')
            .select('id, reference_code, name, image_url, image_path, gallery_images')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('updated_at', { ascending: false })
            .range(start, end);

          if (!mounted) return;
          const arr = data || [];
          setHasMore(arr.length > pageSize);
          setItems(arr.slice(0, pageSize));
        } catch (e) {
          console.warn('MiniProductGallery fetch error', e);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [supabase, page]);

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Outros produtos</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Editar rapidamente</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`p-1 rounded-md border bg-white dark:bg-slate-800 ${page === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              aria-label="Anterior"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className={`p-1 rounded-md border bg-white dark:bg-slate-800 ${!hasMore ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
              aria-label="Próximo"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((it: any) => {
            const id = it.id as string;
            const ref = it.reference_code || it.name || 'S/Ref';

            // Prefer path (via proxy) when available, fallback to gallery variants or external URL
            let thumb: string | null = null;
            try {
              if (it.image_path) {
                thumb = formatImageUrl(it.image_path as string) as string;
              }

              if (!thumb && Array.isArray(it.gallery_images) && it.gallery_images.length > 0) {
                const first = it.gallery_images[0];
                const v = Array.isArray(first?.variants)
                  ? first.variants.find((x: any) => x.size === 480)
                  : null;
                thumb = thumb || v?.url || first?.url || null;
              }
            } catch (e) {
              // ignore
            }
            if (!thumb && it.image_url) thumb = it.image_url;

            return (
              <Link
                href={`/dashboard/products/${encodeURIComponent(id)}`}
                key={id}
                className="w-20 flex-none"
              >
                <div
                  className={`w-20 h-20 rounded-md overflow-hidden border ${
                    id === product.id ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={thumb || '/images/product-placeholder.svg'}
                    className="w-full h-full object-cover"
                    alt={String(ref)}
                  />
                </div>
                <div className="text-[11px] text-center mt-1 text-gray-600 dark:text-gray-300 truncate">
                  {ref}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
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

    // 1. DECLARAÇÃO DE ESCOPO (Correção do Bug Crítico)
    let mergedImages: any[] = [];
    let syncUrls: string[] = [];
    let current: any = null;

    try {
      // 2. CONVERSÕES DE PREÇO E SPECS
      const finalPrice = parseFloat(formData.price.replace(/\./g, '').replace(',', '.')) || 0;
      const finalSalePrice = formData.sale_price ? parseFloat(formData.sale_price.replace(/\./g, '').replace(',', '.')) : null;
      const finalOriginalPrice = formData.original_price ? parseFloat(formData.original_price.replace(/\./g, '').replace(',', '.')) : null;

      let technical_specs: any = null;
      if (formData.technical_specs_mode === 'table') {
        const obj: Record<string, string> = {};
        (formData.technical_specs_table || []).forEach((r: any) => {
          if (r.key && r.key.trim() !== '') obj[r.key] = r.value;
        });
        technical_specs = Object.keys(obj).length > 0 ? obj : null;
      } else {
        technical_specs = formData.technical_specs_text || null;
      }

      // 3. RECUPERAÇÃO DE DADOS ATUAIS (Guardrail)
      const { data: resData } = await supabase
        .from('products')
        .select('images, gallery_images, image_url, image_path, image_variants, image_is_shared, sync_status, image_optimized')
        .eq('id', product.id)
        .maybeSingle();
      current = resData;

      // 4. LÓGICA DE IMAGENS (Normalização de Sufixos)
      const isShared = (product as any).image_is_shared;
      const hasFormImages = formData.images && formData.images.length > 0;

      if (hasFormImages) {
        // Limpeza de sufixos antes de preparar a galeria
        const cleanedForm = (formData.images || []).map((img: any) => {
          const item = typeof img === 'string' ? { url: img, path: null } : { ...img };
          // regex robusta para remover sufixos repetidos mantendo a extensão
          if (item.url) item.url = String(item.url).replace(/(?:-(?:480w|1200w)\.webp)+$/g, '');
          if (item.path) item.path = String(item.path).replace(/(?:-(?:480w|1200w)\.webp)+$/g, '');
          return item;
        });

        const prep = prepareProductGallery(cleanedForm);
        const gallery = prep.gallery || [];
        mergedImages = gallery;
        syncUrls = gallery.map((f: any) => f.url).filter(Boolean);
      } else {
        // Preserva existentes se o form vier vazio
        mergedImages = current?.gallery_images || current?.images || [];
        syncUrls = (mergedImages || []).map((img: any) => (typeof img === 'string' ? img : img.url)).filter(Boolean);
      }

      // 5. MONTAGEM DO PAYLOAD
      const payload: any = {
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
        gender: (formData as any).gender || null,
        description: formData.description || null,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock ? Number(formData.stock_quantity) : 0,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        technical_specs,
        class_core: formData.class_core || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      // 6. ATUALIZAÇÃO DOS CAMPOS DE IMAGEM (Proteção)
      if (mergedImages && mergedImages.length > 0) {
        const finalGallery = mergedImages.map((img: any) => buildGalleryItem(img)).filter(Boolean);

        payload.gallery_images = finalGallery;
        payload.images = finalGallery.map((g: any) => ({ url: g.url || '', path: g.path || null }));
        payload.image_url = finalGallery[0]?.url || null;
        payload.image_path = needsDetach ? null : finalGallery[0]?.path || null;
        payload.image_variants = finalGallery[0]?.variants || null;
        payload.sync_status = finalGallery.some((img: any) => !img.path) ? 'pending' : 'synced';
        payload.image_optimized = finalGallery.every((img: any) => !!img.path);
        payload.image_is_shared = isShared && !needsDetach;
      } else if (needsDetach) {
        payload.image_path = null;
        payload.image_is_shared = false;
      }

      // 7. PERSISTÊNCIA
      const result: any = await updateProductAction(product.id, payload);
      if (!result || !result.success) throw new Error(result?.error || 'Erro no update');

      // 8. SINCRONIZAÇÃO AUXILIAR (Protegida)
      if (syncUrls && syncUrls.length > 0) {
        await syncProductGallery(product.id, syncUrls);
      }

      // 9. COPY-ON-WRITE
      if (isShared && needsDetach) {
        fetch('/api/image/copy-on-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourcePath: (product as any).image_path, productId: product.id }),
        }).catch(console.error);
      }

      setHasChanges(false);
      toast.success('Produto atualizado com sucesso!');
      router.push('/dashboard/products');
      router.refresh();

    } catch (error: any) {
      console.error('Erro no Submit:', error);
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Duplicate handler: asks confirmation, calls API and redirects to new product editor
  const handleDuplicate = async () => {
    // close modal if open and proceed
    try {
      setIsDuplicateModalOpen(false);
    } catch (e) {}
    setLoading(true);
    try {
      const res = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Erro ao duplicar: ' + (json?.error || 'erro desconhecido'));
        return;
      }
      toast.success('Produto duplicado! Redirecionando...');
      router.push(`/dashboard/products/${encodeURIComponent(json.newId)}`);
    } catch (e: any) {
      console.error('duplicate error', e);
      toast.error('Erro inesperado ao duplicar');
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
      <MiniProductGallery currentId={product.id} />
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
            type="button"
            onClick={() => setIsDuplicateModalOpen(true)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Duplicar produto"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            <span className="hidden sm:inline">Duplicar</span>
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
            const imagesForUploader = ensureOptimizedFirst(
              hasImgs ? formData.images : fallbackCover
            );

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gênero
              </label>
              <select
                value={(formData as any).gender || ''}
                onChange={(e) =>
                  updateField('gender' as any, e.target.value || null)
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                <option value="">Não especificado</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="teen">Teen</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                key: 'is_active',
                label: 'Ativo',
                color: 'text-green-600',
              },
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

      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Copy size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Duplicar Produto?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Isso criará uma cópia deste produto. Imagens serão marcadas como compartilhadas na cópia.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDuplicateModalOpen(false)}
                className="py-3 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicate}
                disabled={loading}
                className="py-3 rounded-lg bg-blue-600 text-white font-bold hover:!bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed border border-blue-600 hover:border-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm dark:bg-blue-700 dark:hover:!bg-blue-900"
                type="button"
              >
                {loading ? <Loader2 size={16} className="animate-spin inline-block mr-2" /> : null}
                Sim, Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
