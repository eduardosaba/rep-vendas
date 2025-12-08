'use client';

import { useState } from 'react';
import { useStore } from './store-context';
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
} from 'lucide-react';
import { PriceDisplay } from './product-components';
import ProductImage from './ProductImage';

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

  // Estados Locais para os Formulários dos Modais
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

  // Cálculos Auxiliares
  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Helpers
  const getProductImages = (product: any) => {
    if (product.images && product.images.length > 0) return product.images;
    if (product.image_url) return [product.image_url];
    return [];
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Código copiado!');
  };

  // Wrapper para salvar carrinho e pegar o código localmente
  const onSaveCart = async () => {
    const code = await handleSaveCart();
    if (code) {
      setSavedCode(code);
      setModal('save', true);
    }
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
            {/* Header Carrinho */}
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

            {/* Lista de Itens */}
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
                            <ProductImage
                              product={{ external_image_url: item.image_url }}
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

                  {/* Upsell (Produtos Sugeridos) */}
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
                                <ProductImage
                                  product={{ external_image_url: p.image_url }}
                                  className="h-full object-contain"
                                  alt={p.name}
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
                              className="mt-2 w-full py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
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
                  className="w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 shadow-sm transition-all"
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
            <button
              onClick={() => setModal('product', null)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500"
            >
              <X size={20} />
            </button>

            {/* Galeria */}
            <div className="w-full md:w-1/2 bg-white relative flex flex-col p-6 border-r border-gray-100">
              <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {getProductImages(modals.product).length > 0 ? (
                  <ProductImage
                    product={{
                      external_image_url: getProductImages(modals.product)[
                        currentImageIndex
                      ],
                    }}
                    alt={modals.product.name}
                    className="max-h-[300px] md:max-h-[400px] w-auto object-contain cursor-zoom-in"
                    onClick={() => setModal('zoom', true)}
                  />
                ) : (
                  <div className="text-gray-300">
                    <Search size={64} />
                  </div>
                )}
              </div>
              {getProductImages(modals.product).length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto justify-center">
                  {getProductImages(modals.product).map(
                    (img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-14 h-14 rounded border overflow-hidden ${currentImageIndex === idx ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-200'}`}
                      >
                        <ProductImage
                          product={{ external_image_url: img }}
                          className="w-full h-full object-contain"
                          alt={`thumb-${idx}`}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Informações */}
            <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto bg-white">
              <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">
                {modals.product.brand || 'Genérico'}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-2">
                {modals.product.name}
              </h2>
              <span className="text-xs text-gray-400 font-mono mb-6 block">
                Ref: {modals.product.reference_code}
              </span>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <PriceDisplay
                  value={modals.product.price}
                  size="large"
                  className="font-bold text-gray-900"
                />
              </div>

              <div className="prose prose-sm text-gray-600 mb-8 flex-1 custom-scrollbar pr-2">
                <h4 className="font-bold text-gray-900 mb-2">Descrição</h4>
                {modals.product.description &&
                  modals.product.description.trim() !== '' && (
                    <p>{modals.product.description}</p>
                  )}

                {/* Renderiza Ficha Técnica se existir */}
                {modals.product.technical_specs && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-2">
                      Ficha Técnica
                    </h4>
                    {/* Detecta se é JSON (tabela) ou Texto */}
                    {modals.product.technical_specs.startsWith('[') ? (
                      <div className="text-xs">
                        {JSON.parse(modals.product.technical_specs).map(
                          (row: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between py-1 border-b border-gray-100 last:border-0"
                            >
                              <span className="font-semibold text-gray-700">
                                {row.key}
                              </span>
                              <span className="text-gray-600">{row.value}</span>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        {modals.product.technical_specs}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  addToCart(modals.product!);
                  setModal('product', null);
                }}
                className="w-full py-3.5 rounded-lg bg-green-600 text-white font-bold text-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <ShoppingCart size={20} /> Comprar Agora
              </button>
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
            <h3 className="font-bold text-lg mb-4 text-center">
              Área Restrita
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (unlockPrices(passwordInput)) setModal('password', false);
              }}
            >
              <input
                type="password"
                autoFocus
                placeholder="Senha"
                className="w-full p-3 border rounded-lg mb-4 text-center"
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
            <h3 className="font-bold text-lg mb-4">Finalizar Compra</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Nome</label>
                <input
                  required
                  className="w-full p-2 border rounded"
                  placeholder="Seu nome"
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
                  className="w-full p-2 border rounded"
                  placeholder="(00) 00000-0000"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                />
              </div>
              <button
                onClick={() => handleFinalizeOrder(customerInfo)}
                disabled={loadingStates.submitting}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
              >
                {loadingStates.submitting ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  'Confirmar e Enviar'
                )}
              </button>
            </div>
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
            <h3 className="font-bold text-lg mb-2">Recuperar Carrinho</h3>
            <div className="space-y-4">
              <input
                autoFocus
                placeholder="Código (ex: K9P-2X4)"
                className="w-full p-3 border rounded-lg mb-4 text-center uppercase font-bold tracking-widest"
                value={loadCodeInput}
                onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
              />
              <button
                onClick={async () => {
                  if (await handleLoadCart(loadCodeInput))
                    setModal('load', false);
                }}
                disabled={loadingStates.loadingCart}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold flex justify-center gap-2"
              >
                {loadingStates.loadingCart ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Carregar <Download size={18} />
                  </>
                )}
              </button>
            </div>
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
            <h3 className="font-bold text-lg mb-2">Orçamento Salvo!</h3>
            <div className="bg-gray-100 p-3 rounded-lg mb-4 border border-gray-200 flex items-center gap-2 justify-center">
              <code className="text-xl font-bold tracking-widest">
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

      {/* --- MODAL SUCESSO CHECKOUT --- */}
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
                <FileText size={24} /> Baixar Pedido em PDF
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
