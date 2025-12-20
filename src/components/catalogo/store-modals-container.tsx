'use client';

import { useStore } from './store-context';
import { useState } from 'react';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Send,
  Save,
  Copy,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  ShoppingCart,
  Search,
  Maximize2,
  Download,
  Share2,
} from 'lucide-react';
import { PriceDisplay } from './PriceDisplay';
import ProductImage from './ProductImage';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import type { Product } from '@/components/catalogo/Storefront';
import Barcode from '../ui/Barcode';
import { toast } from 'sonner';
import { generateOrderPDF } from '@/lib/generateOrderPDF';

export function StoreModals() {
  const {
    store,
    modals,
    setModal,
    cart,
    updateQuantity,
    removeFromCart,
    addToCart,
    loadingStates,
    handleSaveCart,
    handleFinalizeOrder,
    handleLoadCart,
    orderSuccessData,
    setOrderSuccessData,
    handleSendWhatsApp,
    unlockPrices,
    isPricesVisible,
  } = useStore();
  const { brandsWithLogos } = useStore();

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

  // --- FIX: LÓGICA DE IMAGENS UNIFICADA ---
  const getProductImages = (product: any) => {
    if (!product) return [];

    const images: string[] = [];

    // 1. Adiciona Imagem Principal (URL Externa)
    if (product.image_url && typeof product.image_url === 'string') {
      images.push(product.image_url);
    }

    // 2. Adiciona Imagem Principal (Storage Local)
    if (product.image_path && typeof product.image_path === 'string') {
      const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.image_path}`;
      // Evita duplicata se a URL externa for igual à do storage
      if (!images.includes(storageUrl)) {
        images.push(storageUrl);
      }
    }

    // 3. Adiciona Galeria de Imagens (Array)
    if (
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      product.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim() !== '') {
          // Evita adicionar se for igual à capa que já adicionamos
          if (!images.includes(img)) {
            images.push(img);
          }
        }
      });
    }

    return images;
  };

  const copyToClipboard = (text: string, message: string = 'Copiado!') => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const onUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPrices(passwordInput)) {
      setModal('password', false);
      toast.success('Preços liberados com sucesso!');
    } else {
      toast.error('Senha incorreta. Tente novamente.');
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

  // --- PDF GENERATION ---
  const onGeneratePDF = async () => {
    if (!orderSuccessData) return;

    const toastId = toast.loading('Gerando arquivo PDF...');

    try {
      // Preparar dados do pedido no formato esperado pela função
      const orderData = {
        id: orderSuccessData.display_id || orderSuccessData.id,
        customer: {
          name: orderSuccessData.customer?.name || '',
          phone: orderSuccessData.customer?.phone || '',
          email: orderSuccessData.customer?.email || '',
          cnpj: orderSuccessData.customer?.cnpj || '',
        },
      };

      await generateOrderPDF(
        orderData,
        store,
        orderSuccessData.items || [],
        orderSuccessData.total || 0
      );

      toast.dismiss(toastId);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss(toastId);
      toast.error('Falha ao gerar o PDF.');
    }
  };

  // --- RENDERIZADOR DE FICHA TÉCNICA ---
  const renderSpecs = (specs: any) => {
    if (!specs) return null;
    let dataToRender: any = null;

    if (typeof specs === 'object') {
      dataToRender = specs;
    } else if (typeof specs === 'string') {
      const trimmed = specs.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          dataToRender = JSON.parse(trimmed);
        } catch (e) {
          dataToRender = null;
        }
      }
    }

    const shouldHideValue = (val: string) => {
      const v = String(val).toLowerCase();
      return (
        v.startsWith('http') || v.match(/\.(jpeg|jpg|gif|png|webp)$/) != null
      );
    };

    if (Array.isArray(dataToRender)) {
      const filtered = dataToRender.filter(
        (row: any) => !shouldHideValue(row.value)
      );
      if (filtered.length === 0) return null;
      return (
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg mt-2">
          <table className="w-full text-sm border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2 w-1/3 font-semibold text-gray-700 border border-gray-100">
                  Campo
                </th>
                <th className="p-2 font-semibold text-gray-700 border border-gray-100">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row: any, i: number) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 align-top border border-gray-100 font-medium text-gray-700">
                    {row.key || row.name}
                  </td>
                  <td className="p-2 align-top border border-gray-100 text-gray-600">
                    {row.value || row.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (dataToRender && typeof dataToRender === 'object') {
      const entries = Object.entries(dataToRender).filter(
        ([_, value]) => !shouldHideValue(String(value))
      );
      if (entries.length === 0) return null;
      return (
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg mt-2">
          <table className="w-full text-sm border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2 w-1/3 font-semibold text-gray-700 border border-gray-100">
                  Campo
                </th>
                <th className="p-2 font-semibold text-gray-700 border border-gray-100">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value], i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 align-top border border-gray-100 font-medium text-gray-700">
                    {key}
                  </td>
                  <td className="p-2 align-top border border-gray-100 text-gray-600">
                    {String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p className="whitespace-pre-wrap text-gray-600 text-sm leading-relaxed mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
        {String(specs)}
      </p>
    );
  };

  return (
    <>
      {/* MODAL CARRINHO */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModal('cart', false)}
              >
                <X size={24} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingCart size={48} className="mb-2 opacity-20" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 bg-white p-3 rounded border shadow-sm relative"
                    >
                      <div className="h-16 w-16 bg-gray-50 relative">
                        <Image
                          src={item.image_url || '/placeholder-no-image.svg'}
                          alt={item.name}
                          fill
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-no-image.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold line-clamp-1">
                          {item.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <PriceDisplay
                            value={item.price * item.quantity}
                            className="text-primary font-bold text-sm"
                            isPricesVisible={isPricesVisible}
                          />
                          <div className="flex items-center border rounded">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="px-2 hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="px-2 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-white shadow-lg z-10 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <PriceDisplay
                    value={cartTotal}
                    isPricesVisible={isPricesVisible}
                  />
                </div>
                <Button
                  onClick={() => setModal('checkout', true)}
                  className="w-full py-6 text-lg bg-green-600 hover:bg-green-700 border-none"
                >
                  Finalizar Compra
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

      {/* --- MODAL CARREGAR --- */}
      {modals.load && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('load', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg text-gray-900">
                Recuperar Carrinho
              </h3>
              <button onClick={() => setModal('load', false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const success = await handleLoadCart(loadCodeInput);
                if (success) {
                  toast.success('Carrinho carregado com sucesso!');
                  setModal('load', false);
                } else {
                  toast.error('Código não encontrado ou erro de conexão.');
                }
              }}
            >
              <input
                autoFocus
                placeholder="Código (ex: K9P-2X4)"
                className="w-full p-3 border rounded-lg mb-4 text-center uppercase font-bold tracking-widest outline-none focus:border-primary"
                value={loadCodeInput}
                onChange={(e) => setLoadCodeInput(e.target.value.toUpperCase())}
              />
              <Button
                type="submit"
                isLoading={loadingStates.loadingCart}
                className="w-full"
              >
                Carregar
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DETALHES DO PRODUTO (CORRIGIDO) --- */}
      {modals.product && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setModal('product', null)}
          />
          <div className="relative bg-white dark:bg-slate-900 w-full h-[100dvh] md:h-auto md:max-w-4xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row md:max-h-[90vh]">
            {/* Header (Botões de Fechar e Compartilhar) */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => {
                  const baseUrl =
                    window.location.origin + window.location.pathname;
                  const productUrl = `${baseUrl}?product=${modals.product?.id}`;
                  copyToClipboard(productUrl, 'Link do produto copiado!');
                }}
                className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={() => setModal('product', null)}
                className="p-2 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* ===== COLUNA ESQUERDA: Imagem + Miniaturas + Botão (Desktop) ===== */}
            <div className="hidden md:flex md:w-1/2 bg-white dark:bg-slate-900 relative p-6 border-r border-gray-100 dark:border-slate-800 flex-col items-center justify-between overflow-y-auto custom-scrollbar">
              {/* Imagem Principal */}
              <div className="relative w-full h-[350px] flex items-center justify-center mb-4">
                {getProductImages(modals.product).length > 0 ? (
                  <img
                    src={
                      getProductImages(modals.product as any)[currentImageIndex]
                    }
                    className="max-w-full max-h-full object-contain cursor-zoom-in"
                    alt="Product"
                    onClick={() => setModal('zoom', true)}
                  />
                ) : (
                  <div className="text-gray-300 flex flex-col items-center">
                    <Search size={48} />
                    <span className="text-sm mt-2">Sem imagem</span>
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {getProductImages(modals.product).length > 1 && (
                <div className="flex gap-2 overflow-x-auto justify-center w-full py-2 mb-4">
                  {getProductImages(modals.product as any).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-14 h-14 rounded-lg border overflow-hidden transition-all flex-shrink-0 ${
                        currentImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img || '/placeholder-no-image.svg'}
                        className="w-full h-full object-contain"
                        alt={`thumb-${idx}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-no-image.svg';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Botão Adicionar ao Pedido (Desktop - abaixo das miniaturas) */}
              <div className="w-full mt-auto">
                <Button
                  onClick={() => {
                    addToCart(modals.product!);
                    setModal('product', null);
                    toast.success('Adicionado ao carrinho');
                  }}
                  className="w-full py-6 text-lg shadow-lg"
                  leftIcon={<ShoppingCart size={22} />}
                >
                  Adicionar ao Pedido
                </Button>
              </div>
            </div>

            {/* ===== ÁREA SCROLLÁVEL (Mobile): Imagem + Detalhes ===== */}
            <div className="flex md:hidden flex-col w-full overflow-y-auto pb-28">
              {/* Imagem Mobile (dentro da área scrollável) */}
              <div className="relative w-full h-[200px] flex items-center justify-center bg-white dark:bg-slate-900 p-4">
                {getProductImages(modals.product).length > 0 ? (
                  <>
                    <img
                      src={
                        getProductImages(modals.product as any)[
                          currentImageIndex
                        ] || '/placeholder-no-image.svg'
                      }
                      className="max-w-full max-h-full object-contain cursor-zoom-in"
                      alt="Product"
                      onClick={() => setModal('zoom', true)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-no-image.svg';
                      }}
                    />

                    {/* Setas de navegação (só aparecem se tiver mais de 1 imagem) */}
                    {getProductImages(modals.product).length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) =>
                              prev === 0
                                ? getProductImages(modals.product).length - 1
                                : prev - 1
                            );
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) =>
                              prev ===
                              getProductImages(modals.product).length - 1
                                ? 0
                                : prev + 1
                            );
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-gray-300 flex flex-col items-center">
                    <Search size={48} />
                    <span className="text-sm mt-2">Sem imagem</span>
                  </div>
                )}
              </div>

              {/* Miniaturas Mobile */}
              {getProductImages(modals.product).length > 1 && (
                <div className="w-full bg-white dark:bg-slate-900 py-3 px-2 border-b border-gray-100 dark:border-slate-800">
                  <div
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                    style={{
                      scrollBehavior: 'smooth',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {getProductImages(modals.product as any).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`min-w-[60px] w-[60px] h-[60px] rounded-lg border-2 overflow-hidden transition-all flex-shrink-0 ${
                          currentImageIndex === idx
                            ? 'border-primary ring-2 ring-primary/30 scale-105'
                            : 'border-gray-200 dark:border-slate-700 hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={img || '/placeholder-no-image.svg'}
                          className="w-full h-full object-contain bg-white"
                          alt={`thumb-${idx}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-no-image.svg';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  {/* Indicador de scroll */}
                  {getProductImages(modals.product).length > 4 && (
                    <p className="text-center text-xs text-gray-400 mt-1">
                      ← Deslize para ver mais →
                    </p>
                  )}
                </div>
              )}

              {/* Detalhes do Produto (Mobile - rola junto com a imagem) */}
              <div className="p-4 bg-white dark:bg-slate-900">
                <div className="flex items-start gap-2">
                  <h2 className="text-xl font-bold mb-1 dark:text-slate-50 flex-1">
                    {modals.product?.name}
                  </h2>
                  <div className="flex gap-1 flex-shrink-0">
                    {modals.product?.is_launch && (
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                        NOVO
                      </span>
                    )}
                    {modals.product?.is_best_seller && (
                      <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                        Best Seller
                      </span>
                    )}
                  </div>
                </div>

                {/* Marca */}
                {modals.product?.brand && (
                  <div className="my-2 flex items-center gap-2">
                    {(() => {
                      const found = brandsWithLogos.find(
                        (b) => b.name === modals.product?.brand
                      );
                      if (found && found.logo_url) {
                        return (
                          <img
                            src={found.logo_url}
                            alt={modals.product?.brand || ''}
                            className="h-6 object-contain"
                          />
                        );
                      }
                      return (
                        <span className="text-sm font-semibold text-primary uppercase">
                          {modals.product?.brand}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <span className="text-xs text-gray-400 font-mono mb-2 block">
                  Ref: {modals.product?.reference_code}
                </span>

                {/* Barcode */}
                {modals.product?.barcode && (
                  <div className="mb-4 opacity-90">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Código de Barras (EAN)
                    </div>
                    <div className="inline-block bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                      <Barcode value={modals.product.barcode} height={48} />
                    </div>
                  </div>
                )}

                {/* Preço (versão compacta no mobile - principal está na barra fixa) */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                    Valor Unitário
                  </span>
                  <PriceDisplay
                    value={modals.product?.price || 0}
                    size="normal"
                    isPricesVisible={isPricesVisible}
                    className="font-bold"
                  />
                </div>

                {/* Descrição e Ficha Técnica */}
                <div className="space-y-3">
                  <h4 className="font-bold flex gap-2 items-center text-sm uppercase dark:text-slate-50">
                    <FileText size={16} /> Descrição
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {modals.product?.description}
                  </p>
                  {modals.product?.technical_specs && (
                    <div className="mt-3 pt-3 border-t dark:border-slate-700">
                      <h4 className="font-bold text-sm uppercase mb-2 dark:text-slate-50">
                        Ficha Técnica
                      </h4>
                      {renderSpecs(modals.product.technical_specs)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== COLUNA DIREITA: Detalhes (Desktop) ===== */}
            <div className="hidden md:flex md:w-1/2 p-6 md:p-8 flex-col overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <h2 className="text-2xl font-bold mb-2 dark:text-slate-50">
                  {modals.product?.name}
                </h2>
                <div className="mt-1">
                  <div className="flex gap-2">
                    {modals.product?.is_launch && (
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                        NOVO
                      </span>
                    )}
                    {modals.product?.is_best_seller && (
                      <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                        Best Seller
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Marca */}
              {modals.product?.brand && (
                <div className="my-2 flex items-center gap-2">
                  {(() => {
                    const found = brandsWithLogos.find(
                      (b) => b.name === modals.product?.brand
                    );
                    if (found && found.logo_url) {
                      return (
                        <img
                          src={found.logo_url}
                          alt={modals.product?.brand || ''}
                          className="h-6 object-contain"
                        />
                      );
                    }
                    return (
                      <span className="text-sm font-semibold text-primary uppercase">
                        {modals.product?.brand}
                      </span>
                    );
                  })()}
                </div>
              )}
              <span className="text-xs text-gray-400 font-mono mb-2 block">
                Ref: {modals.product?.reference_code}
              </span>

              {/* Barcode */}
              {modals.product?.barcode && (
                <div className="mb-4 opacity-90">
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    Código de Barras (EAN)
                  </div>
                  <div className="inline-block bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                    <Barcode value={modals.product.barcode} height={48} />
                  </div>
                </div>
              )}

              <div className="mb-6 p-5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold block mb-1">
                  Valor Unitário
                </span>
                <PriceDisplay
                  value={modals.product?.price || 0}
                  size="large"
                  isPricesVisible={isPricesVisible}
                />
              </div>

              {/* Descrição e Ficha Técnica */}
              <div className="space-y-4 mb-8">
                <h4 className="font-bold flex gap-2 items-center text-sm uppercase dark:text-slate-50">
                  <FileText size={16} /> Descrição
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {modals.product?.description}
                </p>
                {modals.product?.technical_specs && (
                  <div className="mt-4">
                    <h4 className="font-bold text-sm uppercase border-t dark:border-slate-700 pt-4 dark:text-slate-50">
                      Ficha Técnica
                    </h4>
                    {renderSpecs(modals.product.technical_specs)}
                  </div>
                )}
              </div>
            </div>

            {/* ===== BARRA INFERIOR FIXA (Mobile) - Preço + Botão ===== */}
            <div
              className="md:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-[70]"
              style={{
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                {/* Preço */}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
                    Valor Unitário
                  </span>
                  <PriceDisplay
                    value={modals.product?.price || 0}
                    size="large"
                    isPricesVisible={isPricesVisible}
                    className="font-bold"
                  />
                </div>

                {/* Botão Adicionar */}
                <Button
                  onClick={() => {
                    addToCart(modals.product!);
                    setModal('product', null);
                    toast.success('Adicionado ao carrinho');
                  }}
                  className="py-4 px-6 text-base shadow-lg flex-shrink-0"
                  leftIcon={<ShoppingCart size={20} />}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ZOOM --- */}
      {modals.zoom && modals.product && (
        <div className="fixed inset-0 z-[80] bg-white dark:bg-slate-950 flex items-center justify-center">
          <button
            onClick={() => setModal('zoom', false)}
            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-slate-800 rounded-full z-20 hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            <X size={24} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center p-4 md:p-10">
            {/* Navegação Esquerda */}
            {getProductImages(modals.product).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev === 0
                      ? getProductImages(modals.product).length - 1
                      : prev - 1
                  );
                }}
                className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-gray-100/80 hover:bg-gray-200 rounded-full text-gray-800 z-10"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            {/* Imagem Principal Zoom */}
            <div className="max-w-[90vw] max-h-[90vh]">
              <img
                src={
                  getProductImages(modals.product as any)[currentImageIndex] ||
                  '/placeholder-no-image.svg'
                }
                className="max-w-full max-h-full object-contain select-none"
                alt="Zoom"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-no-image.svg';
                }}
              />
            </div>

            {/* Navegação Direita */}
            {getProductImages(modals.product).length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) =>
                    prev === getProductImages(modals.product).length - 1
                      ? 0
                      : prev + 1
                  );
                }}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-gray-100/80 hover:bg-gray-200 rounded-full text-gray-800 z-10"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL SUCESSO FINAL --- */}
      {orderSuccessData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 sm:px-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pedido #{orderSuccessData.display_id || orderSuccessData.id}{' '}
              Confirmado!
            </h2>
            <p className="text-gray-500 mb-8">
              Obrigado, {orderSuccessData.customer.name}.
            </p>
            <div className="space-y-3">
              <Button
                onClick={onGeneratePDF}
                className="w-full py-6 text-lg shadow-lg bg-primary hover:bg-primary/90 text-white border-none"
                leftIcon={<Download size={24} />}
              >
                Baixar Pedido em PDF
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                className="w-full py-4 text-green-700 border-green-200 hover:bg-green-50 bg-white"
                variant="outline"
                leftIcon={<Send size={20} />}
              >
                Enviar via WhatsApp
              </Button>
              <button
                onClick={() => {
                  setOrderSuccessData(null);
                  setCustomerInfo({ name: '', phone: '', email: '', cnpj: '' });
                  setModal('checkout', false);
                }}
                className="block w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... (Outros modais Password, Save, Checkout - mantenha-os similares mas usando Button e Toast) ... */}
      {modals.password && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('password', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-xs shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4 text-center">
              Área Restrita
            </h3>
            <form onSubmit={onUnlock}>
              <input
                type="password"
                autoComplete="current-password"
                autoFocus
                placeholder="Senha"
                className="w-full p-3 border rounded-lg mb-4 text-center outline-none focus:border-indigo-500"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              <Button type="submit" className="w-full">
                Desbloquear
              </Button>
            </form>
          </div>
        </div>
      )}

      {modals.save && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('save', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Save size={32} className="mx-auto text-green-600 mb-4" />
            <h3 className="font-bold text-lg">Salvo!</h3>
            <div className="bg-gray-100 p-3 rounded my-4 flex justify-between items-center">
              <code className="font-bold text-lg">{savedCode}</code>
              <button onClick={() => copyToClipboard(savedCode || '')}>
                <Copy size={18} />
              </button>
            </div>
            <Button onClick={() => setModal('save', false)} className="w-full">
              Fechar
            </Button>
          </div>
        </div>
      )}

      {modals.checkout && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal('checkout', false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">Finalizar</h3>
              <button onClick={() => setModal('checkout', false)}>
                <X />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Nome"
                className="w-full p-2 border rounded"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
              />
              <input
                placeholder="WhatsApp"
                className="w-full p-2 border rounded"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
              />
              <input
                placeholder="Email"
                className="w-full p-2 border rounded"
                value={customerInfo.email}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, email: e.target.value })
                }
              />
              <input
                placeholder="CPF/CNPJ"
                className="w-full p-2 border rounded"
                value={customerInfo.cnpj}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, cnpj: e.target.value })
                }
              />
              <Button
                onClick={async () => {
                  const success = await handleFinalizeOrder(customerInfo);
                  if (success) {
                    setModal('checkout', false);
                    // Não limpa customerInfo aqui, pois será usado no modal de sucesso
                    toast.success('Pedido finalizado com sucesso!');
                  }
                }}
                isLoading={loadingStates.submitting}
                className="w-full bg-green-600 hover:bg-green-700 border-none"
              >
                Enviar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
