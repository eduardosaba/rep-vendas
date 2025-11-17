'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Upload,
  X,
  Save,
  Percent,
} from 'lucide-react';
import { uploadImage } from '../../../lib/storage';

interface User {
  id: string;
  email?: string;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  commission_percentage: number;
  user_id: string;
}

interface BrandFormData {
  name: string;
  logo_url: string;
  commission_percentage: string;
}

export default function BrandsPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    logo_url: '',
    commission_percentage: '0',
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && user) {
      setUploading(true);
      const result = await uploadImage(file, 'marcas', user.id);
      if (result.success && result.publicUrl) {
        setFormData((prev) => ({
          ...prev,
          logo_url: result.publicUrl as string,
        }));
      }
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const brandData = {
      user_id: user.id,
      name: formData.name.trim(),
      logo_url: formData.logo_url,
      commission_percentage: parseFloat(formData.commission_percentage) || 0,
    };

    try {
      if (editingBrand) {
        // Atualizar marca existente
        const { error } = await supabase
          .from('brands')
          .update(brandData)
          .eq('id', editingBrand.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar nova marca
        const { error } = await supabase.from('brands').insert(brandData);

        if (error) throw error;
      }

      // Recarregar marcas
      loadBrands(user.id);

      // Resetar formulário
      setFormData({
        name: '',
        logo_url: '',
        commission_percentage: '0',
      });
      setEditingBrand(null);
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      alert('Erro ao salvar marca. Tente novamente.');
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo_url: brand.logo_url || '',
      commission_percentage: brand.commission_percentage.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (brandId: string) => {
    if (!user) return;

    if (!confirm('Tem certeza que deseja excluir esta marca?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)
        .eq('user_id', user.id);

      if (error) throw error;

      loadBrands(user.id);
    } catch (error) {
      console.error('Erro ao excluir marca:', error);
      alert('Erro ao excluir marca. Tente novamente.');
    }
  };

  const openModal = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      logo_url: '',
      commission_percentage: '0',
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
              Gerenciar Marcas
            </h1>
            <p>Adicione e gerencie as marcas do seu catálogo</p>
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
              Nova Marca
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
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="truncate text-sm font-medium text-gray-500">
                        Total de Marcas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {brands.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="overflow-hidden rounded-lg bg-white shadow"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-center">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="mb-2 text-lg font-medium text-gray-900">
                      {brand.name}
                    </h3>
                    <div className="mb-4 flex items-center justify-center text-sm text-gray-600">
                      <Percent className="mr-1 h-4 w-4" />
                      Comissão: {brand.commission_percentage}%
                    </div>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEdit(brand)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {brands.length === 0 && (
            <div className="py-16 text-center">
              <Building2 className="mx-auto mb-4 h-24 w-24 text-gray-300" />
              <h3 className="mb-2 text-xl font-medium text-gray-900">
                Nenhuma marca cadastrada
              </h3>
              <p className="mb-6 text-gray-600">
                Comece adicionando sua primeira marca ao catálogo.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Primeira Marca
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
                  {editingBrand ? 'Editar Marca' : 'Nova Marca'}
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
                      Nome da Marca *
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
                      placeholder="Nome da marca"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Percentual de Comissão (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.commission_percentage}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          commission_percentage: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Logo da Marca
                  </label>
                  {formData.logo_url && (
                    <div className="mb-2 flex justify-center">
                      <img
                        src={formData.logo_url}
                        alt="Preview"
                        className="h-32 w-32 rounded border object-contain"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-center space-x-4">
                    <label className="flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Escolher logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, logo_url: '' }))
                        }
                        className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </button>
                    )}
                  </div>
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
                    {editingBrand ? 'Atualizar' : 'Salvar'} Marca
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
