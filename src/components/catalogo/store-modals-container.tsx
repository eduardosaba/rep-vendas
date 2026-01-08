'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from './store-context';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Send,
  Download,
  CheckCircle,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Search,
  Package,
  Heart,
  Zap,
  Star,
} from 'lucide-react';
import { SaveCodeModal, LoadCodeModal } from './modals/SaveLoadModals';
import { PriceDisplay } from './PriceDisplay';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import Barcode from '../ui/Barcode';
import { toast } from 'sonner';
import { PasswordModal } from './modals/PasswordModal';

export function StoreModals() {
  const {
    store,
    modals,
    setModal,
    cart,
    updateQuantity,
    removeFromCart,
    addToCart,
    handleSaveCart,
    handleLoadCart,
    handleFinalizeOrder,
    loadingStates,
    orderSuccessData,
    setOrderSuccessData,
    handleSendWhatsApp,
    isPricesVisible,
    displayProducts,
    customerSession,
    clearCustomerSession,
    toggleFavorite,
    favorites,
    unlockPrices,
  } = useStore();

  // --- ESTADOS LOCAIS ---
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [passwordInput, setPasswordInput] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    cnpj: '',
  });
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  // --- PERSISTÊNCIA DE DADOS DO CLIENTE ---
  useEffect(() => {
    if (customerSession) {
      setCustomerInfo({
        name: customerSession.name || '',
        phone: customerSession.phone || '',
        email: customerSession.email || '',
        cnpj: customerSession.cnpj || '',
      });
    }
  }, [customerSession]);

  // --- MEMOIZAÇÕES ---
  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const productImages = useMemo(() => {
    if (!modals.product) return [];
    const images: string[] = [];
    if (modals.product.image_url) images.push(modals.product.image_url);
    if (modals.product.external_image_url)
      images.push(modals.product.external_image_url);
    if (modals.product.images && Array.isArray(modals.product.images)) {
      modals.product.images.forEach((img) => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    return images.length > 0 ? images : ['/placeholder-no-image.svg'];
  }, [modals.product]);

  // Reset ao trocar de produto
  useEffect(() => {
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [modals.product]);

  // --- HANDLERS ---
  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleFinalizeOrder(customerInfo);
    if (success) setModal('checkout', false);
  };

  const onGeneratePDF = () => {
    if (orderSuccessData?.pdf_url) {
      window.open(orderSuccessData.pdf_url, '_blank');
    } else {
      toast.error('Comprovante não disponível.');
    }
  };

  const copyToClipboard = (text: string, message: string = 'Copiado!') => {
    try {
      navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const onSaveCart = async () => {
    const code = await handleSaveCart();
    if (code) {
      setSavedCode(code);
      setModal('save', true);
      toast.success('Carrinho salvo!');
    }
  };

  return (
    <>
      {/* --- MODAL CARRINHO (SIDEBAR) --- */}
      {modals.cart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setModal('cart', false)}
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-secondary">
                <ShoppingCart size={24} className="text-primary" /> Meu Carrinho
              </h2>
              <button
                onClick={() => setModal('cart', false)}
                className="rounded-xl p-2 hover:bg-gray-100 text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400 opacity-30">
                  <ShoppingCart size={80} strokeWidth={1} />
                  <p className="font-bold text-lg mt-4 text-center">
                    O carrinho está vazio.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex gap-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                      <Image
                        src={item.image_url || '/placeholder-no-image.svg'}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-center pr-6">
                      <p className="text-sm font-black text-secondary line-clamp-1">
                        {item.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <PriceDisplay
                          value={item.price * item.quantity}
                          className="text-primary font-black text-base"
                          isPricesVisible={isPricesVisible}
                        />
                        <div className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:text-primary"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:text-primary"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="absolute right-2 top-2 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t bg-white p-6 space-y-4">
                <div className="flex items-center justify-between text-xl font-black text-secondary">
                  <span>Subtotal</span>
                  <PriceDisplay
                    value={cartTotal}
                    isPricesVisible={isPricesVisible}
                  />
                </div>
                <Button
                  onClick={() => setModal('checkout', true)}
                  className="w-full py-7 text-lg shadow-xl shadow-primary/20"
                >
                  Finalizar Pedido <Send size={20} className="ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={onSaveCart}
                  isLoading={loadingStates.saving}
                  className="w-full text-primary"
                >
                  Salvar para depois
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modais Externos */}
      <SaveCodeModal
        isSaveModalOpen={!!modals.save && !!savedCode}
        setIsModalOpen={(v: boolean) => setModal('save', v)}
        savedCode={savedCode}
        copyToClipboard={() => savedCode && copyToClipboard(savedCode)}
      />

      <LoadCodeModal
        isLoadModalOpen={!!modals.load}
        setIsModalOpen={(v: boolean) => setModal('load', v)}
        loadCodeInput={loadCodeInput}
        setLoadCodeInput={setLoadCodeInput}
        handleLoadCart={async (e) => {
          e.preventDefault();
          const ok = await handleLoadCart(loadCodeInput);
          if (ok) {
            toast.success('Carrinho carregado!');
            setModal('load', false);
          } else {
            toast.error('Código inválido.');
          }
        }}
        isLoadingCart={loadingStates.loadingCart}
      />

      <PasswordModal
        isPasswordModalOpen={!!modals.password}
        setIsPasswordModalOpen={(v: boolean) => setModal('password', v)}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handleUnlockPrices={async (e) => {
          e.preventDefault();
          const ok = await unlockPrices(passwordInput);
          if (ok) {
            toast.success('Preços desbloqueados');
            setModal('password', false);
          } else {
            toast.error('Senha incorreta');
          }
        }}
      />

      {/* --- MODAL DETALHES DO PRODUTO (IMERSIVO) --- */}
      {modals.product &&
        (() => {
          // Debug (CORRIGIDO)
          console.log('Produto no modal:', {
            id: modals.product.id,
            name: modals.product.name,
          });

          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-[#0d1b2c]/90 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={() => setModal('product', null)}
              />

              <div className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
                {/* Botão Fechar */}
                <button
                  onClick={() => setModal('product', null)}
                  className="absolute right-6 top-6 z-50 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all"
                >
                  <X size={24} />
                </button>

                {/* Left: Imagens */}
                <div className="md:w-1/2 relative bg-white dark:bg-slate-800 p-8 flex flex-col items-center justify-center">
                  <div
                    className="relative w-full aspect-square group cursor-zoom-in"
                    onClick={() => setIsImageZoomOpen(true)}
                  >
                    <Image
                      src={productImages[currentImageIndex]}
                      alt={modals.product.name}
                      fill
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                    <button className="absolute right-4 bottom-4 p-3 rounded-full bg-white/90 shadow-lg">
                      <Search size={20} />
                    </button>
                  </div>

                  {productImages.length > 1 && (
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
                      {productImages.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-20 h-20 rounded-xl border-2 transition-all ${currentImageIndex === idx ? 'border-primary' : 'border-transparent'}`}
                        >
                          <img
                            src={src}
                            className="w-full h-full object-contain p-1"
                            alt="thumb"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Detalhes */}
                <div className="md:w-1/2 p-10 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-slate-900">
                  <span className="text-xs font-black uppercase tracking-widest text-primary mb-2 block">
                    {modals.product.brand || 'Original'}
                  </span>
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <h2 className="text-4xl font-black text-secondary dark:text-white leading-tight">
                      {modals.product.name}
                    </h2>
                    <button
                      onClick={() => toggleFavorite(modals.product!.id)}
                      className="p-4 rounded-full bg-white shadow-sm"
                    >
                      <Heart
                        size={24}
                        className={
                          favorites.includes(modals.product.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-300'
                        }
                      />
                    </button>
                  </div>

                  <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    {modals.product.description ||
                      'Nenhuma descrição disponível.'}
                  </p>

                  {/* Ficha Técnica (Lógica Corrigida) */}
                  {(modals.product as any).technical_specs &&
                    (() => {
                      let specs = (modals.product as any).technical_specs;
                      if (typeof specs === 'string') {
                        try {
                          specs = JSON.parse(specs);
                        } catch {
                          /* manter string */
                        }
                      }

                      const isObj =
                        typeof specs === 'object' &&
                        specs !== null &&
                        !Array.isArray(specs);

                      return (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 mb-8">
                          <h3 className="text-sm font-bold mb-4">
                            Ficha Técnica
                          </h3>
                          {isObj ? (
                            <table className="w-full text-sm">
                              <tbody>
                                {Object.entries(specs).map(([k, v], i) => (
                                  <tr
                                    key={i}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-3 font-bold text-gray-500 w-1/3">
                                      {k}
                                    </td>
                                    <td className="py-3">{String(v)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-sm">{String(specs)}</p>
                          )}
                        </div>
                      );
                    })()}

                  {/* Footer de Compra */}
                  <div className="mt-auto bg-secondary p-8 rounded-[2.5rem] text-white space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="font-bold opacity-60">Quantidade</span>
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-2">
                        <button
                          onClick={() =>
                            setDetailQuantity((q) => Math.max(1, q - 1))
                          }
                        >
                          <Minus />
                        </button>
                        <span className="text-xl font-black">
                          {detailQuantity}
                        </span>
                        <button onClick={() => setDetailQuantity((q) => q + 1)}>
                          <Plus />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-4">
                      <span className="font-bold">Subtotal</span>
                      <PriceDisplay
                        value={modals.product.price * detailQuantity}
                        isPricesVisible={isPricesVisible}
                        size="large"
                        className="text-white"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        addToCart(modals.product!, detailQuantity);
                        setModal('product', null);
                      }}
                      className="w-full py-8 text-xl"
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                </div>
              </div>

              {/* Zoom Overlay */}
              {isImageZoomOpen && (
                <div
                  className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
                  onClick={() => setIsImageZoomOpen(false)}
                >
                  <img
                    src={productImages[currentImageIndex]}
                    className="max-w-full max-h-full object-contain"
                    alt="Zoom"
                  />
                  <button className="absolute top-10 right-10 text-white">
                    <X size={40} />
                  </button>
                </div>
              )}
            </div>
          );
        })()}

      {/* --- MODAL CHECKOUT --- */}
      {modals.checkout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md"
            onClick={() => setModal('checkout', false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8">Identificação</h2>
            <form onSubmit={onFinalize} className="space-y-4">
              <input
                required
                className="w-full p-4 bg-gray-50 rounded-2xl"
                placeholder="Nome"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
              />
              <input
                required
                className="w-full p-4 bg-gray-50 rounded-2xl"
                placeholder="WhatsApp"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
              />
              <input
                required
                className="w-full p-4 bg-gray-50 rounded-2xl"
                placeholder="Email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
              />
              <Button
                type="submit"
                isLoading={loadingStates.submitting}
                className="w-full py-6"
              >
                Confirmar Pedido
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- SUCESSO --- */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md" />
          <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] p-12 text-center shadow-2xl">
            <div className="mx-auto mb-6 w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-3xl font-black mb-2">Pedido Enviado!</h2>
            <p className="text-gray-500 mb-8">
              Obrigado, {orderSuccessData.customer.name}!
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSendWhatsApp}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black"
              >
                Confirmar no WhatsApp
              </button>
              <button
                onClick={() => {
                  setOrderSuccessData(null);
                  setModal('cart', false);
                }}
                className="w-full py-4 bg-secondary text-white rounded-2xl font-bold"
              >
                Voltar à Loja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
