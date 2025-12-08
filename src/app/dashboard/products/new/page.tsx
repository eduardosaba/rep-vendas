'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Save,
  X,
  Plus,
  Star,
  Zap,
  FileText,
  Image as ImageIcon,
  Table,
  AlignLeft,
  Percent,
  Package,
  Barcode,
  ScanLine,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import ProductBarcode from '@/components/ui/Barcode';

interface SpecRow {
  key: string;
  value: string;
}

export default function NewProductPage() {
  const router = useRouter();
  // usar sonner diretamente
  const [loading, setLoading] = useState(false);

  const supabase = sharedSupabase;

  // Estados
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [specsMode, setSpecsMode] = useState<'text' | 'table'>('text');
  const [specsRows, setSpecsRows] = useState<SpecRow[]>([
    { key: '', value: '' },
  ]);

  // Listas Auxiliares
  const [availableBrands, setAvailableBrands] = useState<{ name: string }[]>(
    []
  );
  const [availableCategories, setAvailableCategories] = useState<
    { name: string }[]
  >([]);

  const [formData, setFormData] = useState({
    name: '',
    reference_code: '',
    sku: '', // Novo
    barcode: '', // Novo
    color: '', // Novo
    // Structured specs
    bridge: '',
    size: '',
    material: '',
    temple: '',
    height: '',
    gender: '',
    shape: '',
    product_type: '',
    price: '',
    discount_percent: 0,
    brand: '',
    category: '',
    description: '',
    technical_specs: '',
    track_stock: true,
    stock_quantity: 0,
    is_launch: false,
    is_best_seller: false,
    is_active: true,
  });

  // Carregar Listas
  useEffect(() => {
    const fetchAuxData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: brands } = await supabase
        .from('brands')
        .select('name')
        .eq('user_id', user.id)
        .order('name');
      const { data: cats } = await supabase
        .from('categories')
        .select('name')
        .eq('user_id', user.id)
        .order('name');
      setAvailableBrands(brands || []);
      setAvailableCategories(cats || []);
    };
    fetchAuxData();
  }, [supabase]);

  // Handlers (Resumidos para focar na mudança)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImageFiles((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    const newFiles = [...imageFiles];
    const selectedFile = newFiles.splice(index, 1)[0];
    newFiles.unshift(selectedFile);
    setImageFiles(newFiles);
    const newPreviews = [...previewUrls];
    const selectedPreview = newPreviews.splice(index, 1)[0];
    newPreviews.unshift(selectedPreview);
    setPreviewUrls(newPreviews);
    toast.success('Capa definida!');
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
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sessão expirada.');
      const user = session.user;

      const finalReference = formData.reference_code.trim()
        ? formData.reference_code
        : `REF-${Date.now().toString().slice(-6)}`;
      const cleanPrice = parseFloat(
        formData.price.replace(/\./g, '').replace(',', '.')
      );

      let finalSpecs = formData.technical_specs;
      if (specsMode === 'table') {
        const validRows = specsRows.filter(
          (r) => r.key.trim() || r.value.trim()
        );
        finalSpecs = validRows.length > 0 ? JSON.stringify(validRows) : '';
      }

      // Upload
      const uploadPromises = imageFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${finalReference}-${Date.now()}-${index}.${fileExt}`;
        const { error } = await supabase.storage
          .from('product-images')
          .upload(`public/${fileName}`, file);
        if (error) throw error;
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(`public/${fileName}`);
        return data.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      const { error } = await supabase.from('products').insert({
        user_id: user.id,
        name: formData.name,
        reference_code: finalReference,
        // Novos Campos
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        color: formData.color || null,
        // Structured specs
        bridge: formData.bridge || null,
        size: formData.size || null,
        material: formData.material || null,
        temple: formData.temple || null,
        height: formData.height || null,
        gender: formData.gender || null,
        shape: formData.shape || null,
        product_type: formData.product_type || null,

        price: cleanPrice,
        discount_percent: formData.discount_percent,
        brand: formData.brand || null,
        category: formData.category || null,
        description: formData.description || null,
        technical_specs: finalSpecs,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock
          ? Number(formData.stock_quantity)
          : 0,
        is_launch: formData.is_launch,
        is_best_seller: formData.is_best_seller,
        is_active: formData.is_active,
        image_url: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        images: uploadedUrls,
      });

      if (error) throw error;

      toast.success('Produto criado!');
      router.push('/dashboard/products');
    } catch (error: any) {
      toast.error('Erro', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
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
                Nome do Produto *
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
                  placeholder="Auto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Barcode size={14} /> Barras (EAN)
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formData.barcode ? (
                  <div className="mt-2">
                    <ProductBarcode value={formData.barcode} height={36} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$) *
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
                  value={formData.discount_percent}
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

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ponte
                </label>
                <input
                  type="text"
                  value={(formData as any).bridge}
                  onChange={(e) =>
                    setFormData({ ...formData, bridge: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tamanho
                </label>
                <input
                  type="text"
                  value={(formData as any).size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material
                </label>
                <input
                  type="text"
                  value={(formData as any).material}
                  onChange={(e) =>
                    setFormData({ ...formData, material: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Haste
                </label>
                <input
                  type="text"
                  value={(formData as any).temple}
                  onChange={(e) =>
                    setFormData({ ...formData, temple: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Altura
                </label>
                <input
                  type="text"
                  value={(formData as any).height}
                  onChange={(e) =>
                    setFormData({ ...formData, height: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gênero
                </label>
                <input
                  type="text"
                  value={(formData as any).gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato
                </label>
                <input
                  type="text"
                  value={(formData as any).shape}
                  onChange={(e) =>
                    setFormData({ ...formData, shape: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <input
                  type="text"
                  value={(formData as any).product_type}
                  onChange={(e) =>
                    setFormData({ ...formData, product_type: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

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

          {/* Ficha Técnica (Mantido) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
              <FileText size={18} /> Ficha Técnica
            </h3>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Modo
                </label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSpecsMode('text')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${specsMode === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                  >
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecsMode('table')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${specsMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                  >
                    Tabela
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
                  placeholder="Especificações..."
                />
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                  {specsRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_40px] gap-0 border-b border-gray-200 last:border-0 bg-white"
                    >
                      <input
                        type="text"
                        placeholder="Característica"
                        value={row.key}
                        onChange={(e) =>
                          updateSpecRow(idx, 'key', e.target.value)
                        }
                        className="px-4 py-3 text-sm border-r border-gray-100 outline-none focus:bg-indigo-50/30"
                      />
                      <input
                        type="text"
                        placeholder="Valor"
                        value={row.value}
                        onChange={(e) =>
                          updateSpecRow(idx, 'value', e.target.value)
                        }
                        className="px-4 py-3 text-sm outline-none focus:bg-indigo-50/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecRow(idx)}
                        className="flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <X size={14} />
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

          {/* Galeria (Mantido) */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
              <ImageIcon size={18} /> Galeria
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div
                  key={index}
                  className={`relative aspect-square rounded-lg overflow-hidden border group ${index === 0 ? 'border-indigo-500 ring-2' : 'border-gray-200'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    className="w-full h-full object-cover"
                    alt="preview"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded-full shadow opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                  {index === 0 ? (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-white text-[10px] text-center py-1">
                      Capa
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAsCover(index)}
                      className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 opacity-0 group-hover:opacity-100 hover:bg-black/70"
                    >
                      Capa
                    </button>
                  )}
                </div>
              ))}
              <label className="cursor-pointer flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50">
                <Plus size={24} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium mt-2">
                  Adicionar
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Categorização</h3>

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
                placeholder="Selecione..."
              />
              <datalist id="brands-list">
                {availableBrands.map((b, i) => (
                  <option key={i} value={b.name} />
                ))}
              </datalist>
            </div>
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
                placeholder="Selecione..."
              />
              <datalist id="categories-list">
                {availableCategories.map((c, i) => (
                  <option key={i} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* NOVO CAMPO COR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Palette size={14} /> Cor
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Azul Marinho"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Visibilidade</h3>
            <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-green-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
              />
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                Ativo
              </div>
            </label>
            <p className="text-xs text-gray-500">
              Se desmarcado, o produto ficará inativo no catálogo.
            </p>
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
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-70 flex justify-center gap-2 shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save />} Salvar
            Produto
          </button>
        </div>
      </form>
    </div>
  );
}
