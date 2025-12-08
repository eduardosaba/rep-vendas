'use client';

import { useStore } from './store-context';
import { useState } from 'react';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Send,
  Loader2,
  Save,
  Copy,
  Lock,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  CheckCircle,
  ShoppingCart,
  Search,
  Maximize2,
  Star,
  Download,
  Share2,
} from 'lucide-react';
import { PriceDisplay } from './product-components';
import ProductImage from './ProductImage';

// Toast visual simples sem dependência de hooks/contexto
// Garante que os estilos do toast existam (executar somente no cliente)
const ensureToastStyles = () => {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
    document.head.appendChild(style);
  }
};

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  ensureToastStyles();
  // Cria um elemento toast simples
  if (typeof document === 'undefined') return; // proteção extra
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  // Remove após 3 segundos
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

// styles are injected on first client use via ensureToastStyles()

// Fallback simples para notificações sem depender de hooks/contexto
const notifyUser = (message: string, type: 'success' | 'error' = 'success') => {
  showToast(message, type);
};

export function StoreModals() {
  const {
    store,
    modals,
    setModal,
    cart,
    initialProducts,
    isPricesVisible,
    updateQuantity,
    removeFromCart,
    addToCart,
    loadingStates,
    handleSaveCart,
    handleFinalizeOrder,
    handleLoadCart,
    orderSuccessData,
    setOrderSuccessData,
    handleDownloadPDF,
    handleSendWhatsApp,
    unlockPrices,
  } = useStore();

  // Estados Locais
  const [passwordInput, setPasswordInput] = useState('');
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    cnpj: '',
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Helpers Visuais
  const getProductImages = (product: any) => {
    if (!product) return [];
    if (product.images && product.images.length > 0) return product.images;
    if (product.image_url) return [product.image_url];
    return [];
  };

  // Função Atualizada com Notificação
  const copyToClipboard = (text: string, message: string = 'Copiado!') => {
    navigator.clipboard.writeText(text);
    notifyUser(message, 'success');
  };

  // Wrapper para o Unlock com preventDefault
  const onUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPrices(passwordInput)) {
      setModal('password', false);
      notifyUser('Preços liberados!', 'success');
    } else {
      notifyUser('Senha incorreta', 'error');
    }
  };

  // Wrapper para salvar carrinho
  const onSaveCart = async () => {
    const code = await handleSaveCart();
    if (code) {
      setSavedCode(code);
      setModal('save', true);
    }
  };

  // Helper para renderizar Ficha Técnica
  const renderSpecs = (specs: string) => {
    try {
      if (specs.trim().startsWith('[')) {
        const rows = JSON.parse(specs);
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden text-sm mt-2">
            {rows.map((row: any, i: number) => (
              <div
                key={i}
                className="flex border-b border-gray-100 last:border-0"
              >
                <div className="w-1/3 bg-gray-50 p-2 font-semibold text-gray-700 border-r border-gray-100">
                  {row.key}
                </div>
                <div className="w-2/3 p-2 text-gray-600">{row.value}</div>
              </div>
            ))}
          </div>
        );
      }
    } catch (e) {
      // Ignora erro e renderiza como texto
    }
    return (
      <p className="whitespace-pre-wrap text-gray-600 text-sm leading-relaxed mt-2">
        {specs}
      </p>
    );
  };

  return (
    <>
      {/* --- MODAL CARRINHO --- */}
      {modals.cart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setModal('cart', false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <ShoppingCart size={20} /> Meu Carrinho
              </h2>
              <button
                onClick={() => setModal('cart', false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
                  <ShoppingCart size={48} className="mb-3 opacity-20" />
                  <p>Seu carrinho está vazio</p>
                  <button
                    onClick={() => setModal('cart', false)}
                    className="mt-4 px-6 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700"
                  >
                    Escolher produtos
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative"
                      >
                        <div className="h-16 w-16 bg-gray-50 rounded overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              className="w-full h-full object-contain"
                              alt={item.name}
                            />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.reference_code}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <PriceDisplay
                              value={item.price * item.quantity}
                              className="font-bold text-sm text-indigo-700"
                            />
                            <div className="flex items-center border rounded bg-white">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="px-2 py-0.5 hover:bg-gray-50"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-bold w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="px-2 py-0.5 hover:bg-gray-50"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="absolute top-2 right-2 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Upsell Area */}
                  <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Star
                        size={14}
                        className="text-yellow-500 fill-yellow-500"
                      />{' '}
                      Aproveite também
                    </h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {initialProducts
                        .filter(
                          (p) =>
                            p.is_best_seller && !cart.find((c) => c.id === p.id)
                        )
                        .slice(0, 3)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="min-w-[130px] w-[130px] bg-white border border-gray-200 rounded-xl p-2 flex flex-col shadow-sm"
                          >
                            <div className="h-24 w-full bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                              {p.image_url && (
                                <img
                                  src={p.image_url}
                                  className="h-full object-contain"
                                />
                              )}
                            </div>
                            <p className="text-xs font-medium truncate mb-1 text-gray-800">
                              {p.name}
                            </p>
                            <PriceDisplay
                              value={p.price}
                              className="text-xs font-bold text-green-600"
                            />
                            <button
                              onClick={() => addToCart(p)}
                              className="rv-btn-outline mt-2 w-full py-1.5 text-xs font-bold rounded-lg hover:bg-white transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rodapé Carrinho */}
            {cart.length > 0 && (
              <div className="p-4 border-t bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 font-medium">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {isPricesVisible
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(cartTotal)
                      : 'R$ ***'}
                  </span>
                </div>
                <button
                  onClick={() => setModal('checkout', true)}
                  className="rv-btn-primary w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm transition-all"
                >
                  <Send size={18} /> Finalizar Compra
                </button>
                <button
                  onClick={onSaveCart}
                  disabled={loadingStates.saving}
                  className="w-full mt-2 py-2 text-sm text-indigo-600 hover:underline flex justify-center gap-1 items-center"
                >
                  {loadingStates.saving ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  Salvar para depois
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DETALHES DO PRODUTO --- */}
      {modals.product && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setModal('product', null)}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* Botões Flutuantes (Fechar + Share) */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => {
                  let baseUrl = window.location.href.split('?')[0];
                  if (baseUrl.includes('/dashboard')) {
                    const slug = store.name.toLowerCase().replace(/\s+/g, '-');
                    baseUrl = `${window.location.origin}/catalog/${slug}`;
                  }
                  const url = `${baseUrl}?productId=${modals.product?.id}`;
                  copyToClipboard(url, 'Link do produto copiado!');
                }}
                className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-500 hover:text-indigo-600 transition-colors shadow-sm"
                title="Copiar Link Direto"
              >
                <Share2 size={20} />
              </button>

              <button
                onClick={() => setModal('product', null)}
                className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Galeria */}
            <div className="w-full md:w-1/2 bg-white relative flex flex-col p-6 border-r border-gray-100">
              <div className="flex-1 relative flex items-center justify-center overflow-hidden h-[300px] md:h-auto">
                {getProductImages(modals.product).length > 0 ? (
                  <ProductImage
                    product={{
                      external_image_url: getProductImages(modals.product)[
                        currentImageIndex
                      ],
                    }}
                    alt={modals.product?.name}
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setModal('zoom', true)}
                  />
                ) : (
                  <div className="text-gray-300 flex flex-col items-center gap-2">
                    <Search size={48} />
                    <span className="text-sm">Sem imagem</span>
                  </div>
                )}
                {getProductImages(modals.product).length > 0 && (
                  <button
                    onClick={() => setModal('zoom', true)}
                    className="absolute bottom-4 right-4 p-2 bg-white/90 rounded-lg shadow text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <Maximize2 size={20} />
                  </button>
                )}
              </div>
              {/* Miniaturas */}
              {getProductImages(modals.product).length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto justify-center py-2">
                  {getProductImages(modals.product).map(
                    (img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-14 h-14 rounded border overflow-hidden transition-all ${currentImageIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-600/30' : 'border-gray-200 hover:border-gray-400'}`}
                      >
                        <ProductImage
                          product={{ external_image_url: img }}
                          className="w-full h-full object-cover"
                          alt={`thumb-${idx}`}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Informações */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar bg-white">
              <div className="mb-1">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded">
                  {modals.product?.brand || 'Genérico'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
                {modals.product?.name}
              </h2>
              <span className="text-xs text-gray-400 font-mono mb-2 block">
                Ref: {modals.product?.reference_code}
                {modals.product?.sku && ` • SKU: ${modals.product.sku}`}
              </span>

              {/* Exibir Cor se existir */}
              {modals.product?.color && (
                <div className="mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Cor / Variante
                  </span>
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-700 border border-gray-200">
                    {modals.product.color}
                  </span>
                </div>
              )}

              <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">
                  Preço Unitário
                </span>
                <PriceDisplay
                  value={modals.product?.price || 0}
                  size="large"
                  className="font-bold text-gray-900"
                />
              </div>

              <div className="space-y-6 mb-8 flex-1">
                {/* Descrição */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <FileText size={16} className="text-indigo-500" /> Descrição
                  </h4>
                  {modals.product?.description &&
                    modals.product.description.trim() !== '' && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {modals.product.description}
                      </p>
                    )}
                </div>

                {/* Ficha Técnica */}
                {modals.product?.technical_specs && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide border-t pt-4 border-gray-100">
                      Ficha Técnica
                    </h4>
                    {renderSpecs(modals.product.technical_specs)}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  onClick={() => {
                    addToCart(modals.product!);
                    setModal('product', null);
                  }}
                  className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <ShoppingCart size={22} /> Adicionar ao Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ZOOM (LIGHTBOX) --- */}
      {modals.zoom && modals.product && (
        <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center">
          <button
            onClick={() => setModal('zoom', false)}
            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full z-20 hover:bg-gray-200"
          >
            <X size={24} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center p-4 md:p-10">
            {getProductImages(modals.product).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev === 0
                      ? getProductImages(modals.product!).length - 1
                      : prev - 1
                  );
                }}
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-gray-100/80 hover:bg-gray-200 rounded-full text-gray-800 z-10 transition-all"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getProductImages(modals.product)[currentImageIndex]}
              className="max-w-full max-h-full object-contain select-none"
              alt="Zoom"
            />

            {getProductImages(modals.product).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev === getProductImages(modals.product!).length - 1
                      ? 0
                      : prev + 1
                  );
                }}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-gray-100/80 hover:bg-gray-200 rounded-full text-gray-800 z-10 transition-all"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {getProductImages(modals.product).length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm font-medium">
              {currentImageIndex + 1} /{' '}
              {getProductImages(modals.product).length}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL SENHA --- */}
      {modals.password && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('password', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4 text-center text-gray-900">
              Área Restrita
            </h3>
            <form onSubmit={onUnlock}>
              <input
                type="password"
                autoFocus
                placeholder="Senha"
                className="w-full p-3 border rounded-lg mb-4 text-center outline-none focus:border-indigo-500"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <button className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold">
                Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CARREGAR --- */}
      {modals.load && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('load', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2 text-gray-900">
              Recuperar Carrinho
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await handleLoadCart(loadCodeInput))
                  setModal('load', false);
              }}
            >
              <input
                autoFocus
                placeholder="Código (ex: K9P-2X4)"
                className="w-full p-3 border rounded-lg mb-4 text-center uppercase font-bold tracking-widest outline-none focus:border-indigo-500"
                value={loadCodeInput}
                onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
              />
              <button
                disabled={loadingStates.loadingCart}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold"
              >
                {loadingStates.loadingCart ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  'Carregar'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL SALVAR SUCESSO --- */}
      {modals.save && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('save', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <Save size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2 text-gray-900">
              Salvo com Sucesso!
            </h3>
            <div className="bg-gray-100 p-3 rounded-lg mb-4 border border-gray-200 flex items-center gap-2 justify-center">
              <code className="text-xl font-bold tracking-widest text-gray-800">
                {savedCode}
              </code>
              <button onClick={() => copyToClipboard(savedCode || '')}>
                <Copy
                  size={18}
                  className="text-gray-400 hover:text-indigo-600"
                />
              </button>
            </div>
            <button
              onClick={() => setModal('save', false)}
              className="w-full py-2 bg-gray-800 text-white rounded-lg font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL CHECKOUT --- */}
      {modals.checkout && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('checkout', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4 text-gray-900">
              Finalizar Compra
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Nome</label>
                <input
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">
                  WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">Email</label>
                <input
                  required
                  type="email"
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">
                  CPF/CNPJ
                </label>
                <input
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                  value={customerInfo.cnpj}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, cnpj: e.target.value })
                  }
                />
              </div>
              <button
                onClick={() => handleFinalizeOrder(customerInfo)}
                disabled={loadingStates.submitting}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:brightness-105 flex justify-center"
              >
                {loadingStates.submitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Confirmar e Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL SUCESSO FINAL (PDF) --- */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pedido #{orderSuccessData.id} Confirmado!
            </h2>
            <p className="text-gray-500 mb-8">
              Obrigado, {orderSuccessData.customer.name}.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
              >
                <Download size={24} /> Baixar Pedido em PDF
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-all flex items-center justify-center gap-2"
              >
                <Send size={20} /> Enviar via WhatsApp
              </button>
              <button
                onClick={() => setOrderSuccessData(null)}
                className="block w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
