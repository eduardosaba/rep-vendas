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
  ZoomIn,
  Package,
  FileText,
  Tag,
  Info,
  QrCode,
  ShieldCheck,
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

  // Reset ao trocar de produto
  useEffect(() => {
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [modals.product]);

  // --- MEMOIZAÇÕES ---
  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const productImages = useMemo(() => {
    if (!modals.product) return [];
    const images: string[] = [];

    // Prioridade para o image_path interno se existir (usando URL do Supabase)
    if (modals.product.image_path) {
      images.push(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${modals.product.image_path}`
      );
    } else if (modals.product.image_url) {
      images.push(modals.product.image_url);
    } else if (modals.product.external_image_url) {
      images.push(modals.product.external_image_url);
    }

    // Adiciona galeria extra
    if (modals.product.images && Array.isArray(modals.product.images)) {
      modals.product.images.forEach((img) => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    return images.length > 0 ? images : ['/placeholder-no-image.svg'];
  }, [modals.product]);

  // --- NAVEGAÇÃO DE IMAGEM ---
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  // --- HANDLERS ---
  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleFinalizeOrder(customerInfo);
    if (success) setModal('checkout', false);
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

  if (!store) return null;

  return (
    <>
      {/* --- 1. MODAL DETALHES DO PRODUTO (O "NOTA 10") --- */}
      {modals.product && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center md:items-center md:px-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md animate-in fade-in duration-500"
            onClick={() => setModal('product', null)}
          />

          <div className="relative flex h-[94dvh] md:h-auto md:max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-bottom duration-500 md:rounded-[3rem]">
            {/* Botão Fechar Master */}
            <button
              onClick={() => setModal('product', null)}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-200 shadow-lg hover:scale-110 transition-all border border-gray-100 dark:border-slate-700"
            >
              <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar md:flex md:flex-row">
              {/* COLUNA ESQUERDA: IMAGEM E GALERIA */}
              <div className="md:w-[55%] p-4 md:p-8 flex flex-col bg-white dark:bg-slate-950">
                <div className="relative aspect-square w-full rounded-[2.5rem] bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-slate-800 group">
                  <Image
                    src={productImages[currentImageIndex]}
                    alt={modals.product.name}
                    fill
                    className="object-contain p-8 md:p-12 transition-all duration-700 group-hover:scale-105"
                    priority
                  />

                  {/* Lupa com Sinal de Mais (+) */}
                  <button
                    onClick={() => setIsImageZoomOpen(true)}
                    className="absolute bottom-6 right-6 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl text-primary hover:scale-110 transition-all border border-gray-100 dark:border-slate-700 z-10"
                    title="Ampliar Foto"
                  >
                    <ZoomIn size={26} />
                  </button>

                  {/* Setas Laterais na Visualização Principal */}
                  {productImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                </div>

                {/* Seletor de Miniaturas */}
                {productImages.length > 1 && (
                  <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {productImages.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${currentImageIndex === idx ? 'border-primary ring-4 ring-primary/10 scale-95' : 'border-gray-100 dark:border-slate-800 opacity-50 hover:opacity-100'}`}
                      >
                        <img
                          src={src}
                          alt="thumb"
                          className="w-full h-full object-cover p-1"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: INFORMAÇÕES RICAS */}
              <div className="md:w-[45%] p-6 md:p-10 bg-gray-50/50 dark:bg-slate-900/30 flex flex-col border-l border-gray-100 dark:border-slate-800">
                {/* Brand & Badge Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center p-1 border border-gray-100 dark:border-slate-700 text-primary">
                      <Tag size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block">
                        Marca
                      </span>
                      <span className="text-sm font-bold text-secondary dark:text-white uppercase">
                        {modals.product.brand || 'Original'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                    <CheckCircle size={12} /> Em Estoque
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-secondary dark:text-white mb-2 leading-tight tracking-tighter">
                  {modals.product.name}
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mb-8 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 w-fit px-2 py-1 rounded">
                  <QrCode size={12} /> REF: {modals.product.reference_code}
                </div>

                <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm">
                  <PriceDisplay
                    value={modals.product.price}
                    isPricesVisible={isPricesVisible}
                    className="text-4xl font-black text-primary tracking-tighter"
                  />
                  {isPricesVisible && (
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 flex items-center gap-1">
                      <ShieldCheck size={12} /> Preço garantido para faturamento
                      à vista
                    </p>
                  )}
                </div>

                {/* Seções de Conteúdo */}
                <div className="space-y-8 flex-1">
                  {/* Descrição */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                      <Info size={14} className="text-primary" /> Descrição do
                      Representante
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {modals.product.description ||
                        'Nenhuma descrição detalhada fornecida para este item.'}
                    </p>
                  </div>

                  {/* Ficha Técnica Extra (Specs) */}
                  {(modals.product as any).specs && (
                    <div className="space-y-3">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                        <FileText size={14} className="text-primary" /> Ficha
                        Técnica Detalhada
                      </h4>
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                        <pre className="text-xs font-sans whitespace-pre-wrap text-gray-600 dark:text-gray-300 leading-loose">
                          {(modals.product as any).specs}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Código de Barras / Identificador */}
                  {((modals.product as any).barcode ||
                    (modals.product as any).sku) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Identificação Logística
                      </h4>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
                        <Barcode
                          value={
                            (modals.product as any).barcode ||
                            (modals.product as any).sku
                          }
                        />
                        <span className="text-[11px] font-mono mt-3 text-gray-400 tracking-[0.3em]">
                          {(modals.product as any).barcode ||
                            (modals.product as any).sku}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER FIXO: QUANTIDADE E COMPRA */}
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl p-2 border border-gray-200 dark:border-slate-700 shadow-sm w-full sm:w-auto justify-between">
                    <button
                      onClick={() =>
                        setDetailQuantity((q) => Math.max(1, q - 1))
                      }
                      className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="min-w-[40px] text-center text-2xl font-black text-secondary dark:text-white">
                      {detailQuantity}
                    </span>
                    <button
                      onClick={() => setDetailQuantity((q) => q + 1)}
                      className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <Button
                    onClick={() => {
                      addToCart(modals.product!, detailQuantity);
                      setModal('product', null);
                    }}
                    className="w-full py-8 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30"
                  >
                    Adicionar ao Pedido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. ZOOM DA IMAGEM (IMERSIVO) --- */}
      {isImageZoomOpen && modals.product && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          {/* Header do Zoom: X para fechar */}
          <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-50">
            <div className="text-white/50 text-xs font-mono tracking-widest uppercase hidden md:block">
              Visualização em Alta Resolução
            </div>
            <button
              onClick={() => setIsImageZoomOpen(false)}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
            >
              <X size={32} />
            </button>
          </div>

          {/* Navegação Lateral no Zoom */}
          {productImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 z-50 p-5 rounded-full bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 z-50 p-5 rounded-full bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}

          <div className="relative w-full h-full p-4 md:p-24 flex items-center justify-center">
            <img
              src={productImages[currentImageIndex]}
              alt="Zoom"
              className="max-w-full max-h-full object-contain animate-in zoom-in-110 duration-700"
            />

            {/* Contador de Imagens no Rodapé do Zoom */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/10 text-white text-sm font-black backdrop-blur-md border border-white/10">
              {currentImageIndex + 1} / {productImages.length}
            </div>
          </div>
        </div>
      )}

      {/* --- OUTROS MODAIS (CHECKOUT, SENHA, ETC) --- */}

      {modals.checkout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md"
            onClick={() => setModal('checkout', false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-secondary uppercase tracking-tighter">
                Finalizar Pedido
              </h2>
              <button
                onClick={() => setModal('checkout', false)}
                className="p-2 text-gray-400"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={onFinalize} className="space-y-4">
              <input
                required
                placeholder="Seu Nome"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
              />
              <input
                required
                placeholder="WhatsApp"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 outline-none"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
              />
              <Button
                type="submit"
                isLoading={loadingStates.submitting}
                className="w-full py-8 text-xl mt-4"
              >
                Confirmar Pedido
              </Button>
            </form>
          </div>
        </div>
      )}

      {orderSuccessData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md" />
          <div className="relative w-full max-w-lg bg-white rounded-[3.5rem] p-10 md:p-14 text-center shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto mb-8 w-24 h-24 flex items-center justify-center rounded-full bg-green-50 text-green-500">
              <CheckCircle size={64} />
            </div>
            <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tighter">
              Pedido Realizado!
            </h2>
            <p className="text-gray-500 mb-8">
              Seu pedido foi processado com sucesso.
            </p>
            <button
              onClick={handleSendWhatsApp}
              className="w-full py-6 bg-[#25D366] text-white rounded-full font-black text-xl flex items-center justify-center gap-3"
            >
              <Send size={20} /> Enviar no WhatsApp
            </button>
            <Button
              variant="ghost"
              onClick={() => {
                setOrderSuccessData(null);
                setModal('cart', false);
              }}
              className="mt-4 w-full"
            >
              Voltar para a loja
            </Button>
          </div>
        </div>
      )}

      <SaveCodeModal
        isSaveModalOpen={!!modals.save && !!savedCode}
        setIsModalOpen={(v: boolean) => setModal('save', v)}
        savedCode={savedCode}
        copyToClipboard={() =>
          savedCode &&
          (navigator.clipboard.writeText(savedCode),
          toast.success('Código copiado!'))
        }
      />

      <LoadCodeModal
        isLoadModalOpen={!!modals.load}
        setIsModalOpen={(v: boolean) => setModal('load', v)}
        loadCodeInput={loadCodeInput}
        setLoadCodeInput={setLoadCodeInput}
        handleLoadCart={handleLoadSubmit}
        isLoadingCart={loadingStates.loadingCart}
      />

      <PasswordModal
        isPasswordModalOpen={!!modals.password}
        setIsPasswordModalOpen={(v: boolean) => setModal('password', v)}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        handleUnlockPrices={handleUnlockPrices}
      />
    </>
  );
}
