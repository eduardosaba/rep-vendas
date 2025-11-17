"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Upload,
  X,
  Save,
  Percent,
} from "lucide-react";
import { uploadImage } from "../../../lib/storage";

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
    name: "",
    logo_url: "",
    commission_percentage: "0",
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        loadBrands(user.id);
      }
    };
    getUser();
  }, [router]);

  const loadBrands = async (userId: string) => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (data && !error) {
      setBrands(data);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file && user) {
      setUploading(true);
      const result = await uploadImage(file, "marcas", user.id);
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
          .from("brands")
          .update(brandData)
          .eq("id", editingBrand.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Criar nova marca
        const { error } = await supabase.from("brands").insert(brandData);

        if (error) throw error;
      }

      // Recarregar marcas
      loadBrands(user.id);

      // Resetar formulário
      setFormData({
        name: "",
        logo_url: "",
        commission_percentage: "0",
      });
      setEditingBrand(null);
      setShowModal(false);
    } catch (error) {
      console.error("Erro ao salvar marca:", error);
      alert("Erro ao salvar marca. Tente novamente.");
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo_url: brand.logo_url || "",
      commission_percentage: brand.commission_percentage.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (brandId: string) => {
    if (!user) return;

    if (!confirm("Tem certeza que deseja excluir esta marca?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", brandId)
        .eq("user_id", user.id);

      if (error) throw error;

      loadBrands(user.id);
    } catch (error) {
      console.error("Erro ao excluir marca:", error);
      alert("Erro ao excluir marca. Tente novamente.");
    }
  };

  const openModal = () => {
    setEditingBrand(null);
    setFormData({
      name: "",
      logo_url: "",
      commission_percentage: "0",
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
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Marcas
            </h1>
            <p>Adicione e gerencie as marcas do seu catálogo</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Voltar ao Dashboard
            </button>
            <button
              onClick={openModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Marca
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats */}
          <div className="mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="bg-white overflow-hidden shadow rounded-lg"
              >
                <div className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-20 h-20 object-contain"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 flex items-center justify-center rounded">
                        <Building2 className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {brand.name}
                    </h3>
                    <div className="flex items-center justify-center text-sm text-gray-600 mb-4">
                      <Percent className="h-4 w-4 mr-1" />
                      Comissão: {brand.commission_percentage}%
                    </div>
                    <div className="flex space-x-2 justify-center">
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
            <div className="text-center py-16">
              <Building2 className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Nenhuma marca cadastrada
              </h3>
              <p className="text-gray-600 mb-6">
                Comece adicionando sua primeira marca ao catálogo.
              </p>
              <button
                onClick={openModal}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Primeira Marca
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingBrand ? "Editar Marca" : "Nova Marca"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Nome da marca"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo da Marca
                  </label>
                  {formData.logo_url && (
                    <div className="mb-2 flex justify-center">
                      <img
                        src={formData.logo_url}
                        alt="Preview"
                        className="w-32 h-32 object-contain rounded border"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-center space-x-4">
                    <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Enviando..." : "Escolher logo"}
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
                          setFormData((prev) => ({ ...prev, logo_url: "" }))
                        }
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingBrand ? "Atualizar" : "Salvar"} Marca
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
