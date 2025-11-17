"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Settings } from "@/lib/types";
import { useToast } from "@/hooks/useToast";

export default function SettingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<Settings>>({
    name: "",
    email: "",
    phone: "",
    price_access_password: "123456",
    primary_color: "#3B82F6",
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
  });

  // Carregar configurações existentes
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      addToast({
        title: "Erro",
        message: "Não foi possível carregar as configurações.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("settings")
        .upsert({
          ...settings,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      addToast({
        title: "Sucesso!",
        message: "Configurações salvas com sucesso.",
        type: "success",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      addToast({
        title: "Erro",
        message: "Não foi possível salvar as configurações.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Informações Gerais
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  id="name"
                  value={settings.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={settings.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={settings.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">
                  Cor Primária
                </label>
                <input
                  type="color"
                  id="primary_color"
                  value={settings.primary_color || "#3B82F6"}
                  onChange={(e) => handleInputChange("primary_color", e.target.value)}
                  className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Segurança e Acesso
              </h2>

              <div className="max-w-md">
                <label htmlFor="price_access_password" className="block text-sm font-medium text-gray-700">
                  Senha para Visualizar Preços
                </label>
                <input
                  type="password"
                  id="price_access_password"
                  value={settings.price_access_password || "123456"}
                  onChange={(e) => handleInputChange("price_access_password", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite a senha de acesso aos preços"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Esta senha será solicitada aos visitantes para visualizar os preços dos produtos.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Exibição de Elementos
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: "show_shipping", label: "Mostrar frete" },
                  { key: "show_installments", label: "Mostrar parcelas" },
                  { key: "show_delivery_address", label: "Mostrar endereço de entrega" },
                  { key: "show_installments_checkout", label: "Parcelas no checkout" },
                  { key: "show_discount", label: "Mostrar desconto" },
                  { key: "show_old_price", label: "Mostrar preço antigo" },
                  { key: "show_filter_price", label: "Filtro de preço" },
                  { key: "show_filter_category", label: "Filtro de categoria" },
                  { key: "show_filter_bestseller", label: "Filtro de bestsellers" },
                  { key: "show_filter_new", label: "Filtro de lançamentos" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={key}
                      checked={settings[key as keyof Settings] as boolean || false}
                      onChange={(e) => handleInputChange(key as keyof Settings, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
