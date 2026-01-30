'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  Image as ImageIcon,
  Package,
  Barcode,
  Palette,
  Percent,
  Sparkles,
  X,
  UploadCloud,
  Zap,
  Star,
  Trash2,
} from 'lucide-react';
import {
  prepareProductImage,
  prepareProductGallery,
} from '@/lib/utils/image-logic';

// --- TIPAGEM ---
interface Brand {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
}
const ImageUploader = ({
  images,
  onUpload,
  onRemove,
  onSetCover,
  isShared,
}: {
  images: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
  isShared?: boolean;
}) => {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
        <ImageIcon
          size={18}
          className="text-[var(--primary)]"
          style={{ color: 'var(--primary)' }}
        />{' '}
        Galeria de Imagens
      </h3>

      {isShared && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full uppercase mb-3 inline-flex">
          Imagens Compartilhadas (Master)
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <div
            key={index}
            className={`relative aspect-square rounded-lg overflow-hidden border group transition-all ${index === 0 ? '' : 'border-gray-200 dark:border-slate-700'}`}
            style={
              index === 0
                ? ({
                    borderColor: 'var(--primary)',
                    boxShadow: '0 0 0 3px rgba(var(--primary-rgb), 0.12)',
                  } as React.CSSProperties)
                : undefined
            }
          >
            {}
            {url ? (
              <img
                src={url}
                className="w-full h-full object-cover cursor-zoom-in"
                alt={`Product ${index}`}
                onClick={() => setZoomImage(url)}
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
                Imagem indisponível
              </div>
            )}

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            >
              <X size={14} />
            </button>

            {index === 0 ? (
              <div
                className="absolute bottom-0 inset-x-0 text-white text-[10px] text-center py-1 font-bold"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                CAPA
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSetCover(index)}
                className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 transition-colors"
                // hover color intentionally kept subtle; primary applied to cover badge only
              >
                Definir Capa
              </button>
            )}
          </div>
        ))}

        <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-[var(--primary)] transition-all group relative">
          <div
            className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:text-[var(--primary)] transition-colors"
            style={{ color: 'var(--primary)' }}
          >
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
      <p className="text-xs text-gray-400 mt-3">
        A primeira imagem será usada como capa.
      </p>

      {/* Modal de Zoom */}
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

// --- PÁGINA PRINCIPAL ---
export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Listas Auxiliares
  const [brandsList, setBrandsList] = useState<Brand[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // Formulário
  const [formData, setFormData] = useState({
    name: '',
    reference_code: '',
    sku: '',
    barcode: '',
    color: '',
    cost: '',
    price: '',
    sale_price: '',
    discount_percent: 0,
    brand: '',
    new_brand: '',
    category: '',
    new_category: '',
    description: '',
    track_stock: false,
    stock_quantity: 0,
    is_launch: false,
    is_best_seller: false,
    is_active: true,
    images: [] as string[],
    technical_specs_mode: 'text',
    technical_specs_text: '',
    technical_specs_table: [{ key: '', value: '' }],
  });

  // URLs marcadas para enfileirar após criação do produto (quando usuário faz matcher antes de criar)
  const [pendingEnqueueUrls, setPendingEnqueueUrls] = useState<string[]>([]);

  // --- CARREGAMENTO DE DADOS (CORRIGIDO) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar Marcas
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');

        if (brandsError) console.error('Erro marcas:', brandsError);
        else setBrandsList(brandsData || []);

        // Buscar Categorias
        const { data: catsData, error: catsError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name');

        if (catsError) console.error('Erro categorias:', catsError);
        else setCategoriesList(catsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);
      }
    };

    fetchData();
  }, []); // Dependência vazia para rodar apenas uma vez na montagem

  // --- Handlers ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploadingImage(true);
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Login necessário');

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`public/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(`public/${fileName}`);

        newUrls.push(data.publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newUrls],
      }));
      toast.success('Imagens enviadas!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const setAsCover = (index: number) => {
    const selected = formData.images[index];
    setFormData((prev) => {
      const newImages = [...prev.images];
      const sel = newImages.splice(index, 1)[0];
      newImages.unshift(sel);
      return { ...prev, images: newImages };
    });
    // If product not created yet, remember the URL to enqueue after save
    const productId = (formData as any).id;
    if (!productId) {
      setPendingEnqueueUrls((prev) =>
        prev.includes(selected) ? prev : [...prev, selected]
      );
      toast.info(
        'Imagem marcada para vinculação; será enfileirada após salvar o produto.'
      );
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/admin/mark-image-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, url: selected }),
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

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const float = parseFloat(numbers) / 100;
    return float.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePriceChange = (
    field: 'price' | 'sale_price' | 'cost',
    value: string
  ) => {
    if (!value) {
      setFormData((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: formatCurrency(value) }));
  };

  const generateDescription = () => {
    if (!formData.name)
      return toast.warning('Preencha o nome do produto primeiro.');
    setGeneratingDesc(true);
    setTimeout(() => {
      const desc = `O **${formData.name}** oferece qualidade e estilo. \n\nIdeal para quem busca durabilidade e design moderno.\n\nPrincipais características:\n- Alta resistência\n- Acabamento premium`;
      setFormData((prev) => ({ ...prev, description: desc }));
      setGeneratingDesc(false);
      toast.success('Descrição gerada!');
    }, 1000);
  };

  // Ficha técnica helpers (novo produto)
  const addTechRow = () => {
    setFormData((prev) => ({
      ...prev,
      technical_specs_table: [
        ...(prev.technical_specs_table || []),
        { key: '', value: '' },
      ],
    }));
  };

  const removeTechRow = (idx: number) => {
    setFormData((prev) => {
      const copy = [...(prev.technical_specs_table || [])];
      copy.splice(idx, 1);
      return {
        ...prev,
        technical_specs_table: copy.length ? copy : [{ key: '', value: '' }],
      };
    });
  };

  const updateTechRow = (
    idx: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setFormData((prev) => {
      const copy = [...(prev.technical_specs_table || [])];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, technical_specs_table: copy };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada');

      const finalCost = formData.cost
        ? parseFloat(formData.cost.replace(/\./g, '').replace(',', '.'))
        : null;
      const finalPrice =
        parseFloat(formData.price.replace(/\./g, '').replace(',', '.')) || 0;
      const finalSalePrice = formData.sale_price
        ? parseFloat(formData.sale_price.replace(/\./g, '').replace(',', '.'))
        : null;

      const slugify = (s: string) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

      const slugBase = slugify(formData.name || 'produto');
      // Prepara technical_specs conforme o modo selecionado
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

      // Antes de inserir o produto, criar brand/category se necessário
      let finalBrand = formData.brand || null;
      let finalCategory = formData.category || null;

      try {
        // Criar nova marca se o usuário solicitou
        if (formData.brand === '__add__' && formData.new_brand?.trim()) {
          const { data: brandCreated, error: brandErr } = await supabase
            .from('brands')
            .insert({ user_id: user.id, name: formData.new_brand.trim() })
            .select('id, name')
            .single();
          if (!brandErr && brandCreated) {
            finalBrand = brandCreated.name;
            setBrandsList((prev) => [...prev, brandCreated]);
          }
        }

        // Criar nova categoria se o usuário solicitou
        if (
          formData.category === '__add_cat__' &&
          formData.new_category?.trim()
        ) {
          const { data: catCreated, error: catErr } = await supabase
            .from('categories')
            .insert({ user_id: user.id, name: formData.new_category.trim() })
            .select('id, name')
            .single();
          if (!catErr && catCreated) {
            finalCategory = catCreated.name;
            setCategoriesList((prev) => [...prev, catCreated]);
          }
        }
      } catch (err) {
        console.warn('Erro ao criar brand/category automático', err);
      }

      const imageMeta = prepareProductImage(formData.images[0] || null);

      const payload = {
        user_id: user.id,
        name: formData.name,
        reference_code:
          formData.reference_code || `REF-${Date.now().toString().slice(-6)}`,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        color: formData.color || null,
        cost: finalCost,
        price: finalPrice,
        sale_price: finalSalePrice,
        discount_percent: Number(formData.discount_percent) || 0,
        brand: finalBrand || null,
        category: finalCategory || null,
        description: formData.description || null,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock
          ? Number(formData.stock_quantity)
          : 0,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        is_active: formData.is_active,
        images: formData.images,
        image_url: imageMeta.image_url || null,
        sync_status: imageMeta.sync_status,
        sync_error: imageMeta.sync_error,
        slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
        technical_specs,
      };

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Salvar Galeria na nova tabela
      if (newProduct && formData.images.length > 0) {
        const galleryItems = prepareProductGallery(
          newProduct.id,
          formData.images
        );
        const { error: galleryError } = await supabase
          .from('product_images')
          .insert(galleryItems);

        if (galleryError) {
          console.error('Erro ao salvar galeria:', galleryError);
          toast.error('Produto salvo, mas houve erro nas imagens.');
        }
      }

      // Enfileira (mark-image-pending) as URLs que o usuário marcou enquanto o produto era novo
      if (newProduct && pendingEnqueueUrls && pendingEnqueueUrls.length > 0) {
        for (const url of pendingEnqueueUrls) {
          try {
            await fetch('/api/admin/mark-image-pending', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: newProduct.id, url }),
            });
          } catch (err) {
            console.error(
              'Failed to enqueue pending url after create',
              url,
              err
            );
          }
        }
        setPendingEnqueueUrls([]);
      }

      toast.success('Produto cadastrado!');
      // trigger revalidation for public catalog (server will verify ownership)
      try {
        const { data: pc } = await supabase
          .from('public_catalogs')
          .select('slug')
          .eq('user_id', user.id)
          .maybeSingle();
        if (pc?.slug) {
          await fetch(`/api/revalidate?slug=${encodeURIComponent(pc.slug)}`, {
            method: 'POST',
          });
        }
      } catch (e) {
        console.warn('revalidate call failed', e);
      }

      router.push('/dashboard/products');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao salvar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header Fixo */}
      <div className="flex items-center justify-between sticky top-0 z-30 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Novo Produto
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Preencha os dados abaixo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploadingImage}
            className="px-6 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-md transition-transform active:scale-95 hover:brightness-95"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Salvar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ESQUERDA: Dados Principais */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
              Dados Básicos
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome do Produto <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white"
                placeholder="Ex: Tênis Esportivo Runner..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referência
                </label>
                <input
                  value={formData.reference_code}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_code: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm"
                  placeholder="Automático se vazio"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código de Barras (EAN)
                </label>
                <div className="relative">
                  <input
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm"
                    placeholder="Ex: 789..."
                  />
                  <Barcode
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                </div>
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
                  )}
                  Gerar com IA
                </button>
              </div>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm leading-relaxed"
                placeholder="Detalhes técnicos e comerciais do produto..."
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
                    onClick={() =>
                      setFormData((f) => ({
                        ...f,
                        technical_specs_mode: 'text',
                      }))
                    }
                    className={`px-2 py-1 rounded-md text-sm ${formData.technical_specs_mode === 'text' ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                    style={
                      formData.technical_specs_mode === 'text'
                        ? { backgroundColor: 'var(--primary)' }
                        : undefined
                    }
                    aria-pressed={formData.technical_specs_mode === 'text'}
                    // adiciona leve escurecimento no hover quando ativo
                    onMouseEnter={() => {}}
                  >
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((f) => ({
                        ...f,
                        technical_specs_mode: 'table',
                      }))
                    }
                    className={`px-2 py-1 rounded-md text-sm ${formData.technical_specs_mode === 'table' ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                    style={
                      formData.technical_specs_mode === 'table'
                        ? { backgroundColor: 'var(--primary)' }
                        : undefined
                    }
                    aria-pressed={formData.technical_specs_mode === 'table'}
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
                    setFormData((f) => ({
                      ...f,
                      technical_specs_text: e.target.value,
                    }))
                  }
                  placeholder="Digite a ficha técnica em texto livre..."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm leading-relaxed"
                />
              ) : (
                <div className="space-y-2">
                  {(formData.technical_specs_table || []).map((row, idx) => (
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
                  ))}
                  <div>
                    <button
                      type="button"
                      onClick={addTechRow}
                      className="px-3 py-2 rounded-md text-white text-sm hover:brightness-95"
                      style={{ backgroundColor: 'var(--primary)' }}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preço de Custo (R$)
                </label>
                <input
                  value={formData.cost}
                  onChange={(e) => handlePriceChange('cost', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-lg font-medium"
                  style={{ color: 'var(--primary)' }}
                  placeholder="0,00"
                />
                <span className="text-xs text-gray-400 mt-1">
                  Opcional - Quanto você paga
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preço de Venda (R$)
                </label>
                <input
                  value={formData.price}
                  onChange={(e) => handlePriceChange('price', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-lg font-bold text-gray-900"
                  placeholder="0,00"
                />
                <span className="text-xs text-gray-400 mt-1">
                  Preço sugerido ao cliente
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preço Promocional (Opcional)
                </label>
                <input
                  value={formData.sale_price}
                  onChange={(e) =>
                    handlePriceChange('sale_price', e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-green-700 font-medium"
                  placeholder="0,00"
                />
                <span className="text-xs text-gray-400 mt-1">
                  Preço "de/por"
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="relative w-32">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Desconto (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_percent: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white"
                  />
                  <Percent
                    size={14}
                    className="absolute right-3 top-3 text-gray-400"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-5">
                Desconto automático no carrinho.
              </p>
            </div>
          </div>

          <ImageUploader
            images={formData.images}
            onUpload={handleImageUpload}
            onRemove={removeImage}
            onSetCover={setAsCover}
            isShared={false}
          />
        </div>

        {/* DIREITA: Organização e Estoque */}
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
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="__add__">+ Adicionar nova marca...</option>
                {brandsList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              {(brandsList.length === 0 || formData.brand === '__add__') && (
                <div className="mt-2">
                  <input
                    value={formData.new_brand}
                    onChange={(e) =>
                      setFormData({ ...formData, new_brand: e.target.value })
                    }
                    placeholder="Digite o nome da nova marca"
                    className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A marca será criada automaticamente ao salvar.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                <option value="__add_cat__">
                  + Adicionar nova categoria...
                </option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(categoriesList.length === 0 ||
                formData.category === '__add_cat__') && (
                <div className="mt-2">
                  <input
                    value={formData.new_category}
                    onChange={(e) =>
                      setFormData({ ...formData, new_category: e.target.value })
                    }
                    placeholder="Digite o nome da nova categoria"
                    className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A categoria será criada automaticamente ao salvar.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Palette size={14} /> Cor / Variante
              </label>
              <input
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white"
                placeholder="Ex: Preto Fosco"
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
                  onChange={(e) =>
                    setFormData({ ...formData, track_stock: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            {formData.track_stock && (
              <div className="animate-in slide-in-from-top-2 fade-in">
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                  Quantidade Atual
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_quantity: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-white font-mono font-bold text-lg"
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
                label: 'Produto Ativo',
                color: 'text-green-600',
                icon: null,
              },
              {
                key: 'is_launch',
                label: 'Lançamento',
                color: 'text-purple-600',
                icon: Zap,
              },
              {
                key: 'is_best_seller',
                label: 'Best Seller',
                color: 'text-yellow-600',
                icon: Star,
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={(formData as any)[item.key] as boolean}
                  onChange={(e) =>
                    setFormData({ ...formData, [item.key]: e.target.checked })
                  }
                  className={`w-5 h-5 rounded border-gray-300 focus:ring-[var(--primary)] ${item.color}`}
                />
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.icon && (
                    <item.icon
                      size={16}
                      className={item.color.replace('text-', 'text-')}
                    />
                  )}
                  {item.label}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
