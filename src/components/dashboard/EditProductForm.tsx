'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks';
import {
  ArrowLeft,
  Loader2,
  Save,
  X,
  Plus,
  Trash2,
  Star,
  Zap,
  FileText,
  Image as ImageIcon,
  Table,
  AlignLeft,
  Percent,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import ProductBarcode from '@/components/ui/Barcode';

interface SpecRow {
  key: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
  brand: string | null;
  category: string | null;
  description: string | null;
  technical_specs: string | null;
  is_launch: boolean;
  is_best_seller: boolean;
  sku?: string | null;
  barcode?: string | null;
  color?: string | null;
  is_active?: boolean;
  image_url: string | null;
  images: string[] | null;
  discount_percent?: number | null;
  track_stock?: boolean;
  stock_quantity?: number;
}

interface EditProductFormProps {
  product: Product;
  userId: string;
}

interface GalleryItem {
  id: string;
  type: 'existing' | 'new';
  url: string;
  file?: File;
}

export function EditProductForm({ product, userId }: EditProductFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const supabase = sharedSupabase;

  // Estados para Autocomplete
  const [availableBrands, setAvailableBrands] = useState<{ name: string }[]>(
    []
  );
  const [availableCategories, setAvailableCategories] = useState<
    { name: string }[]
  >([]);

  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Lógica Ficha Técnica
  let loadedSpecsMode: 'text' | 'table' = 'text';
  let loadedSpecsRows: SpecRow[] = [{ key: '', value: '' }];

  if (product.technical_specs) {
    try {
      const parsed = JSON.parse(product.technical_specs);
      if (Array.isArray(parsed)) {
        loadedSpecsMode = 'table';
        loadedSpecsRows = parsed.length > 0 ? parsed : [{ key: '', value: '' }];
      }
    } catch (e) {
      loadedSpecsMode = 'text';
    }
  }

  const [specsMode, setSpecsMode] = useState<'text' | 'table'>(loadedSpecsMode);
  const [specsRows, setSpecsRows] = useState<SpecRow[]>(loadedSpecsRows);

  const formatInitialPrice = (val: number) => {
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const [formData, setFormData] = useState({
    name: product.name || '',
    reference_code: product.reference_code || '',
    price: formatInitialPrice(product.price),
    discount_percent: product.discount_percent || 0,
    brand: product.brand || '',
    category: product.category || '',
    description: product.description || '',
    technical_specs: product.technical_specs || '',
    is_launch: product.is_launch || false,
    is_best_seller: product.is_best_seller || false,
    sku: (product as any).sku || '',
    barcode: (product as any).barcode || '',
    color: (product as any).color || '',
    // Structured specs
    bridge: (product as any).bridge || '',
    size: (product as any).size || '',
    material: (product as any).material || '',
    temple: (product as any).temple || '',
    height: (product as any).height || '',
    gender: (product as any).gender || '',
    shape: (product as any).shape || '',
    product_type: (product as any).product_type || '',
    is_active: product.is_active ?? true,
    track_stock: product.track_stock ?? true,
    stock_quantity: product.stock_quantity ?? 0,
  });

  // 1. Buscar Listas de Marcas e Categorias
  useEffect(() => {
    const fetchAuxData = async () => {
      const { data: brands } = await supabase
        .from('brands')
        .select('name')
        .eq('user_id', userId)
        .order('name');

      const { data: cats } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', userId)
        .order('name');

      setAvailableBrands(brands || []);
      setAvailableCategories(cats || []);
    };
    fetchAuxData();
  }, [userId, supabase]);

  // 2. Inicializa galeria
  useEffect(() => {
    const initialImages =
      product.images && product.images.length > 0
        ? product.images
        : product.image_url
          ? [product.image_url]
          : [];

    const mappedGallery: GalleryItem[] = initialImages.map((url, index) => ({
      id: `existing-${index}-${Date.now()}`,
      type: 'existing',
      url: url,
    }));

    setGallery(mappedGallery);
  }, [product]);

  // Handlers
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setFormData({ ...formData, price: '' });
      return;
    }
    const numericValue = parseFloat(value) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setFormData({ ...formData, price: formatted });
  };

  const getDiscountedPrice = () => {
    const cleanPrice = parseFloat(
      formData.price.replace(/\./g, '').replace(',', '.')
    );
    if (isNaN(cleanPrice)) return 0;
    if (!formData.discount_percent || formData.discount_percent <= 0)
      return cleanPrice;
    return cleanPrice - cleanPrice * (formData.discount_percent / 100);
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newItems: GalleryItem[] = files.map((file) => ({
        id: `new-${file.name}-${Date.now()}`,
        type: 'new',
        url: URL.createObjectURL(file),
        file: file,
      }));
      setGallery((prev) => [...prev, ...newItems]);
    }
  };

  const removeImage = (index: number) =>
    setGallery((prev) => prev.filter((_, i) => i !== index));

  const setAsCover = (index: number) => {
    if (index === 0) return;
    const newArr = [...gallery];
    const item = newArr.splice(index, 1)[0];
    newArr.unshift(item);
    setGallery(newArr);
    if (addToast)
      addToast({
        title: 'Capa atualizada! (Salve para confirmar)',
        type: 'success',
      });
  };

  const addSpecRow = () => setSpecsRows([...specsRows, { key: '', value: '' }]);
  const removeSpecRow = (index: number) => {
    if (specsRows.length === 1) setSpecsRows([{ key: '', value: '' }]);
    else setSpecsRows(specsRows.filter((_, i) => i !== index));
  };
  const updateSpecRow = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newRows = [...specsRows];
    newRows[index][field] = value;
    setSpecsRows(newRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Recarregue a página.');

      let finalSpecs = formData.technical_specs;
      if (specsMode === 'table') {
        const validRows = specsRows.filter(
          (r) => r.key.trim() || r.value.trim()
        );
        finalSpecs = validRows.length > 0 ? JSON.stringify(validRows) : '';
      }

      const cleanPrice = parseFloat(
        formData.price.replace(/\./g, '').replace(',', '.')
      );

      // Upload Imagens
      const finalImages: string[] = [];
      for (const item of gallery) {
        if (item.type === 'existing') {
          finalImages.push(item.url);
        } else if (item.type === 'new' && item.file) {
          const fileExt = item.file.name.split('.').pop();
          const fileName = `${formData.reference_code}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(`public/${fileName}`, item.file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(`public/${fileName}`);
          finalImages.push(data.publicUrl);
        }
      }

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          reference_code: formData.reference_code,
          // Structured specs
          bridge: (formData as any).bridge || null,
          size: (formData as any).size || null,
          material: (formData as any).material || null,
          temple: (formData as any).temple || null,
          height: (formData as any).height || null,
          gender: (formData as any).gender || null,
          shape: (formData as any).shape || null,
          product_type: (formData as any).product_type || null,
          price: cleanPrice,
          discount_percent: formData.discount_percent,
          brand: formData.brand || null,
          category: formData.category || null,
          description: formData.description || null,
          technical_specs: finalSpecs,
          is_launch: formData.is_launch,
          is_best_seller: formData.is_best_seller,
          track_stock: formData.track_stock,
          stock_quantity: formData.track_stock
            ? Number(formData.stock_quantity)
            : 0,
          image_url: finalImages[0] || null,
          images: finalImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (error) throw error;

      if (addToast) addToast({ title: 'Produto atualizado!', type: 'success' });
      router.push('/dashboard/products');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      if (addToast)
        addToast({
          title: 'Erro ao salvar',
          description: error.message,
          type: 'error',
        });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      if (error) throw error;
      if (addToast) addToast({ title: 'Produto excluído', type: 'success' });
      router.push('/dashboard/products');
    } catch (error: any) {
      if (addToast)
        addToast({ title: 'Erro', description: error.message, type: 'error' });
      setSaving(false);
    }
  };

  const finalPrice = getDiscountedPrice();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Editar Produto</h1>
        </div>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
          title="Excluir"
        >
          <Trash2 />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">
              Informações Básicas
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referência
                </label>
                <input
                  type="text"
                  value={formData.reference_code}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_code: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {/* Preview do código de barras atual (se houver) */}
                {formData.barcode ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-600 font-mono">
                      {formData.barcode}
                    </span>
                    <div className="flex-shrink-0">
                      <ProductBarcode value={formData.barcode} height={32} />
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Original (R$)
                </label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={formData.price}
                  onChange={handlePriceChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Percent size={14} /> Desconto (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_percent: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>
            {formData.discount_percent ? (
              <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex items-center gap-3 text-sm">
                <span className="text-gray-400 line-through">
                  R$ {formData.price || '0,00'}
                </span>
                <ArrowLeft size={14} className="text-gray-400 rotate-180" />
                <span className="font-bold text-green-700 text-lg">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(finalPrice)}
                </span>
                <span className="ml-auto bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  -{formData.discount_percent}% OFF
                </span>
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SEÇÃO ESTOQUE */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
              <Package size={18} /> Estoque
            </h3>
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Controlar Estoque?
                </span>
                <p className="text-xs text-gray-500">
                  Se desmarcado, o produto sempre estará disponível.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.track_stock}
                onChange={(e) =>
                  setFormData({ ...formData, track_stock: e.target.checked })
                }
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            {formData.track_stock && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Disponível
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
                  className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
              <FileText size={18} /> Ficha Técnica
            </h3>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Modo de Edição
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSpecsMode('text')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${specsMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <AlignLeft size={14} /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsMode('table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${specsMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Table size={14} /> Tabela
                  </button>
                </div>
              </div>
              {specsMode === 'text' ? (
                <textarea
                  rows={5}
                  value={formData.technical_specs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      technical_specs: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  placeholder="Insira as especificações..."
                />
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                  <div className="grid grid-cols-[1fr_1fr_40px] gap-0 border-b border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-bold text-gray-500 uppercase">
                    <div className="px-2">Característica</div>
                    <div className="px-2">Detalhe</div>
                    <div></div>
                  </div>
                  {specsRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_40px] gap-0 border-b border-gray-200 last:border-0 bg-white group"
                    >
                      <input
                        type="text"
                        placeholder="Ex: Peso"
                        value={row.key}
                        onChange={(e) =>
                          updateSpecRow(idx, 'key', e.target.value)
                        }
                        className="px-4 py-3 text-sm border-r border-gray-100 outline-none focus:bg-indigo-50/30"
                      />
                      <input
                        type="text"
                        placeholder="Ex: 500g"
                        value={row.value}
                        onChange={(e) =>
                          updateSpecRow(idx, 'value', e.target.value)
                        }
                        className="px-4 py-3 text-sm outline-none focus:bg-indigo-50/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecRow(idx)}
                        className="flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSpecRow}
                    className="w-full py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Linha
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
              <ImageIcon size={18} /> Galeria de Fotos
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {/* Lista Unificada */}
              {gallery.map((item, index) => (
                <div
                  key={item.id}
                  className={`relative aspect-square rounded-lg overflow-hidden border group transition-all ${index === 0 ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`Item ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                  {item.type === 'new' && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">
                      Novo
                    </div>
                  )}
                  {index === 0 ? (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[10px] font-bold text-center py-1">
                      Capa Principal
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsCover(index)}
                      className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all font-medium"
                    >
                      Definir como Capa
                    </button>
                  )}
                </div>
              ))}
              <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors hover:border-indigo-300 group">
                <Plus
                  size={24}
                  className="text-gray-400 group-hover:text-indigo-500"
                />
                <span className="text-xs text-gray-500 font-medium mt-2 group-hover:text-indigo-600">
                  Adicionar
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleNewImages}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * A primeira imagem será a capa. Você pode reordenar clicando em
              "Definir como Capa".
            </p>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Categorização</h3>

            {/* Marca (Com Datalist para sugestão) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                list="brands-list"
                type="text"
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Selecione ou digite..."
              />
              <datalist id="brands-list">
                {availableBrands.map((b, i) => (
                  <option key={i} value={b.name} />
                ))}
              </datalist>
            </div>

            {/* Categoria (Com Datalist para sugestão) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <input
                list="categories-list"
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Selecione ou digite..."
              />
              <datalist id="categories-list">
                {availableCategories.map((c, i) => (
                  <option key={i} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Preto, Havana"
              />
            </div>

            <div className="mt-4">
              <div className="bg-white p-3 rounded-lg border border-gray-100">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Ativo
                    </div>
                    <div className="text-xs text-gray-500">
                      Quando desmarcado, o produto fica oculto na loja
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Destaques</h3>
            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-purple-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.is_launch}
                onChange={(e) =>
                  setFormData({ ...formData, is_launch: e.target.checked })
                }
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Zap size={16} className="text-purple-500" /> Lançamento
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-yellow-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.is_best_seller}
                onChange={(e) =>
                  setFormData({ ...formData, is_best_seller: e.target.checked })
                }
                className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
              />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Star size={16} className="text-yellow-500 fill-yellow-500" />{' '}
                Mais Vendido
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-70 flex justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar
            Alterações
          </button>
        </div>
      </form>

      {/* Modal de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Excluir este produto?
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              Essa ação é permanente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={saving}
                className="py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Sim, Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
