"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Star,
  Truck,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  image_url?: string;
}

interface Settings {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  header_color?: string;
  font_family?: string;
  title_color?: string;
  icon_color?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Cart() {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadCart();
    loadSettings();
  }, []);

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      loadCartItems();
    } else {
      setCartItems([]);
      setLoading(false);
    }
  }, [cart]);

  const loadCart = () => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      setLoading(false);
    }
  };

  const loadCartItems = async () => {
    const productIds = Object.keys(cart);
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (products) {
      const items: CartItem[] = products.map((product) => ({
        product,
        quantity: cart[product.id] || 0,
      }));
      setCartItems(items);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data: sets } = await supabase.from("settings").select("*").limit(1);
    if (sets && sets.length > 0) {
      setSettings(sets[0]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = { ...cart };
    newCart[productId] = newQuantity;
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    setCartItems((prev) =>
      prev.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart({});
    setCartItems([]);
    localStorage.removeItem("cart");
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  const getTotalValue = () => {
    return cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando carrinho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header
        className="bg-white border-b border-gray-200"
        style={{ backgroundColor: settings?.header_color || "#FFFFFF" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </button>
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="h-14 w-auto"
                />
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900"
                  style={{
                    color: settings?.title_color || "#111827",
                    fontFamily: settings?.font_family || "Inter, sans-serif",
                  }}
                >
                  Rep-Vendas
                </h1>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push("/cart")}
                className="flex flex-col items-center text-blue-600"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="text-xs">Carrinho ({getTotalItems()})</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Carrinho de Compras
          </h1>
          <p className="text-gray-600">
            {cartItems.length === 0
              ? "Seu carrinho está vazio."
              : `${getTotalItems()} produto${getTotalItems() > 1 ? "s" : ""} no carrinho`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Carrinho vazio
            </h3>
            <p className="text-gray-600 mb-6">
              Adicione produtos ao seu carrinho para continuar comprando!
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: settings?.primary_color || "#3B82F6" }}
            >
              Continuar Comprando
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">
                      Itens do Carrinho
                    </h2>
                    <button
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Limpar Carrinho
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 flex-shrink-0">
                          {item.product.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">
                                Sem imagem
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.product.brand || "Marca"}
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            R$ {item.product.price.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                )
                              }
                              className="p-2 hover:bg-gray-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-3 py-2 text-center min-w-[3rem]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                )
                              }
                              className="p-2 hover:bg-gray-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            R$ {(item.product.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Resumo do Pedido
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Subtotal ({getTotalItems()} itens)
                    </span>
                    <span className="text-gray-900">
                      R$ {getTotalValue().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frete</span>
                    <span className="text-green-600">Grátis</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-medium">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        R$ {getTotalValue().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mb-3"
                  style={{
                    backgroundColor: settings?.primary_color || "#3B82F6",
                  }}
                >
                  Finalizar Pedido
                </button>

                <button
                  onClick={() => router.push("/")}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Continuar Comprando
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Truck className="h-4 w-4 mr-2" />
                    <span>Frete grátis para todo o Brasil</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-2" />
                    <span>Garantia de satisfação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
