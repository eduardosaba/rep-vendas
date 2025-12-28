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
} from 'lucide-react';

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
}: {
  images: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
}) => {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
        <ImageIcon size={18} className="text-blue-600" /> Galeria de Imagens
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {images.map((url, index) => (
          <div
            key={index}
            className={`relative aspect-square rounded-lg overflow-hidden border group transition-all ${index === 0 ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-slate-700'}`}
          >
            {}
            <img
              src={url}
              className="w-full h-full object-cover cursor-zoom-in"
              alt={`Product ${index}`}
              onClick={() => setZoomImage(url)}
            />

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 bg-white/90 text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            >
              <X size={14} />
            </button>

            {index === 0 ? (
              <div className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-white text-[10px] text-center py-1 font-bold">
                CAPA
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSetCover(index)}
                className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 hover:bg-blue-600/80 transition-colors"
              >
                Definir Capa
              </button>
            )}
          </div>
        ))}

        <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-blue-300 transition-all group relative">
          <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-colors">
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
    category: '',
    description: '',
    track_stock: true,
    stock_quantity: 0,
    is_launch: false,
    is_best_seller: false,
    is_active: true,
    images: [] as string[],
  });

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
    setFormData((prev) => {
      const newImages = [...prev.images];
      const selected = newImages.splice(index, 1)[0];
      newImages.unshift(selected);
      return { ...prev, images: newImages };
    });
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
        brand: formData.brand || null,
        category: formData.category || null,
        description: formData.description || null,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock
          ? Number(formData.stock_quantity)
          : 0,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        is_active: formData.is_active,
        images: formData.images,
        image_url: formData.images[0] || null,
        slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
      };

      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;

      toast.success('Produto cadastrado!');
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
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-transform active:scale-95"
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
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
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
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
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm leading-relaxed"
                placeholder="Detalhes técnicos e comerciais do produto..."
              />
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
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-lg font-medium text-blue-600"
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
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-lg font-bold text-gray-900"
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
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                {brandsList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              {brandsList.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  Nenhuma marca encontrada.
                </p>
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white cursor-pointer"
              >
                <option value="">Selecione...</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categoriesList.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  Nenhuma categoria encontrada.
                </p>
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
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                  className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${item.color}`}
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
