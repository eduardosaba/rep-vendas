'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from './store-context';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Send,
  CheckCircle,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Search,
  Heart,
  Tag,
  Info,
  Package,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { SaveCodeModal, LoadCodeModal } from './modals/SaveLoadModals';
import { PriceDisplay } from './PriceDisplay';
import Image from 'next/image';
import { SmartImage } from './SmartImage';
import { Button } from '@/components/ui/Button';
import Barcode from '../ui/Barcode'; // Mantido conforme seu projeto
import { toast } from 'sonner';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';
import {
  normalizeImageEntry,
  normalizeAndExplodeImageEntries,
  getBaseKeyFromUrl,
  dedupePreferOptimized,
  ensureOptimizedFirst,
  upgradeTo1200w,
} from '@/lib/imageHelpers';
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
    handleSaveOrder,
    handleDownloadPDF,
    loadingStates,
    orderSuccessData,
    setOrderSuccessData,
    handleSendWhatsApp,
    isPricesVisible,
    favorites,
    toggleFavorite,
    unlockPrices,
    customerSession,
  } = useStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [passwordInput, setPasswordInput] = useState('');
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    cnpj: '',
  });
  const [savedCode, setSavedCode] = useState<string | null>(null);

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

  const getProductImages = (product: any) => {
    if (!product) return [] as { url: string; path: string | null }[];

    const out: { url: string; path: string | null }[] = [];

    // 1) Priorizar variantes / image_path (otimizadas)
    if (
      Array.isArray(product.image_variants) &&
      product.image_variants.length > 0
    ) {
      const firstVar =
        product.image_variants.find((v: any) =>
          Boolean(v && (v.optimized_url || v.optimizedUrl || v.url || v.src))
        ) || product.image_variants[0];

      const varUrl =
        firstVar?.optimized_url ||
        firstVar?.optimizedUrl ||
        firstVar?.url ||
        firstVar?.src ||
        null;
      const varPath = firstVar?.path || firstVar?.storage_path || null;
      if (varUrl) out.push({ url: varUrl, path: varPath });
    } else if (product.image_path) {
      // Quando image_path existe, NUNCA use image_url ou external_image_url
      // (evita duplicação após clone/cleanup)
      let publicUrl: string | null = null;
      try {
        publicUrl = buildSupabaseImageUrl(product.image_path) || null;
      } catch (e) {
        publicUrl = null;
      }
      out.push({
        url: publicUrl || product.image_path,
        path: product.image_path,
      });
    }

    // 2) gallery_images (explode entries)
    if (
      Array.isArray(product.gallery_images) &&
      product.gallery_images.length > 0
    ) {
      out.push(...normalizeAndExplodeImageEntries(product.gallery_images));
    }

    // 3) product.images (explode entries) - validar se não são URLs vazias/nulas
    if (Array.isArray(product.images) && product.images.length > 0) {
      const validImages = product.images.filter((img: any) => {
        if (typeof img === 'string') return img && img.trim().length > 6;
        if (typeof img === 'object' && img) {
          const url =
            img.url || img.src || img.optimized_url || img.optimizedUrl;
          return url && url.trim().length > 6;
        }
        return false;
      });
      if (validImages.length > 0) {
        out.push(...normalizeAndExplodeImageEntries(validImages));
      }
    }

    // 4) Fallbacks: image_url / external_image_url
    // APENAS se não houver image_path (produtos legados sem migração)
    if (!product.image_path && !product.image_variants) {
      if (product.image_url && product.image_url.trim().length > 6) {
        out.push({ url: product.image_url, path: null });
      } else if (
        product.external_image_url &&
        product.external_image_url.trim().length > 6
      ) {
        out.push({ url: product.external_image_url, path: null });
      }
    }

    // Normalize urls (upgrade to 1200w) and remove trivially short/invalid
    const cleaned = out
      .map((i) => ({ url: (i.url || '').trim(), path: i.path }))
      .filter((i) => i.url && i.url.length > 6)
      .map((i) => ({ url: upgradeTo1200w(i.url), path: i.path }));

    // Deduplicate preferring optimized entries
    const deduped = dedupePreferOptimized(cleaned);
    const ordered = ensureOptimizedFirst(deduped);

    if (!ordered || ordered.length === 0) {
      return [{ url: '/images/product-placeholder.svg', path: null }];
    }

    // Final safety: remove exact-duplicate urls
    const finalSet = new Set<string>();
    return ordered.filter((img) => {
      if (!img.url || finalSet.has(img.url)) return false;
      finalSet.add(img.url);
      return true;
    });
  };

  const productImages = useMemo(
    () => getProductImages(modals.product),
    [modals.product]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (acc: number, item: any) => acc + item.price * item.quantity,
        0
      ),
    [cart]
  );

  // Detectar se a imagem atual é do Supabase Storage (otimizar) ou externa
  const currentImageIsSupabase = Boolean(
    productImages[currentImageIndex]?.path ||
    (typeof productImages[currentImageIndex]?.url === 'string' &&
      productImages[currentImageIndex]?.url.includes('supabase.co/storage')) ||
    modals.product?.image_path
  );

  useEffect(() => {
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [modals.product]);

  // Handlers
  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleFinalizeOrder(customerInfo);
    if (success) setModal('checkout', false);
  };

  return (
    <>
      {/* --- MODAL CARRINHO --- */}
      {modals.cart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/40 backdrop-blur-sm"
            onClick={() => setModal('cart', false)}
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-secondary">
                <ShoppingCart size={24} className="text-primary" /> Meu Carrinho
              </h2>
              <button
                onClick={() => setModal('cart', false)}
                className="rounded-xl p-2 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-300">
                  <ShoppingCart size={64} strokeWidth={1} />
                  <p className="font-bold mt-4">Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-gray-100 p-3 bg-white"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                      {/* Usa SmartImage com variant="thumbnail" se internalizado */}
                      {item.image_variants && item.image_variants.length > 0 ? (
                        <SmartImage
                          product={item}
                          className="h-full w-full"
                          imgClassName="object-contain p-2"
                          variant="thumbnail"
                        />
                      ) : (
                        <Image
                          src={
                            item.image_url ||
                            '/api/proxy-image?url=https%3A%2F%2Faawghxjbipcqefmikwby.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fproduct-placeholder.svg&fmt=webp&q=70'
                          }
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                          unoptimized={(item.image_url || '').includes(
                            'supabase.co/storage'
                          )}
                          onError={(e) => {
                            try {
                              (e.currentTarget as HTMLImageElement).src =
                                '/images/product-placeholder.svg';
                            } catch (err) {}
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-secondary line-clamp-1">
                        {item.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <PriceDisplay
                          value={item.price * item.quantity}
                          isPricesVisible={isPricesVisible}
                        />
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-6 space-y-4">
                <div className="flex justify-between text-xl font-black text-secondary">
                  <span>Total</span>
                  <PriceDisplay
                    value={cartTotal}
                    isPricesVisible={isPricesVisible}
                  />
                </div>

                <button
                  onClick={async () => {
                    const code = await handleSaveCart();
                    if (code) {
                      setSavedCode(code);
                      setModal('save', true);
                    } else {
                      toast.error('Erro ao salvar pedido');
                    }
                  }}
                  disabled={loadingStates.saving}
                  className="w-full py-3 bg-gray-100 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingStates.saving ? 'Salvando...' : 'Salvar Pedido'}
                </button>

                <Button
                  onClick={() => setModal('checkout', true)}
                  className="w-full py-7 text-lg uppercase tracking-tighter"
                >
                  Finalizar Pedido
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DETALHES DO PRODUTO (MODERNO/IMERSIVO) --- */}
      {modals.product && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/95 backdrop-blur-xl animate-in fade-in"
            onClick={() => setModal('product', null)}
          />

          <div className="relative w-full max-w-6xl h-full max-h-[95vh] md:max-h-[85vh] bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">
            {/* Botão Fechar */}
            <button
              onClick={() => setModal('product', null)}
              className="absolute right-6 top-6 z-[130] p-3 rounded-full bg-black/5 hover:bg-black/10 transition-all"
            >
              <X size={24} className="text-secondary" />
            </button>

            {/* ESQUERDA: Showcase de Imagem */}
            <div className="w-full md:w-1/2 h-[45%] md:h-full bg-white flex flex-col relative border-b md:border-b-0 md:border-r border-gray-100">
              <div
                className="flex-1 relative cursor-zoom-in group"
                onClick={() => setIsImageZoomOpen(true)}
              >
                {(() => {
                  const current = productImages[currentImageIndex] || {
                    url: '/images/product-placeholder.svg',
                    path: null,
                  };
                  return (
                    <SmartImage
                      product={{
                        ...modals.product,
                        image_url: current.url,
                        image_path: current.path,
                      }}
                      preferredSize={1200}
                      initialSrc={current.url}
                      className="absolute inset-0 w-full h-full p-8 transition-transform duration-700 group-hover:scale-105"
                      imgClassName="object-contain w-full h-full"
                      variant="full"
                    />
                  );
                })()}
                <div className="absolute bottom-6 right-6 p-3 bg-white/80 backdrop-blur rounded-2xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Search size={20} className="text-primary" />
                </div>
              </div>

              {/* Thumbnails */}
              {productImages.length > 1 && (
                <div className="h-24 px-6 pb-6 overflow-x-auto no-scrollbar">
                  <div className="flex gap-3 justify-center">
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative w-16 h-16 rounded-xl border-2 transition-all overflow-hidden flex-shrink-0 ${currentImageIndex === idx ? 'border-primary ring-4 ring-primary/10' : 'border-gray-100 opacity-50'}`}
                      >
                        <SmartImage
                          product={{
                            ...modals.product,
                            image_url: img.url,
                            image_path: img.path,
                          }}
                          preferredSize={480}
                          initialSrc={img.url}
                          className="absolute inset-0 w-full h-full"
                          variant="thumbnail"
                          imgClassName="object-cover p-1"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DIREITA: Conteúdo e Checkout */}
            <div className="w-full md:w-1/2 h-[55%] md:h-full flex flex-col bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                    {modals.product.brand || 'Original'}
                  </span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    REF:{' '}
                    {modals.product.reference_code ||
                      modals.product.id.slice(0, 8)}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-4 mb-6">
                  <h2 className="text-3xl md:text-5xl font-black text-secondary leading-none tracking-tighter">
                    {modals.product.name}
                  </h2>
                  <button
                    onClick={() => toggleFavorite(modals.product!.id)}
                    className="p-4 rounded-full bg-white shadow-sm hover:shadow-md transition-all"
                  >
                    <Heart
                      size={24}
                      className={
                        favorites.includes(modals.product.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-200'
                      }
                    />
                  </button>
                </div>

                <p className="text-gray-500 text-base md:text-lg mb-8 leading-relaxed">
                  {modals.product.description ||
                    'Produto de alta qualidade com acabamento impecável, ideal para quem busca estilo e durabilidade.'}
                </p>

                {/* Ficha Técnica */}
                {modals.product.technical_specs && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 text-secondary">
                      <Info size={18} />
                      <h3 className="font-black uppercase text-xs tracking-widest">
                        Ficha Técnica
                      </h3>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                      {/* Segurança: technical_specs pode ser um objeto ou uma string livre.
                              Tentamos parsear JSON; se falhar, mostramos o texto em uma linha única. */}
                      {(() => {
                        const raw = modals.product.technical_specs as any;
                        let specs: Record<string, any> = {};
                        if (!raw)
                          return (
                            <p className="text-sm text-gray-500">
                              Sem especificações técnicas.
                            </p>
                          );
                        if (typeof raw === 'object') {
                          specs = raw as Record<string, any>;
                        } else if (typeof raw === 'string') {
                          try {
                            const parsed = JSON.parse(raw);
                            if (parsed && typeof parsed === 'object')
                              specs = parsed;
                            else specs = { Descrição: String(raw) };
                          } catch (e) {
                            // Se não for JSON válido, exibir como uma única linha de texto
                            specs = { Descrição: String(raw) };
                          }
                        }

                        return (
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-50">
                              {Object.entries(specs).map(([key, val], i) => (
                                <tr key={i} className="group">
                                  <td className="py-3 font-bold text-gray-400 group-hover:text-primary transition-colors">
                                    {key}
                                  </td>
                                  <td className="py-3 text-right text-secondary font-medium">
                                    {String(val)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Código de Barras / SKU — só mostrar se barcode estiver cadastrado */}
                {modals.product?.barcode &&
                  String(modals.product.barcode).replace(/\D/g, '').length >
                    0 && (
                    <div className="p-6 bg-secondary/5 rounded-3xl border border-dashed border-secondary/10 flex flex-col items-center justify-center gap-4 mb-8">
                      <div className="flex items-center gap-2 text-secondary/40">
                        <BarcodeIcon size={16} />
                        <span className="text-[10px] font-bold uppercase">
                          Código de Barras
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl">
                        <Barcode value={String(modals.product.barcode)} />
                      </div>
                    </div>
                  )}
              </div>

              {/* FOOTER DE AÇÃO FIXO */}
              <div className="p-6 md:p-10 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl">
                      <button
                        onClick={() =>
                          setDetailQuantity((q: number) => Math.max(1, q - 1))
                        }
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="text-xl font-black w-8 text-center">
                        {detailQuantity}
                      </span>
                      <button
                        onClick={() => setDetailQuantity((q: number) => q + 1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                        Subtotal
                      </span>
                      <PriceDisplay
                        value={modals.product.price * detailQuantity}
                        isPricesVisible={isPricesVisible}
                        size="large"
                        className="text-3xl font-black"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      addToCart(modals.product!, detailQuantity);
                      setModal('product', null);
                    }}
                    className="w-full py-8 text-xl font-black uppercase tracking-tighter shadow-2xl shadow-primary/30"
                  >
                    Adicionar ao Pedido
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ZOOM OVERLAY INTEGRADO */}
          {isImageZoomOpen && (
            <div
              className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
              onClick={() => setIsImageZoomOpen(false)}
            >
              {/* Botão Fechar - Mobile Otimizado */}
              <button
                className="absolute right-4 top-4 md:right-8 md:top-8 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all active:scale-95"
                onClick={() => setIsImageZoomOpen(false)}
              >
                <X size={24} className="md:hidden" />
                <X size={32} className="hidden md:block" />
              </button>

              {/* Setas de Navegação - Apenas Desktop */}
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((i: number) =>
                        i === 0 ? productImages.length - 1 : i - 1
                      );
                    }}
                    className="hidden md:block absolute left-6 p-4 text-white/20 hover:text-white transition-colors z-10"
                  >
                    <ChevronLeft size={64} strokeWidth={1} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((i: number) =>
                        i === productImages.length - 1 ? 0 : i + 1
                      );
                    }}
                    className="hidden md:block absolute right-6 p-4 text-white/20 hover:text-white transition-colors z-10"
                  >
                    <ChevronRight size={64} strokeWidth={1} />
                  </button>
                </>
              )}

              {/* Container da Imagem - Responsivo */}
              <div
                className="relative w-full h-full max-w-5xl flex items-center justify-center p-4 md:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-full h-full">
                  {(() => {
                    const current = productImages[currentImageIndex] || {
                      url: '/images/product-placeholder.svg',
                      path: null,
                    };
                    return (
                      <SmartImage
                        product={{
                          ...modals.product,
                          image_url: current.url,
                          image_path: current.path,
                        }}
                        preferredSize={1200}
                        initialSrc={current.url}
                        className="w-full h-full"
                        imgClassName="object-contain w-full h-full"
                        variant="full"
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Indicador de Múltiplas Imagens - Mobile */}
              {productImages.length > 1 && (
                <div className="md:hidden absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? 'bg-white w-6'
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAIS DE APOIO (SAVE/LOAD/PASSWORD/SUCCESS) - Mantidos com sua lógica original */}
      <SaveCodeModal
        isSaveModalOpen={!!modals.save && !!savedCode}
        setIsModalOpen={(v) => setModal('save', v)}
        savedCode={savedCode}
        copyToClipboard={() =>
          savedCode && navigator.clipboard.writeText(savedCode)
        }
      />
      <LoadCodeModal
        isLoadModalOpen={!!modals.load}
        setIsModalOpen={(v) => setModal('load', v)}
        loadCodeInput={loadCodeInput}
        setLoadCodeInput={setLoadCodeInput}
        handleLoadCart={async (e) => {
          e.preventDefault();
          const ok = await handleLoadCart(loadCodeInput);
          if (ok) setModal('load', false);
        }}
        isLoadingCart={loadingStates.loadingCart}
      />
      <PasswordModal
        isPasswordModalOpen={!!modals.password}
        setIsPasswordModalOpen={(v) => setModal('password', v)}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handleUnlockPrices={async (e) => {
          e.preventDefault();
          const ok = await unlockPrices(passwordInput);
          if (ok) setModal('password', false);
        }}
      />

      {/* MODAL CHECKOUT IDENTIFICAÇÃO */}
      {modals.checkout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md"
            onClick={() => setModal('checkout', false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-8 md:p-12 animate-in zoom-in-95">
            <h2 className="text-3xl font-black mb-8 tracking-tighter">
              Identificação
            </h2>
            <form onSubmit={onFinalize} className="space-y-4">
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nome Completo"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
              />
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="WhatsApp (DDD + Número)"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
              />
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="E-mail"
                type="email"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
              />
              <Button
                type="submit"
                isLoading={loadingStates.submitting}
                className="w-full py-7 text-lg uppercase font-black"
              >
                Confirmar e Enviar
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* SUCESSO FINAL */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2c]/90 backdrop-blur-xl" />
          <div className="relative w-full max-w-lg bg-white rounded-[4rem] p-12 text-center shadow-2xl scale-in-center">
            <div className="mx-auto mb-8 w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle size={56} />
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tighter">
              Tudo pronto!
            </h2>
            <p className="text-gray-500 mb-10 text-lg">
              Seu pedido foi processado com sucesso.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleSendWhatsApp}
                className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3"
              >
                <Send size={20} /> Chamar no WhatsApp
              </button>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={async () => {
                    // Gera/abre PDF do pedido
                    await handleDownloadPDF();
                  }}
                  className="w-full py-3 bg-white border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  Gerar PDF
                </button>
              </div>

              <button
                onClick={() => {
                  setOrderSuccessData(null);
                  setModal('cart', false);
                }}
                className="w-full py-5 text-gray-400 font-bold"
              >
                Voltar ao Catálogo de Produtos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
