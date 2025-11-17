'use client';

import { useEffect, useState, FormEvent, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Package, Upload, X, Save } from 'lucide-react';
import { uploadImage } from '../../../lib/storage';

interface User {
  id: string;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  image_url?: string;
  bestseller?: boolean;
  is_launch?: boolean;
  user_id: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  commission_percentage: number;
}

interface ProductFormData {
  name: string;
  brand: string;
  reference_code: string;
  description: string;
  price: string;
  image_url: string;
  bestseller: boolean;
  is_launch: boolean;
}

export default function ProductsPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterBestseller, setFilterBestseller] = useState<string>('');
  const [filterLaunch, setFilterLaunch] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === '' ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference_code
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBrand = filterBrand === '' || product.brand === filterBrand;

      const matchesBestseller =
        filterBestseller === '' ||
        (filterBestseller === 'true' && product.bestseller) ||
        (filterBestseller === 'false' && !product.bestseller);

      const matchesLaunch =
        filterLaunch === '' ||
        (filterLaunch === 'true' && product.is_launch) ||
        (filterLaunch === 'false' && !product.is_launch);

      return (
        matchesSearch && matchesBrand && matchesBestseller && matchesLaunch
      );
    });
  }, [products, searchTerm, filterBrand, filterBestseller, filterLaunch]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    reference_code: '',
    description: '',
    price: '',
    image_url: '',
    bestseller: false,
    is_launch: false,
  });
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        loadProducts(user.id);
        loadBrands(user.id);
      }
    };
    getUser();
  }, [router]);

  const loadBrands = async (userId: string) => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (data && !error) {
      setBrands(data);
    }
  };

  const loadProducts = async (userId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (data && !error) {
      setProducts(data);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && user) {
      setUploading(true);
      const result = await uploadImage(file, 'produtos', user.id);
      if (result.success && result.publicUrl) {
        setFormData((prev) => ({
          ...prev,
          image_url: result.publicUrl as string,
        }));
      }
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const productData = {
      user_id: user.id,
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      reference_code: formData.reference_code.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      image_url: formData.image_url,
      bestseller: formData.bestseller,
      is_launch: formData.is_launch,
    };

    try {
      if (editingProduct) {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar novo produto
        const { error } = await supabase.from('products').insert(productData);

        if (error) throw error;
      }

      // Recarregar produtos
      loadProducts(user.id);

      // Resetar formulário
      setFormData({
        name: '',
        brand: '',
        reference_code: '',
        description: '',
        price: '',
        image_url: '',
        bestseller: false,
        is_launch: false,
      });
      setEditingProduct(null);
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand || '',
      reference_code: product.reference_code || '',
      description: product.description || '',
      price: product.price.toString(),
      image_url: product.image_url || '',
      bestseller: product.bestseller || false,
      is_launch: product.is_launch || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id);

      if (error) throw error;

      loadProducts(user.id);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      alert('Erro ao excluir produto. Tente novamente.');
    }
  };

  const openModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      reference_code: '',
      description: '',
      price: '',
      image_url: '',
      bestseller: false,
      is_launch: false,
    });
    setShowModal(true);
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Produtos
            </h1>
            <p>Adicione e gerencie os produtos do seu catálogo</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Voltar ao Dashboard
            </button>
            <button
              onClick={openModal}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Produto
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats */}
          <div className="mb-8">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Total de Produtos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {products.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Buscar produtos
                </label>
                <input
                  type="text"
                  placeholder="Nome, marca, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Filtrar por marca
                </label>
                <select
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Todas as marcas</option>
                  {Array.from(
                    new Set(products.map((p) => p.brand).filter(Boolean))
                  ).map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Bestseller
                </label>
                <select
                  value={filterBestseller}
                  onChange={(e) => setFilterBestseller(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="true">Apenas bestsellers</option>
                  <option value="false">Não bestsellers</option>
                </select>
              </div>
              <div className="md:w-48">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Lançamento
                </label>
                <select
                  value={filterLaunch}
                  onChange={(e) => setFilterLaunch(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Todos</option>
                  <option value="true">Apenas lançamentos</option>
                  <option value="false">Não lançamentos</option>
                </select>
              </div>
            </div>
            {(searchTerm ||
              filterBrand ||
              filterBestseller ||
              filterLaunch) && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {filteredProducts.length} produto(s) encontrado(s)
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBrand('');
                    setFilterBestseller('');
                    setFilterLaunch('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-lg bg-white shadow"
              >
                <div className="relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-gray-100">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  {product.bestseller && (
                    <div className="absolute left-2 top-2 rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-yellow-900">
                      Bestseller
                    </div>
                  )}
                  {product.is_launch && (
                    <div className="absolute right-2 top-2 rounded bg-green-400 px-2 py-1 text-xs font-bold text-green-900">
                      Lançamento
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-1 text-sm font-medium text-gray-900">
                        {product.name}
                      </h3>
                      <p className="mb-1 text-sm text-gray-500">
                        {product.brand}
                      </p>
                      <p className="mb-2 text-sm text-gray-500">
                        {product.reference_code}
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        R$ {product.price?.toFixed(2)}
                      </p>
                    </div>
                    <div className="ml-2 flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && products.length > 0 && (
            <div className="py-16 text-center">
              <Package className="mx-auto mb-4 h-24 w-24 text-gray-300" />
              <h3 className="mb-2 text-xl font-medium text-gray-900">
                Nenhum produto encontrado
              </h3>
              <p className="mb-6 text-gray-600">
                Tente ajustar sua busca ou filtros.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterBrand('');
                  setFilterBestseller('');
                  setFilterLaunch('');
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Limpar Filtros
              </button>
            </div>
          )}

          {products.length === 0 && (
            <div className="py-16 text-center">
              <Package className="mx-auto mb-4 h-24 w-24 text-gray-300" />
              <h3 className="mb-2 text-xl font-medium text-gray-900">
                Nenhum produto cadastrado
              </h3>
              <p className="mb-6 text-gray-600">
                Comece adicionando seu primeiro produto ao catálogo.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Primeiro Produto
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative top-20 mx-auto w-full max-w-2xl rounded-md border bg-white p-5 shadow-lg">
            <div className="mt-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Marca
                    </label>
                    <select
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          brand: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    >
                      <option value="">Selecione uma marca</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.name}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Não encontra a marca?{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/brands')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Gerenciar marcas
                      </button>
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Código de Referência
                    </label>
                    <input
                      type="text"
                      value={formData.reference_code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reference_code: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="Código interno"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="h-24 w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Descrição detalhada do produto"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Imagem do Produto
                  </label>
                  {formData.image_url && (
                    <div className="mb-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-32 w-32 rounded border object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-4">
                    <label className="flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Escolher imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image_url: '' }))
                        }
                        className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="bestseller"
                    checked={formData.bestseller}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bestseller: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="bestseller"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Marcar como produto bestseller
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_launch"
                    checked={formData.is_launch}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_launch: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_launch"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Marcar como Lançamento
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {editingProduct ? 'Atualizar' : 'Salvar'} Produto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
