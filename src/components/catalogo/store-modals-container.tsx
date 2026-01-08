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
  } = useStore();
  const { unlockPrices } = useStore();

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

  // --- PERSISTÊNCIA DE DADOS DO CLIENTE (AUTO-FILL) ---
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

  const relatedProducts = useMemo(() => {
    if (!modals.product) return [];
    return displayProducts
      .filter(
        (p) =>
          p.category === modals.product?.category && p.id !== modals.product?.id
      )
      .slice(0, 4);
  }, [modals.product, displayProducts]);

  // Reset ao trocar de produto
  useEffect(() => {
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [modals.product]);

  // --- HANDLERS ---
  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleFinalizeOrder(customerInfo);
    if (success) {
      setModal('checkout', false);
    }
  };

  const onGeneratePDF = () => {
    if (orderSuccessData?.pdf_url) {
      window.open(orderSuccessData.pdf_url, '_blank');
    } else {
      toast.error('Comprovante não disponível no momento.');
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
    } else {
      toast.error('Erro ao salvar o carrinho.');
    }
  };

  const handleLoadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadCodeInput) return;
    const ok = await handleLoadCart(loadCodeInput);
    if (ok) {
      toast.success('Carrinho carregado com sucesso!');
      setModal('load', false);
    } else {
      toast.error('Código não encontrado ou erro de conexão.');
    }
  };

  // --- MODAL DE SENHA (para mostrar preços) ---
  const handleUnlockPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return toast.error('Digite a senha');
    try {
      const ok = await unlockPrices(passwordInput);
      if (ok) {
        toast.success('Preços desbloqueados');
        setModal('password', false);
      } else {
        toast.error('Senha inválida');
      }
    } catch (err) {
      console.error('Erro ao validar senha', err);
      toast.error('Erro ao validar senha');
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
                    O carrinho está pronto <br /> para o seu primeiro item.
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
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="absolute right-2 top-2 text-gray-300 hover:text-red-500 transition-colors"
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

      {/* Save / Load Modals (external components) */}
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
        handleLoadCart={async (e: React.FormEvent) => {
          e.preventDefault();
          if (!loadCodeInput) return;
          try {
            const ok = await handleLoadCart(loadCodeInput);
            if (ok) {
              toast.success('Carrinho carregado com sucesso!');
              setModal('load', false);
            } else {
              toast.error('Código não encontrado ou erro de conexão.');
            }
          } catch (err) {
            console.error('Erro ao carregar carrinho', err);
            toast.error('Erro ao carregar carrinho');
          }
        }}
        isLoadingCart={loadingStates.loadingCart}
      />

      {/* --- MODAL SENHA (Ver Preços) --- */}
      <PasswordModal
        isPasswordModalOpen={!!modals.password}
        setIsPasswordModalOpen={(v: boolean) => setModal('password', v)}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handleUnlockPrices={async (e: React.FormEvent) => {
          e.preventDefault();
          if (!passwordInput) return toast.error('Digite a senha');
          try {
            const ok = await unlockPrices(passwordInput);
            if (ok) {
              toast.success('Preços desbloqueados');
              setModal('password', false);
            } else {
              toast.error('Senha inválida');
            }
          } catch (err) {
            console.error('Erro ao validar senha', err);
            toast.error('Erro ao validar senha');
          }
        }}
      />

      {/* --- MODAL DETALHES DO PRODUTO (IMERSIVO) --- */}
      {modals.product &&
        (() => {
          // Debug: Verificar dados do produto
          console.log('Produto no modal:', {
            id: modals.product.id,
            name: modals.product.name,
            is_launch: (modals.product as any)?.is_launch,
            is_best_seller: (modals.product as any)?.is_best_seller,
            bestseller: (modals.product as any)?.bestseller,
                    {(modals.product as any)?.technical_specs &&
                      (() => {
                        let specsRaw: any = (modals.product as any).technical_specs;
                        let specs: any = specsRaw;

                        const tryParse = (s: string) => {
                          try {
                            return JSON.parse(s);
                          } catch (e) {
                            try {
                              // tentativa com aspas duplas (algumas entradas usam aspas simples)
                              return JSON.parse(s.replace(/'/g, '"'));
                            } catch (e2) {
                              return null;
                            }
                          }
                        };

                        // Se for string, tenta parsear JSON (caso esteja serializado)
                        if (typeof specs === 'string') {
                          const parsed = tryParse(specs);
                          if (parsed !== null) specs = parsed;
                        }

                        // Se for array, tentamos normalizar para objeto
                        if (Array.isArray(specs)) {
                          const arr = specs;

                          // Caso: [['key','value'], ...]
                          if (arr.length > 0 && Array.isArray(arr[0]) && arr[0].length >= 2) {
                            const obj: Record<string, any> = {};
                            arr.forEach((pair: any) => {
                              if (!Array.isArray(pair) || pair.length < 2) return;
                              obj[String(pair[0])] = pair[1];
                            });
                            specs = obj;
                          }

                          // Caso: [{key,value}, ...] ou [{name,value}, ...]
                          else if (arr.length > 0 && typeof arr[0] === 'object') {
                            const obj: Record<string, any> = {};
                            arr.forEach((el: any) => {
                              if (el == null) return;
                              if (typeof el === 'object') {
                                if ('key' in el && 'value' in el) obj[String(el.key)] = el.value;
                                else if ('name' in el && 'value' in el) obj[String(el.name)] = el.value;
                                else if (Object.keys(el).length === 1) {
                                  const k = Object.keys(el)[0];
                                  obj[k] = (el as any)[k];
                                } else {
                                  // flatten other object shapes
                                  Object.entries(el).forEach(([k, v]) => (obj[k] = v));
                                }
                              }
                            });
                            specs = obj;
                          }

                          // Caso: ['k:v', 'k2:v2']
                          else if (arr.length > 0 && typeof arr[0] === 'string' && arr[0].includes(':')) {
                            const obj: Record<string, any> = {};
                            arr.forEach((s: string) => {
                              const idx = s.indexOf(':');
                              if (idx === -1) return;
                              const k = s.slice(0, idx).trim();
                              const v = s.slice(idx + 1).trim();
                              if (k) obj[k] = v;
                            });
                            specs = obj;
                          }
                        }

                        const isObject = typeof specs === 'object' && specs !== null && !Array.isArray(specs);

                        return (
                          <div className="bg-white dark:bg-slate-800 rounded-[1rem] p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Ficha técnica</h3>

                            {isObject ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {Object.entries(specs).map(([key, value], idx) => (
                                      <tr key={idx} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                                        <td className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300 align-top w-1/3">{key}</td>
                                        <td className="py-3 text-gray-600 dark:text-gray-400">{String(value)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : Array.isArray(specs) ? (
                              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
                                {specs.map((s: any, i: number) => (
                                  <li key={i}>{typeof s === 'object' ? JSON.stringify(s) : String(s)}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{String(specsRaw)}</p>
                            )}
                          </div>
                        );
                      })()}
                              e.stopPropagation();
                              setIsImageZoomOpen(true);
                            }}
                            className="absolute right-4 bottom-4 z-20 p-2 rounded-full bg-white/90 dark:bg-slate-800/80 shadow hover:scale-105"
                            aria-label="Ampliar imagem"
                          >
                            <Search size={18} />
                          </button>
                        </>
                      )}
                    </div>

                    {productImages.length > 1 && (
                      <div className="mt-4 w-full">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {productImages.map((src, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(idx);
                              }}
                              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border ${currentImageIndex === idx ? 'ring-2 ring-primary/50' : 'border-gray-100 dark:border-slate-700'} bg-white dark:bg-slate-800`}
                            >
                              <img
                                src={src}
                                alt={`thumb-${idx}`}
                                className="w-full h-full object-contain p-2"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Details */}
                  <div className="md:w-1/2 p-8 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col">
                    <div className="mb-6 flex items-start gap-4">
                      {(modals.product as any)?.brand_logo_url ||
                      (modals.product as any)?.logo_url ? (
                        <img
                          src={
                            (modals.product as any).brand_logo_url ||
                            (modals.product as any).logo_url
                          }
                          alt={(modals.product as any).brand || 'logo'}
                          className="w-12 h-12 object-contain rounded-lg bg-white p-1"
                        />
                      ) : null}

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300">
                              {modals.product.brand || 'Original'}
                            </span>
                            <h2 className="text-4xl font-black mt-1">
                              {modals.product.name}
                            </h2>
                          </div>
                          <button
                            onClick={() => toggleFavorite(modals.product!.id)}
                            className="flex-shrink-0 p-3 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:scale-110 transition-all"
                            aria-label="Favoritar"
                          >
                            <Heart
                              size={20}
                              className={
                                favorites.includes(modals.product!.id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-gray-400'
                              }
                            />
                          </button>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mt-2">
                          {(modals.product as any)?.is_launch && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold">
                              <Zap size={12} />
                              Lançamento
                            </span>
                          )}
                          {((modals.product as any)?.is_best_seller ||
                            (modals.product as any)?.bestseller) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                              <Star size={12} />
                              Best Seller
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[1rem] p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-6 text-gray-700 dark:text-gray-200">
                      <p className="text-sm leading-relaxed">
                        {modals.product.description ||
                          'Descrição premium para este item.'}
                      </p>
                    </div>

                    {(modals.product as any)?.technical_specs &&
                      (() => {
                        let specs: any = (modals.product as any)
                          .technical_specs;

                        // Se for string JSON, tenta fazer parse
                        if (typeof specs === 'string') {
                          try {
                            specs = JSON.parse(specs);
                          } catch (e) {
                            // Mantém como string se não for JSON válido
                          }
                        }

                        // Normaliza arrays do tipo [{key, value}, ...] para objeto { key: value }
                        if (Array.isArray(specs)) {
                          const arr = specs;
                          // Caso elementos sejam { key, value }
                          if (arr.length > 0 && typeof arr[0] === 'object') {
                            const obj: Record<string, any> = {};
                            arr.forEach((el: any) => {
                              if (el == null) return;
                              if (typeof el === 'object') {
                                if ('key' in el && 'value' in el)
                                  obj[String(el.key)] = el.value;
                                else if ('name' in el && 'value' in el)
                                  obj[String(el.name)] = el.value;
                                else {
                                  // fallback: flatten object entries
                                  Object.entries(el).forEach(
                                    ([k, v]) => (obj[k] = v)
                                  );
                                }
                              }
                            });
                            specs = obj;
                          }
                        }

                        const isObject =
                          typeof specs === 'object' &&
                          specs !== null &&
                          !Array.isArray(specs);

                        return (
                          <div className="bg-white dark:bg-slate-800 rounded-[1rem] p-6 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">
                              Ficha técnica
                            </h3>

                            {isObject ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {Object.entries(specs).map(
                                      ([key, value], idx) => (
                                        <tr
                                          key={idx}
                                          className="border-b border-gray-100 dark:border-slate-700 last:border-0"
                                        >
                                          <td className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300 align-top w-1/3">
                                            {key}
                                          </td>
                                          <td className="py-3 text-gray-600 dark:text-gray-400">
                                            {String(value)}
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {String(specs)}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                    {((modals.product as any)?.barcode ||
                      (modals.product as any)?.sku) && (
                      <div className="flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
                        <Barcode
                          value={
                            (modals.product as any).barcode ||
                            (modals.product as any).sku
                          }
                        />
                      </div>
                    )}

                    <div className="mt-auto space-y-4 rounded-[2.5rem] bg-secondary p-8 text-white shadow-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold opacity-60">
                          Quantidade
                        </span>
                        <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-2 border border-white/10">
                          <button
                            onClick={() =>
                              setDetailQuantity((q) => Math.max(1, q - 1))
                            }
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Minus size={20} />
                          </button>
                          <span className="min-w-[40px] text-center text-xl font-black">
                            {detailQuantity}
                          </span>
                          <button
                            onClick={() => setDetailQuantity((q) => q + 1)}
                            className="p-1 hover:text-primary transition-colors"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-6">
                        <span className="text-sm font-bold text-white">
                          Subtotal
                        </span>
                        <PriceDisplay
                          value={modals.product.price * detailQuantity}
                          size="large"
                          isPricesVisible={isPricesVisible}
                          className="text-white"
                        />
                      </div>

                      <Button
                        onClick={() => {
                          addToCart(modals.product!, detailQuantity);
                          setModal('product', null);
                        }}
                        className="w-full py-8 text-xl bg-primary text-white hover:bg-primary/90"
                      >
                        Adicionar ao Carrinho
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Zoom overlay */}
                {isImageZoomOpen && (
                  <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                      onClick={() => setIsImageZoomOpen(false)}
                    />
                    <div className="relative max-w-5xl w-full mx-auto flex items-center">
                      <button
                        onClick={() => setIsImageZoomOpen(false)}
                        className="absolute top-4 right-4 z-40 p-2 rounded-full bg-white/10 text-white"
                        aria-label="Fechar zoom"
                      >
                        <X size={22} />
                      </button>

                      {/* Prev */}
                      {productImages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((p) =>
                              p === 0 ? productImages.length - 1 : p - 1
                            );
                          }}
                          className="absolute left-4 z-30 p-3 rounded-full bg-white/10 text-white border border-white/20"
                          aria-label="Imagem anterior"
                        >
                          <ChevronLeft size={28} />
                        </button>
                      )}

                      <div className="relative w-full px-8">
                        <img
                          src={productImages[currentImageIndex]}
                          alt={`Zoom ${currentImageIndex + 1}`}
                          className="w-full max-h-[80vh] mx-auto h-auto object-contain rounded-lg"
                        />
                      </div>

                      {/* Next */}
                      {productImages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((p) =>
                              p === productImages.length - 1 ? 0 : p + 1
                            );
                          }}
                          className="absolute right-4 z-30 p-3 rounded-full bg-white/10 text-white border border-white/20"
                          aria-label="Próxima imagem"
                        >
                          <ChevronRight size={28} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* --- MODAL CHECKOUT (RESUMO E AUTO-FILL) --- */}
      {modals.checkout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setModal('checkout', false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              {isImageZoomOpen && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsImageZoomOpen(false)}
                  />
                  <div className="relative max-w-4xl w-full mx-auto">
                    <button
                      onClick={() => setIsImageZoomOpen(false)}
                      className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/10 text-white"
                    >
                      <X size={20} />
                    </button>
                    <img
                      src={productImages[currentImageIndex]}
                      alt="Zoom"
                      className="w-full h-auto object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-secondary tracking-tight">
                  Identificação
                </h2>
                <button
                  onClick={() => setModal('checkout', false)}
                  className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-secondary"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Quick actions: if we recognize the customer, allow clearing session */}
              {customerSession && (
                <div className="mb-6 flex items-center justify-end">
                  <button
                    onClick={() => {
                      clearCustomerSession();
                      setCustomerInfo({
                        name: '',
                        phone: '',
                        email: '',
                        cnpj: '',
                      });
                      toast.info('Dados de cliente removidos.');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Não é você?
                  </button>
                </div>
              )}
              <div className="bg-primary/5 rounded-[2rem] p-6 mb-8 border border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm">
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Resumo
                    </p>
                    <p className="text-lg font-black text-secondary">
                      {cart.length} Itens
                    </p>
                  </div>
                </div>
                <PriceDisplay
                  value={cartTotal}
                  size="large"
                  className="text-secondary"
                  isPricesVisible={isPricesVisible}
                />
              </div>
              <form onSubmit={onFinalize} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      Nome Completo
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Nome"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all"
                      value={customerInfo.name}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      WhatsApp (DDD)
                    </label>
                    <input
                      required
                      type="tel"
                      placeholder="(00) 00000-0000"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all"
                      value={customerInfo.phone}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    CPF / CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Documento"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none transition-all"
                    value={customerInfo.cnpj}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, cnpj: e.target.value })
                    }
                  />
                </div>
                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={loadingStates.submitting}
                    className="w-full py-8 text-xl shadow-xl shadow-primary/20"
                  >
                    {loadingStates.submitting
                      ? 'Processando...'
                      : 'Confirmar e Enviar Pedido'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- PÁGINA DE SUCESSO (CONVERSÃO PREMIUM) --- */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md animate-in fade-in duration-500" />
          <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] p-10 md:p-14 text-center shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="relative mx-auto mb-10 w-28 h-28 flex items-center justify-center rounded-full bg-green-50 text-green-500 shadow-inner">
              <CheckCircle size={72} strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-black text-secondary mb-3 tracking-tight">
              Pedido Enviado! 🎉
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              Olá,{' '}
              <span className="font-bold text-secondary">
                {orderSuccessData.customer.name}
              </span>
              ! <br /> Seu pedido{' '}
              <span className="text-primary font-black">
                #{orderSuccessData.display_id || orderSuccessData.id}
              </span>{' '}
              está pronto.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleSendWhatsApp}
                className="w-full py-6 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-[2rem] font-black text-xl shadow-[0_20px_40px_rgba(37,211,102,0.3)] transition-all flex items-center justify-center gap-3"
              >
                <Send size={24} /> Confirmar no WhatsApp
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onGeneratePDF}
                  className="flex items-center justify-center gap-2 py-5 bg-white border-2 border-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-50"
                >
                  <Download size={20} /> Recibo PDF
                </button>
                <button
                  onClick={() => {
                    setOrderSuccessData(null);
                    setModal('cart', false);
                  }}
                  className="flex items-center justify-center gap-2 py-5 bg-secondary text-white rounded-2xl font-bold text-sm hover:bg-black"
                >
                  <ShoppingCart size={20} /> Nova Compra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
