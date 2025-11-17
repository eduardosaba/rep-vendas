"use client";

import { useRouter } from "next/navigation";
import { Search, Heart, ShoppingCart, LogIn } from "lucide-react";
import { Settings } from "../../lib/types";

interface CatalogHeaderProps {
  settings: Settings | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  cart: { [key: string]: number };
  favorites: Set<string>;
  userId: string;
}

export const CatalogHeader: React.FC<CatalogHeaderProps> = ({
  settings,
  searchTerm,
  onSearchChange,
  cart,
  favorites,
  userId,
}) => {
  const router = useRouter();

  return (
    <header
      className="bg-white border-b border-gray-200"
      style={{ backgroundColor: settings?.header_color || "#FFFFFF" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div
          className="flex items-center justify-between py-2 text-sm"
          style={{ color: settings?.icon_color || "#4B5563" }}
        >
          <div className="flex items-center space-x-4">
            {settings?.phone && (
              <>
                <span>📞 {settings.phone}</span>
                {settings?.email && <span>|</span>}
              </>
            )}
            {settings?.email && <span>✉️ {settings.email}</span>}
          </div>
        </div>

        {/* Main Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-14 w-auto" />
            ) : (
              <h1
                className="text-2xl font-bold text-gray-900"
                style={{
                  color: settings?.title_color || "#111827",
                  fontFamily: settings?.font_family || "Inter, sans-serif",
                }}
              >
                {settings?.name || "Rep-Vendas"}
              </h1>
            )}
          </div>

          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                style={{
                  backgroundColor: settings?.primary_color || "#3B82F6",
                }}
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push("/favorites")}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || "#4B5563" }}
            >
              <Heart className="h-6 w-6" />
              <span className="text-xs">Favoritos ({favorites.size})</span>
            </button>
            <button
              onClick={() => router.push(`/catalog/${userId}/checkout`)}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || "#4B5563" }}
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-xs">
                Carrinho (
                {Object.values(cart).reduce((total, qty) => total + qty, 0)})
              </span>
            </button>
            <button
              onClick={() => router.push("/login")}
              className="flex flex-col items-center text-gray-600 hover:text-gray-900"
              style={{ color: settings?.icon_color || "#4B5563" }}
            >
              <LogIn className="h-6 w-6" />
              <span className="text-xs">Entrar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
