"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { uploadImage, deleteImage } from "../../lib/storage";
import { useRouter } from "next/navigation";
import {
  Upload,
  Image,
  Settings,
  Save,
  X,
  Plus,
  Tag,
  Package,
} from "lucide-react";

interface User {
  id: string;
  email?: string;
}

interface Settings {
  name: string;
  email: string;
  phone: string;
  logo_url?: string;
  banner_url?: string;
  primary_color: string;
  secondary_color: string;
  header_color: string;
  font_family: string;
  title_color: string;
  icon_color: string;
  email_provider?: string;
  email_api_key?: string;
  email_from?: string;
  show_shipping?: boolean;
  show_installments?: boolean;
  show_delivery_address?: boolean;
  show_installments_checkout?: boolean;
  show_discount?: boolean;
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;
  show_delivery_address_checkout?: boolean;
  show_payment_method_checkout?: boolean;
}

interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  commission_percentage: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  color: string;
}

interface UploadingState {
  logo: boolean;
  banner: boolean;
  product: boolean;
  brand: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    name: "",
    email: "",
    phone: "",
    logo_url: "",
    banner_url: "",
    primary_color: "#3B82F6", // blue-500
    secondary_color: "#6B7280", // gray-500
    header_color: "#FFFFFF", // white
    font_family: "Inter, sans-serif",
    title_color: "#111827", // gray-900
    icon_color: "#4B5563", // gray-600
    email_provider: "resend",
    email_api_key: "",
    email_from: "",
    show_shipping: true,
    show_installments: true,
    show_delivery_address: true,
    show_installments_checkout: true,
    show_discount: true,
    show_old_price: true,
    show_filter_price: true,
    show_filter_category: true,
    show_filter_bestseller: true,
    show_filter_new: true,
    show_delivery_address_checkout: true,
    show_payment_method_checkout: true,
  });
  const [uploading, setUploading] = useState<UploadingState>({
    logo: false,
    banner: false,
    product: false,
    brand: false,
  });
  const [message, setMessage] = useState<string>("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newBrandName, setNewBrandName] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [newCategoryDescription, setNewCategoryDescription] =
    useState<string>("");
  const [newCategoryColor, setNewCategoryColor] = useState<string>("#3B82F6");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        loadSettings(user.id);
        loadBrands(user.id);
        loadCategories(user.id);
      }
    };
    getUser();
  }, [router]);

  const loadSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data && !error) {
      // Garantir que todos os valores sejam strings ou valores apropriados
      setSettings({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        logo_url: data.logo_url || "",
        banner_url: data.banner_url || "",
        primary_color: data.primary_color || "#3B82F6",
        secondary_color: data.secondary_color || "#6B7280",
        header_color: data.header_color || "#FFFFFF",
        font_family: data.font_family || "Inter, sans-serif",
        title_color: data.title_color || "#111827",
        icon_color: data.icon_color || "#4B5563",
        email_provider: data.email_provider || "resend",
        email_api_key: data.email_api_key || "",
        email_from: data.email_from || "",
        show_shipping:
          data.show_shipping !== undefined ? data.show_shipping : true,
        show_installments:
          data.show_installments !== undefined ? data.show_installments : true,
        show_delivery_address:
          data.show_delivery_address !== undefined
            ? data.show_delivery_address
            : true,
        show_installments_checkout:
          data.show_installments_checkout !== undefined
            ? data.show_installments_checkout
            : true,
        show_discount:
          data.show_discount !== undefined ? data.show_discount : true,
        show_old_price:
          data.show_old_price !== undefined ? data.show_old_price : true,
        show_filter_price:
          data.show_filter_price !== undefined ? data.show_filter_price : true,
        show_filter_category:
          data.show_filter_category !== undefined
            ? data.show_filter_category
            : true,
        show_filter_bestseller:
          data.show_filter_bestseller !== undefined
            ? data.show_filter_bestseller
            : true,
        show_filter_new:
          data.show_filter_new !== undefined ? data.show_filter_new : true,
        show_delivery_address_checkout:
          data.show_delivery_address_checkout !== undefined
            ? data.show_delivery_address_checkout
            : true,
        show_payment_method_checkout:
          data.show_payment_method_checkout !== undefined
            ? data.show_payment_method_checkout
            : true,
      });
    }
  };

  const loadBrands = async (userId: string) => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (data && !error) {
      setBrands(data);
    }
  };

  const loadCategories = async (userId: string) => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (data && !error) {
      setCategories(data);
    }
  };

  const createBrand = async () => {
    if (!user || !newBrandName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("brands")
        .insert({
          name: newBrandName.trim(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setBrands([...brands, data]);
      setNewBrandName("");
      setMessage("Marca criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar marca:", error);
      setMessage(`Erro ao criar marca: ${(error as Error).message}`);
    }
  };

  const deleteBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", brandId);

      if (error) throw error;

      setBrands(brands.filter((brand) => brand.id !== brandId));
      setMessage("Marca removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover marca:", error);
      setMessage(`Erro ao remover marca: ${(error as Error).message}`);
    }
  };

  const createCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          color: newCategoryColor,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryColor("#3B82F6");
      setMessage("Categoria criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      setMessage(`Erro ao criar categoria: ${(error as Error).message}`);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      setCategories(
        categories.filter((category) => category.id !== categoryId),
      );
      setMessage("Categoria removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      setMessage(`Erro ao remover categoria: ${(error as Error).message}`);
    }
  };

  const uploadImageToBucket = async (
    file: File,
    bucket: string,
    field: keyof UploadingState,
  ) => {
    if (!user) return;

    setUploading((prev) => ({ ...prev, [field]: true }));
    setMessage("");

    const result = await uploadImage(file, bucket, user.id);

    if (result.success) {
      if (field === "logo") {
        setSettings((prev) => ({ ...prev, logo_url: result.publicUrl }));
      } else if (field === "banner") {
        setSettings((prev) => ({ ...prev, banner_url: result.publicUrl }));
      }
      setMessage(`Imagem enviada com sucesso para ${bucket}!`);
    } else {
      setMessage(`Erro ao fazer upload: ${result.error}`);
    }

    setUploading((prev) => ({ ...prev, [field]: false }));
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    bucket: string,
    field: keyof UploadingState,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageToBucket(file, bucket, field);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      // Primeiro, tentar atualizar se já existe
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;
      if (existing) {
        // Atualizar registro existente
        result = await supabase
          .from("settings")
          .update({
            name: settings.name || null,
            email: settings.email || null,
            phone: settings.phone || null,
            logo_url: settings.logo_url || null,
            banner_url: settings.banner_url || null,
            primary_color: settings.primary_color || "#3B82F6",
            secondary_color: settings.secondary_color || "#6B7280",
            header_color: settings.header_color || "#FFFFFF",
            font_family: settings.font_family || "Inter, sans-serif",
            title_color: settings.title_color || "#111827",
            icon_color: settings.icon_color || "#4B5563",
            email_provider: settings.email_provider || "resend",
            email_api_key: settings.email_api_key || null,
            email_from: settings.email_from || null,
            show_shipping:
              settings.show_shipping !== undefined
                ? settings.show_shipping
                : true,
            show_installments:
              settings.show_installments !== undefined
                ? settings.show_installments
                : true,
            show_delivery_address:
              settings.show_delivery_address !== undefined
                ? settings.show_delivery_address
                : true,
            show_installments_checkout:
              settings.show_installments_checkout !== undefined
                ? settings.show_installments_checkout
                : true,
            show_discount:
              settings.show_discount !== undefined
                ? settings.show_discount
                : true,
            show_old_price:
              settings.show_old_price !== undefined
                ? settings.show_old_price
                : true,
            show_filter_price:
              settings.show_filter_price !== undefined
                ? settings.show_filter_price
                : true,
            show_filter_category:
              settings.show_filter_category !== undefined
                ? settings.show_filter_category
                : true,
            show_filter_bestseller:
              settings.show_filter_bestseller !== undefined
                ? settings.show_filter_bestseller
                : true,
            show_filter_new:
              settings.show_filter_new !== undefined
                ? settings.show_filter_new
                : true,
            show_delivery_address_checkout:
              settings.show_delivery_address_checkout !== undefined
                ? settings.show_delivery_address_checkout
                : true,
            show_payment_method_checkout:
              settings.show_payment_method_checkout !== undefined
                ? settings.show_payment_method_checkout
                : true,
          })
          .eq("user_id", user.id);
      } else {
        // Inserir novo registro
        result = await supabase.from("settings").insert({
          user_id: user.id,
          name: settings.name || null,
          email: settings.email || null,
          phone: settings.phone || null,
          logo_url: settings.logo_url || null,
          banner_url: settings.banner_url || null,
          primary_color: settings.primary_color || "#3B82F6",
          secondary_color: settings.secondary_color || "#6B7280",
          header_color: settings.header_color || "#FFFFFF",
          font_family: settings.font_family || "Inter, sans-serif",
          title_color: settings.title_color || "#111827",
          icon_color: settings.icon_color || "#4B5563",
          email_provider: settings.email_provider || "resend",
          email_api_key: settings.email_api_key || null,
          email_from: settings.email_from || null,
          show_shipping:
            settings.show_shipping !== undefined
              ? settings.show_shipping
              : true,
          show_installments:
            settings.show_installments !== undefined
              ? settings.show_installments
              : true,
          show_delivery_address:
            settings.show_delivery_address !== undefined
              ? settings.show_delivery_address
              : true,
          show_installments_checkout:
            settings.show_installments_checkout !== undefined
              ? settings.show_installments_checkout
              : true,
          show_discount:
            settings.show_discount !== undefined
              ? settings.show_discount
              : true,
          show_old_price:
            settings.show_old_price !== undefined
              ? settings.show_old_price
              : true,
          show_filter_price:
            settings.show_filter_price !== undefined
              ? settings.show_filter_price
              : true,
          show_filter_category:
            settings.show_filter_category !== undefined
              ? settings.show_filter_category
              : true,
          show_filter_bestseller:
            settings.show_filter_bestseller !== undefined
              ? settings.show_filter_bestseller
              : true,
          show_filter_new:
            settings.show_filter_new !== undefined
              ? settings.show_filter_new
              : true,
          show_delivery_address_checkout:
            settings.show_delivery_address_checkout !== undefined
              ? settings.show_delivery_address_checkout
              : true,
          show_payment_method_checkout:
            settings.show_payment_method_checkout !== undefined
              ? settings.show_payment_method_checkout
              : true,
        });
      }

      if (result.error) throw result.error;

      setMessage("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setMessage(`Erro ao salvar configurações: ${(error as Error).message}`);
    }
  };

  const ImageUploadCard = ({
    title,
    bucket,
    field,
    currentUrl,
    description,
  }: {
    title: string;
    bucket: string;
    field: keyof UploadingState;
    currentUrl?: string;
    description: string;
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      {currentUrl && currentUrl.trim() !== "" && (
        <div className="mb-4">
          <img
            src={currentUrl}
            alt={title}
            className="w-full h-40 object-cover rounded"
          />
        </div>
      )}

      <div className="flex items-center space-x-4">
        <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
          <Upload className="h-4 w-4 mr-2" />
          {uploading[field] ? "Enviando..." : "Escolher imagem"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, bucket, field)}
            className="hidden"
            disabled={uploading[field]}
          />
        </label>
        {currentUrl && currentUrl.trim() !== "" && (
          <button
            onClick={() => {
              if (field === "logo") {
                setSettings((prev) => ({ ...prev, logo_url: "" }));
              } else if (field === "banner") {
                setSettings((prev) => ({ ...prev, banner_url: "" }));
              }
            }}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <X className="h-4 w-4 mr-2" />
            Remover
          </button>
        )}
      </div>
    </div>
  );

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-gray-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configurações
                </h1>
                <p className="text-sm text-gray-600">
                  Gerencie suas imagens e configurações
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${message.includes("Erro") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message}
          </div>
        )}

        {/* Configurações de Email */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configurações de Email
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provedor de Email
              </label>
              <select
                value={settings.email_provider || "resend"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    email_provider: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="resend">Resend (Recomendado)</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="aws-ses">AWS SES</option>
                <option value="smtp">SMTP Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do Remetente
              </label>
              <input
                type="email"
                value={settings.email_from || ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    email_from: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="noreply@suaempresa.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chave API
              </label>
              <input
                type="password"
                value={settings.email_api_key || ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    email_api_key: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Sua chave API do provedor de email"
              />
              <p className="text-xs text-gray-500 mt-1">
                A chave API é armazenada de forma segura e usada apenas para
                envio de emails.
              </p>
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações de Email
          </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={settings.name || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Nome da sua empresa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.email || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={settings.phone || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </button>
        </div>

        {/* Personalização do Tema */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Personalização do Tema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor Primária (Botões)
              </label>
              <input
                type="color"
                value={settings.primary_color || "#3B82F6"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    primary_color: e.target.value,
                  }))
                }
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor Secundária
              </label>
              <input
                type="color"
                value={settings.secondary_color || "#6B7280"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    secondary_color: e.target.value,
                  }))
                }
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do Cabeçalho
              </label>
              <input
                type="color"
                value={settings.header_color || "#FFFFFF"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    header_color: e.target.value,
                  }))
                }
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do Título
              </label>
              <input
                type="color"
                value={settings.title_color || "#111827"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    title_color: e.target.value,
                  }))
                }
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor dos Ícones
              </label>
              <input
                type="color"
                value={settings.icon_color || "#4B5563"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    icon_color: e.target.value,
                  }))
                }
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Tema
          </button>
        </div>

        {/* Upload de Imagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploadCard
            title="Logo da Empresa"
            bucket="logos"
            field="logo"
            currentUrl={settings.logo_url}
            description="Logo que aparece no catálogo e cabeçalho"
          />

          <ImageUploadCard
            title="Banner Principal"
            bucket="banner"
            field="banner"
            currentUrl={settings.banner_url}
            description="Banner exibido no topo do catálogo"
          />
        </div>

        {/* Configurações de Catálogo */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configurações de Catálogo
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_filter_price"
                checked={
                  settings.show_filter_price !== undefined
                    ? settings.show_filter_price
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_filter_price: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_filter_price"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar filtro de preço no catálogo
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_filter_category"
                checked={
                  settings.show_filter_category !== undefined
                    ? settings.show_filter_category
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_filter_category: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_filter_category"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar filtro de categoria/marca no catálogo
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_filter_bestseller"
                checked={
                  settings.show_filter_bestseller !== undefined
                    ? settings.show_filter_bestseller
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_filter_bestseller: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_filter_bestseller"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar filtro de produtos bestseller no catálogo
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_filter_new"
                checked={
                  settings.show_filter_new !== undefined
                    ? settings.show_filter_new
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_filter_new: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_filter_new"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar filtro de lançamentos no catálogo
              </label>
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações de Catálogo
          </button>
        </div>

        {/* Configurações de Checkout */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Configurações de Checkout
          </h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_shipping"
                checked={
                  settings.show_shipping !== undefined
                    ? settings.show_shipping
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_shipping: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_shipping"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar opção de frete no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_installments"
                checked={
                  settings.show_installments !== undefined
                    ? settings.show_installments
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_installments: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_installments"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar opções de parcelamento no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_delivery_address"
                checked={
                  settings.show_delivery_address !== undefined
                    ? settings.show_delivery_address
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_delivery_address: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_delivery_address"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar campo de endereço de entrega no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_installments_checkout"
                checked={
                  settings.show_installments_checkout !== undefined
                    ? settings.show_installments_checkout
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_installments_checkout: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_installments_checkout"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar parcelamento na página de checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_discount"
                checked={
                  settings.show_discount !== undefined
                    ? settings.show_discount
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_discount: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_discount"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar campo de desconto/cupom no checkout
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_old_price"
                checked={
                  settings.show_old_price !== undefined
                    ? settings.show_old_price
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_old_price: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_old_price"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar preço antigo/tachado nos produtos
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_delivery_address_checkout"
                checked={
                  settings.show_delivery_address_checkout !== undefined
                    ? settings.show_delivery_address_checkout
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_delivery_address_checkout: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_delivery_address_checkout"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar endereço de entrega na confirmação do pedido
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_payment_method_checkout"
                checked={
                  settings.show_payment_method_checkout !== undefined
                    ? settings.show_payment_method_checkout
                    : true
                }
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    show_payment_method_checkout: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="show_payment_method_checkout"
                className="ml-2 block text-sm text-gray-900"
              >
                Mostrar método de pagamento na confirmação do pedido
              </label>
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações de Checkout
          </button>
        </div>

        {/* Gerenciamento de Marcas e Categorias */}
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Gerenciamento de Marcas e Categorias
          </h2>

          {/* Marcas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-gray-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Marcas</h3>
              </div>
            </div>

            {/* Adicionar nova marca */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Nome da marca"
                  className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={createBrand}
                  disabled={!newBrandName.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Marca
                </button>
              </div>
            </div>

            {/* Lista de marcas */}
            <div className="space-y-3">
              {brands.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma marca cadastrada ainda.
                </p>
              ) : (
                brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      {brand.logo_url && (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <div>
                        <span className="font-medium text-gray-900">
                          {brand.name}
                        </span>
                        {brand.commission_percentage > 0 && (
                          <span className="text-sm text-gray-600 ml-2">
                            Comissão: {brand.commission_percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBrand(brand.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Remover marca"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Categorias */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Tag className="h-6 w-6 text-gray-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Categorias
                </h3>
              </div>
            </div>

            {/* Adicionar nova categoria */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded"
                  />
                  <button
                    onClick={createCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Categoria
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de categorias */}
            <div className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma categoria cadastrada ainda.
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                        {category.description && (
                          <p className="text-sm text-gray-600">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Remover categoria"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gerenciamento de Imagens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Imagens de Produtos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload de imagens de produtos no bucket "produtos". As
                imagens são associadas aos produtos no cadastro.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Bucket:</strong> produtos
                <br />
                <strong>Uso:</strong> Imagens dos produtos no catálogo
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Logos de Marcas
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Faça upload dos logos das marcas no bucket "marcas". Os logos
                aparecem nas categorias do catálogo.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Bucket:</strong> marcas
                <br />
                <strong>Uso:</strong> Logos das marcas/categorias
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
