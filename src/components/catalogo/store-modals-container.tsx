'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
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
  Maximize2,
  Star,
  Zap,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { SaveCodeModal, LoadCodeModal } from './modals/SaveLoadModals';
import { PriceDisplay } from './PriceDisplay';
import Image from 'next/image';
import { SmartImage } from './SmartImage';
import { Button } from '@/components/ui/button';
import { ProductVariants } from '@/components/product/ProductVariants';
import Barcode from '../ui/Barcode';
import { toast } from 'sonner';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';
import {
  upgradeTo1200w,
  ensure480w,
} from '@/lib/imageHelpers';
import { PasswordModal } from './modals/PasswordModal';

export function StoreModals() {
  const {
    store,
    brandsWithLogos,
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
    blockedForOrders,
    blockedReason,
    favorites,
    toggleFavorite,
    unlockPrices,
    customerSession,
    isRichCatalog,
  } = useStore();

  const cartRef = useRef<HTMLDivElement | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [passwordInput, setPasswordInput] = useState('');
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  // Pinch-to-zoom state (mobile)
  const [pinchScale, setPinchScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const pinchRef = useRef({ initialDistance: 0, initialScale: 1, originX: 0, originY: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomImageRef = useRef<HTMLImageElement | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const panVelocityRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveTimeRef = useRef<number | null>(null);
  const inertiaAnimationRef = useRef<number | null>(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    cnpj: '',
  });
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const copyProductLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      toast.success('Link do produto copiado!');
    } catch (e) {
      toast.error('Não foi possível copiar o link');
    }
  };

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

  useEffect(() => {
    if (blockedForOrders) {
      setModal('blocked', {
        message: 'Este catálogo está temporariamente com pedidos desabilitados. Entre em contato com o lojista para ativar o funcionamento completo.',
        reason: blockedReason || null,
      });
    } else {
      setModal('blocked', null);
    }
  }, [blockedForOrders, blockedReason, setModal]);

  const getProductImages = (productArg?: any): { url480: string; url1200: string; path: string | null }[] => {
    const getImageData = (img: any): { thumb: string; full: string; path: string | null } => {
      const placeholder = '/placeholder.png';
      if (!img) return { thumb: placeholder, full: placeholder, path: null };

      if (typeof img === 'string') {
        return { thumb: img, full: img, path: null };
      }

      if (Array.isArray(img)) {
        const v480 = img.find((v: any) => Number(v?.size) === 480);
        const v1200 = img.find((v: any) => Number(v?.size) === 1200);
        const base = img[0]?.url || placeholder;
        return {
          thumb: v480?.url || v1200?.url || base,
          full: v1200?.url || v480?.url || base,
          path: v1200?.path || v480?.path || img[0]?.path || null,
        };
      }

      if (img?.variants && Array.isArray(img.variants)) {
        const v480 = img.variants.find((v: any) => Number(v?.size) === 480);
        const v1200 = img.variants.find((v: any) => Number(v?.size) === 1200);
        const base = img.url || '/placeholder.png';
        return {
          thumb: v480?.url || v1200?.url || base,
          full: v1200?.url || v480?.url || base,
          path: v1200?.path || v480?.path || img.path || null,
        };
      }

      if (img?.url) {
        return {
          thumb: ensure480w(String(img.url)),
          full: upgradeTo1200w(String(img.url)),
          path: img.path || null,
        };
      }

      return { thumb: placeholder, full: placeholder, path: null };
    };

    if (!productArg && !activeProduct && !modals.product) return [];

    const product: any = productArg || activeProduct || modals.product;
    const out: { url480: string; url1200: string; path: string | null }[] = [];
    const addedPaths = new Set<string>();

    if (product.image_variants && Array.isArray(product.image_variants) && product.image_variants.length > 0) {
      const d = getImageData(product.image_variants);
      out.push({ url480: d.thumb, url1200: d.full, path: d.path });
      if (d.path) addedPaths.add(d.path);
    } else if (product.image_url) {
      const d = getImageData(product.image_url);
      out.push({ url480: d.thumb, url1200: d.full, path: d.path || product.image_path || null });
      if (d.path) addedPaths.add(d.path || product.image_path || '');
    }

    if (Array.isArray(product.gallery_images) && product.gallery_images.length > 0) {
      product.gallery_images.forEach((img: any) => {
        if (!img) return;
        const d = getImageData(img);
        if (d.path && addedPaths.has(d.path)) return;
        out.push({ url480: d.thumb, url1200: d.full, path: d.path });
        if (d.path) addedPaths.add(d.path);
      });
    }

    if (out.length === 0 && product.image_url) {
      const d = getImageData(product.image_url);
      out.push({ url480: d.thumb, url1200: d.full, path: d.path });
    }

    if (out.length === 0) {
      const fallback = '/placeholder.png';
      out.push({ url480: fallback, url1200: fallback, path: null });
    }

    return out;
  };

  const dedupeImages = (arr: { url480: string; url1200: string; path: string | null }[]) => {
    const seen = new Set<string>();
    const res: typeof arr = [];
    for (const it of arr) {
      const key = (it.url480 || it.url1200 || '').trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      res.push(it);
    }
    return res;
  };

  const [activeProduct, setActiveProduct] = useState<any>(modals.product || null);
  const [variantList, setVariantList] = useState<any[]>(
    (modals.product as any)?.variants || []
  );

  const dedupeById = (arr: any[] | undefined) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const it of arr) {
      if (!it) continue;
      const id = String(it.id || it.product_id || '');
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(it);
    }
    return out;
  };

  const displayProduct = activeProduct || modals.product || null;
  const supabase = createClient();

  useEffect(() => {
    const prod = modals.product || null;
    setActiveProduct(prod);
    if (prod && Array.isArray((prod as any).variants) && (prod as any).variants.length > 0) {
      const rawVars = (prod as any).variants as any[];
      const filteredByUser = store?.user_id
        ? rawVars.filter((v) => String(v.user_id) === String(store.user_id) || !v.user_id)
        : rawVars;
      setVariantList(dedupeById(filteredByUser));
    } else {
      setVariantList([]);
    }
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [modals.product, store?.user_id]);

  useEffect(() => {
    let mounted = true;
    const fetchFullProductIfNeeded = async () => {
      const p = modals.product || null;
      if (!p || !p.id) return;

      const hasImages = Boolean(
        p.image_url || p.image_path || (Array.isArray(p.image_variants) && p.image_variants.length > 0) || (Array.isArray(p.gallery_images) && p.gallery_images.length > 0)
      );
      if (hasImages) return;

      try {
        const { data } = await supabase
          .from('products')
          .select('id, reference_code, image_url, image_path, color, name, brand, gallery_images, image_variants, is_active')
          .eq('id', p.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!mounted) return;
        if (data) {
          const normalized = { ...p, ...data };
          setActiveProduct(normalized);
        }
      } catch (e) {
        console.error('Erro ao buscar produto completo para modal:', e);
      }
    };

    fetchFullProductIfNeeded();
    return () => {
      mounted = false;
    };
  }, [modals.product?.id]);

  useEffect(() => {
    let mounted = true;

    const loadVariants = async () => {
      try {
        const prod = modals.product || activeProduct;
        if (!prod || !prod.reference_id) return;

        if (variantList && variantList.length > 0 && variantList[0]?.reference_id === prod.reference_id) return;

        const { data, error } = await supabase
          .from('products')
          .select('id, reference_code, reference_id, image_url, image_path, color, name, brand, gallery_images, image_variants, user_id, is_active')
          .eq('reference_id', prod.reference_id)
          .eq('is_active', true)
          .order('id', { ascending: true });

        if (!mounted || error || !data) return;

        const normalized = data.map((p: any) => {
          let thumb: string | null = null;
          if (p.image_path) {
            thumb = `/api/storage-image?path=${encodeURIComponent(p.image_path)}&format=webp&q=80&w=480`;
          } else if (p.image_url) {
            const s = String(p.image_url);
            if (s.startsWith('/api/storage-image') || s.includes('?path=')) {
              thumb = s;
            } else {
              thumb = ensure480w(s);
            }
          }
          return { ...p, image_url: thumb || p.image_url || null, image_path: p.image_path || null };
        });

        const filtered = store?.user_id
          ? (normalized as any[]).filter((p) => String(p.user_id) === String(store.user_id) || !p.user_id)
          : (normalized as any[]);
        setVariantList(dedupeById(filtered));
      } catch (e) {
        console.error('[store-modals] loadVariants error', e);
      }
    };

    loadVariants();
    return () => {
      mounted = false;
    };
  }, [modals.product?.reference_id, activeProduct?.reference_id, store.user_id]);

  const productImages = useMemo(() => {
    const imgs = getProductImages(displayProduct);
    return dedupeImages(imgs);
  }, [displayProduct]);

  const techRef = useRef<HTMLDivElement | null>(null);
  const [techOpen, setTechOpen] = useState(false);

  const cartTotal = useMemo(
    () => cart.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0),
    [cart]
  );

  useEffect(() => {
    setCurrentImageIndex(0);
    setDetailQuantity(1);
  }, [displayProduct]);

  const SWIPE_THRESHOLD = 80;

  const handleImageDragEnd = (_: any, info: any) => {
    const offsetX = info?.offset?.x || 0;
    if (offsetX > SWIPE_THRESHOLD) {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
    } else if (offsetX < -SWIPE_THRESHOLD) {
      setCurrentImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
    }
  };

  const getDistance = (t0: any, t1: any) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const getMidpoint = (t0: any, t1: any) => {
    return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
  };

  const onZoomTouchStart = (e: React.TouchEvent) => {
    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current);
      inertiaAnimationRef.current = null;
      panVelocityRef.current = null;
    }

    if (e.touches.length === 2) {
      e.preventDefault();
      const d = getDistance(e.touches[0], e.touches[1]);
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      pinchRef.current.initialDistance = d;
      pinchRef.current.initialScale = pinchScale;
      pinchRef.current.originX = mid.x;
      pinchRef.current.originY = mid.y;
      setIsPinching(true);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < 300) {
        const dx = Math.abs(last.x - t.clientX);
        const dy = Math.abs(last.y - t.clientY);
        if (dx < 30 && dy < 30) {
          const container = zoomContainerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const tapX = t.clientX - rect.left;
            const tapY = t.clientY - rect.top;
            const targetZoom = pinchScale > 1.01 ? 1 : 2;
            setPinchScale(() => {
              const newScale = targetZoom;
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const relX = tapX - centerX;
              const relY = tapY - centerY;
              const newPanX = -relX * (newScale - 1);
              const newPanY = -relY * (newScale - 1);
              setPan((p) => clampPan({ x: newPanX, y: newPanY }, newScale, container));
              return newScale;
            });
            lastTapRef.current = null;
            return;
          }
        }
      }
      lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };

      if (pinchScale > 1) {
        panRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastMoveTimeRef.current = Date.now();
      }
    }
  };

  const onZoomTouchMove = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const d = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.max(1, Math.min(4, (pinchRef.current.initialScale * d) / pinchRef.current.initialDistance));
      setPinchScale(newScale);
    } else if (pinchScale > 1 && e.touches.length === 1 && panRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panRef.current.x;
      const dy = e.touches[0].clientY - panRef.current.y;
      const now = Date.now();
      const dt = lastMoveTimeRef.current ? Math.max(1, now - lastMoveTimeRef.current) : 16;
      panVelocityRef.current = { x: dx / dt, y: dy / dt };
      lastMoveTimeRef.current = now;
      panRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPan((p) => {
        const container = zoomContainerRef.current;
        const next = { x: p.x + dx, y: p.y + dy };
        if (container) return clampPan(next, pinchScale, container);
        return next;
      });
    }
  };

  const onZoomTouchEnd = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length < 2) {
      setIsPinching(false);
      pinchRef.current.initialDistance = 0;
      pinchRef.current.initialScale = pinchScale;
    }
    if (e.touches.length === 0) {
      panRef.current = null;
      if (pinchScale <= 1.01) {
        setPinchScale(1);
        setPan({ x: 0, y: 0 });
      } else {
        const vel = panVelocityRef.current;
        const container = zoomContainerRef.current;
        if (vel && container) {
          startInertia(vel, container);
        }
      }
    }
  };

  const clampPan = (p: { x: number; y: number }, scale: number, container: HTMLDivElement) => {
    try {
      const img = zoomImageRef.current;
      const rect = container.getBoundingClientRect();
      const imgRect = img ? img.getBoundingClientRect() : { width: rect.width, height: rect.height };
      const scaledW = imgRect.width * scale;
      const scaledH = imgRect.height * scale;
      const maxX = Math.max(0, (scaledW - rect.width) / 2);
      const maxY = Math.max(0, (scaledH - rect.height) / 2);
      return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
    } catch (e) {
      return p;
    }
  };

  const startInertia = (initialVelocity: { x: number; y: number }, container: HTMLDivElement) => {
    let vx = initialVelocity.x * 16;
    let vy = initialVelocity.y * 16;
    const friction = 0.92;

    const step = () => {
      vx *= friction;
      vy *= friction;
      setPan((p) => {
        const next = { x: p.x + vx, y: p.y + vy };
        const clamped = clampPan(next, pinchScale, container);
        if (clamped.x !== next.x) vx *= 0.6;
        if (clamped.y !== next.y) vy *= 0.6;
        return clamped;
      });

      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        inertiaAnimationRef.current = requestAnimationFrame(step);
      } else {
        inertiaAnimationRef.current = null;
        panVelocityRef.current = null;
      }
    };

    if (inertiaAnimationRef.current) cancelAnimationFrame(inertiaAnimationRef.current);
    inertiaAnimationRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (inertiaAnimationRef.current) cancelAnimationFrame(inertiaAnimationRef.current);
    };
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    const container = zoomContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const targetZoom = pinchScale > 1.01 ? 1 : 2;
    setPinchScale(() => {
      const newScale = targetZoom;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const relX = clickX - centerX;
      const relY = clickY - centerY;
      const newPanX = -relX * (newScale - 1);
      const newPanY = -relY * (newScale - 1);
      setPan((p) => clampPan({ x: newPanX, y: newPanY }, newScale, container));
      return newScale;
    });
  };

  useEffect(() => {
    if (!orderSuccessData) {
      setSavedCode(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setSavedCode(null);
        const code = await handleSaveOrder();
        if (!mounted) return;
        if (code) {
          setSavedCode(code);
        }
      } catch (e) {
        console.error('Erro ao salvar pedido automaticamente:', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orderSuccessData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isImageZoomOpen) return;

      if (e.key === 'ArrowRight') {
        setCurrentImageIndex((prev) =>
          prev < productImages.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((prev) =>
          prev > 0 ? prev - 1 : productImages.length - 1
        );
      } else if (e.key === 'Escape') {
        setIsImageZoomOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageZoomOpen, productImages.length]);

  const onFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleFinalizeOrder(customerInfo);
    if (success) setModal('checkout', false);
  };

  useEffect(() => {
    const el = cartRef.current;
    if (!el) return;
    try {
      (el as any).inert = !!modals.checkout;
    } catch (e) { }
    if (modals.checkout) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  }, [modals.checkout]);

  return (
    <>
      {/* --- MODAL CARRINHO --- */}
      {modals.cart && (
        <div ref={cartRef} className="fixed inset-0 z-[140] flex justify-end">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/40 backdrop-blur-sm"
            onClick={() => setModal('cart', false)}
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-secondary">
                <ShoppingCart size={24} className="text-primary" /> {isRichCatalog ? 'Seu Orçamento' : 'Meu Carrinho'}
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
                      <SmartImage
                        product={{
                          id: item.id,
                          name: item.name,
                          brand: item.brand,
                          image_url: item.image_url,
                          image_path: item.image_path,
                          image_variants: item.image_variants || item.variants || [],
                          external_image_url: (item as any).external_image_url || null,
                        }}
                        initialSrc={item.image_url}
                        variant="thumbnail"
                        preferredSize={480}
                        className="h-full w-full"
                        imgClassName="object-contain p-2"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{item.name}</div>
                        {item.brand && <div className="text-xs text-gray-500">{item.brand}</div>}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1">
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1">
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-4">
                          <PriceDisplay value={item.price * item.quantity} isPricesVisible={isPricesVisible} />
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t p-6 space-y-4">
                <div className="flex justify-between text-xl font-black text-secondary">
                  <span>Total</span>
                  <PriceDisplay value={cartTotal} isPricesVisible={isPricesVisible} />
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
                  onClick={() => {
                    setModal('cart', false);
                    setModal('checkout', true);
                  }}
                  className="w-full py-7 text-lg uppercase tracking-tighter"
                >
                  {isRichCatalog ? 'Finalizar Pedido Agora - enviar para Representante' : 'Finalizar Pedido Agora'}
                </Button>
                {isRichCatalog && (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-center text-slate-400 leading-relaxed">
                    As condições comerciais serão validadas com o representante antes da confirmação.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL DETALHES DO PRODUTO (MODERNO/IMERSIVO) --- */}
      {displayProduct && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 md:p-4">
          <div className="absolute inset-0 bg-[#0d1b2c]/95 backdrop-blur-xl animate-in fade-in" onClick={() => setModal('product', null)} />

          <div className="relative w-full max-w-6xl h-full max-h-[95vh] md:max-h-[85vh] bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">
            <button onClick={() => setModal('product', null)} className="absolute right-6 top-6 z-[150] p-3 rounded-full bg-black/5 hover:bg-black/10 transition-all">
              <X size={24} className="text-secondary" />
            </button>

            {/* ESQUERDA: Showcase de Imagem */}
            <div className="w-full md:w-1/2 h-[45%] md:h-full bg-white flex flex-col relative border-b md:border-b-0 md:border-r border-gray-100 min-h-0">
              <div className="flex-1 relative cursor-pointer group flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden" onClick={() => setIsImageZoomOpen(true)}>
                {(() => {
                  const current = productImages[currentImageIndex] || {
                    url480: '/images/product-placeholder.svg',
                    url1200: '/images/product-placeholder.svg',
                    path: null,
                  };

                  return (
                    <>
                      <img
                        src={current.url480 || current.url1200}
                        alt={displayProduct?.name}
                        loading="eager"
                        className="w-auto max-w-full max-h-[50vh] md:max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute bottom-4 right-4 bg-black/30 p-2 rounded-full text-white z-20 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Maximize2 size={20} />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Thumbnails */}
              {displayProduct && productImages.length > 1 && (
                <div className="h-24 px-6 pb-6 overflow-x-auto no-scrollbar">
                  <div className="flex gap-3 justify-center items-center">
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 transition-all overflow-hidden flex-shrink-0 ${currentImageIndex === idx ? 'border-primary ring-4 ring-primary/10' : 'border-gray-100 opacity-50'}`}
                      >
                        <SmartImage
                          product={{
                            id: displayProduct!.id,
                            name: displayProduct!.name,
                            brand: displayProduct!.brand,
                            image_url: img.url480,
                            image_path: img.path,
                          }}
                          preferredSize={480}
                          initialSrc={img.url480}
                          className="absolute inset-0 w-full h-full"
                          variant="thumbnail"
                          imgClassName="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DIREITA: Conteúdo e Checkout */}
            <div className="w-full md:w-1/2 h-[55%] md:h-full flex flex-col bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 pb-28 md:pb-12 custom-scrollbar">
                <div className="flex items-center gap-4 mb-4">
                  {(() => {
                    const productBrand = displayProduct?.brand || null;
                    const candidateLogo =
                      displayProduct?.brand_logo_url ||
                      displayProduct?.single_brand_logo_url ||
                      displayProduct?.brand_logo ||
                      (brandsWithLogos && productBrand
                        ? (brandsWithLogos.find((b: any) => b.name === productBrand) || {}).logo_url
                        : null);

                    if (candidateLogo) {
                      return (
                        <div className="flex items-center gap-2">
                          <img src={candidateLogo} alt={productBrand || 'Marca'} className="h-8 w-auto object-contain rounded-md bg-white p-1" />
                        </div>
                      );
                    }

                    return (
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                        {productBrand || 'Original'}
                      </span>
                    );
                  })()}

                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    REF: {displayProduct?.reference_code || displayProduct?.id?.slice(0, 8)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {displayProduct?.is_launch && (
                    <span className="flex items-center gap-2 rounded-md bg-purple-600 px-2 py-1 text-[11px] font-black text-white shadow-sm">
                      <Zap size={14} /> <span>Lançamento</span>
                    </span>
                  )}
                  {displayProduct?.is_best_seller && (
                    <span className="flex items-center gap-2 rounded-md bg-yellow-400 px-2 py-1 text-[11px] font-black text-yellow-900 shadow-sm">
                      <Star size={14} /> <span>Best Seller</span>
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start gap-4 mb-6">
                  <h2 className="text-2xl md:text-3xl font-black text-secondary leading-none tracking-tighter">
                    {displayProduct?.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <button onClick={copyProductLink} title="Copiar link do produto" className="p-3 rounded-full bg-white shadow-sm hover:shadow-md transition-all text-gray-400 hover:text-primary">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 3h7v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 21H3V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    <button onClick={() => displayProduct && toggleFavorite(displayProduct.id)} className="p-4 rounded-full bg-white shadow-sm hover:shadow-md transition-all">
                      <Heart size={24} className={displayProduct && favorites.includes(displayProduct.id) ? 'fill-red-500 text-red-500' : 'text-gray-200'} />
                    </button>
                  </div>
                </div>

                {variantList && Array.isArray(variantList) && variantList.length > 0 && (
                  <div className="mb-6">
                    <ProductVariants
                      currentReferenceId={displayProduct?.reference_id}
                      variants={variantList}
                      currentProductId={displayProduct?.id}
                      onVariantSelect={async (variant) => {
                        try {
                          const { data } = await supabase
                            .from('products')
                            .select('*, gallery_images, image_variants, is_active')
                            .eq('id', variant.id)
                            .eq('is_active', true)
                            .maybeSingle();

                          if (data) {
                            const resolveThumb = (p: any) => {
                              if (Array.isArray(p.image_variants) && p.image_variants.length > 0) {
                                const v480 = p.image_variants.find((v: any) => v && Number(v?.size) === 480);
                                if (v480) {
                                  if (v480.url) return v480.url;
                                  if (v480.path) return buildSupabaseImageUrl(v480.path);
                                }
                                const first = p.image_variants[0];
                                if (Array.isArray(first?.variants) && first.variants.length) {
                                  const sub480 = first.variants.find((s: any) => Number(s?.size) === 480);
                                  if (sub480) return sub480.url || (sub480.path ? buildSupabaseImageUrl(sub480.path) : null);
                                }
                              }
                              if (p.image_url) {
                                try {
                                  return String(p.image_url).replace('-1200w', '-480w');
                                } catch (e) {
                                  return p.image_url;
                                }
                              }
                              if (p.image_path) return buildSupabaseImageUrl(p.image_path);
                              return null;
                            };

                            const thumb = ensure480w(resolveThumb(data));
                            const normalized = {
                              ...data,
                              image_url: thumb || data.image_url || null,
                              image_path: data.image_path || null,
                            };

                            setActiveProduct(normalized);
                            setModal('product', normalized);
                            setCurrentImageIndex(0);
                          }
                        } catch (e) {
                          console.error('Erro ao carregar variante:', e);
                        }
                      }}
                    />
                  </div>
                )}

                <div className="mb-8">
                  {(() => {
                    const descriptionText = displayProduct?.description || 'Produto de alta qualidade com acabamento impecável, ideal para quem busca estilo e durabilidade.';
                    const characterLimit = 160;
                    const isLongDescription = descriptionText.length > characterLimit;

                    return (
                      <>
                        <p className={`text-gray-500 text-sm md:text-base leading-relaxed text-justify ${(!isDescriptionExpanded && isLongDescription) ? 'line-clamp-3' : ''}`}>
                          {descriptionText}
                        </p>
                        {isLongDescription && (
                          <button onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-primary text-xs font-black uppercase tracking-widest mt-2 hover:underline">
                            {isDescriptionExpanded ? 'Ver menos' : 'Ler descrição completa'}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

                {displayProduct?.technical_specs && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-secondary">
                        <Info size={18} />
                        <h3 className="font-black uppercase text-xs tracking-widest">Ficha Técnica</h3>
                      </div>
                      <button
                        onClick={() => {
                          const willOpen = !techOpen;
                          setTechOpen(willOpen);
                          if (willOpen) {
                            setTimeout(() => {
                              techRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 120);
                          }
                        }}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                        aria-expanded={techOpen}
                      >
                        {techOpen ? <Minus size={16} /> : <Plus size={16} />}
                      </button>
                    </div>

                    <div ref={techRef} className={`overflow-hidden transition-[max-height,opacity] duration-300 ${techOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        {(() => {
                          const raw = displayProduct?.technical_specs as any;
                          let specs: Record<string, any> = {};
                          if (!raw) return <p className="text-sm text-gray-500">Sem especificações técnicas.</p>;
                          if (typeof raw === 'object') {
                            specs = raw as Record<string, any>;
                          } else if (typeof raw === 'string') {
                            try {
                              const parsed = JSON.parse(raw);
                              if (parsed && typeof parsed === 'object') specs = parsed;
                              else specs = { Descrição: String(raw) };
                            } catch (e) {
                              specs = { Descrição: String(raw) };
                            }
                          }

                          return (
                            <table className="w-full text-xs">
                              <tbody className="divide-y divide-gray-50">
                                {Object.entries(specs).map(([key, val], i) => (
                                  <tr key={i} className="group">
                                    <td className="py-3 font-bold text-gray-400 group-hover:text-primary transition-colors">{key}</td>
                                    <td className="py-3 text-right text-secondary font-medium">{String(val)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {displayProduct?.barcode && String(displayProduct.barcode).replace(/\D/g, '').length > 0 && (
                  <div className="p-6 bg-secondary/5 rounded-3xl border border-dashed border-secondary/10 flex flex-col items-center justify-center gap-4 mb-8">
                    <div className="flex items-center gap-2 text-secondary/40">
                      <BarcodeIcon size={16} />
                      <span className="text-[10px] font-bold uppercase">Código de Barras (EAN)</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl">
                      <Barcode value={String(displayProduct?.barcode)} />
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER DE AÇÃO FIXO */}
              <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto z-40 p-4 md:p-10 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl">
                      <button onClick={() => setDetailQuantity((q: number) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm">
                        <Minus size={18} />
                      </button>
                      <span className="text-xl font-black w-8 text-center">{detailQuantity}</span>
                      <button onClick={() => setDetailQuantity((q: number) => q + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm">
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Subtotal</span>
                      <PriceDisplay value={(displayProduct?.price || 0) * detailQuantity} isPricesVisible={isPricesVisible} size="large" className="text-2xl font-black" />
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (displayProduct) {
                        setIsAdded(true);
                        addToCart(displayProduct, detailQuantity);
                        setTimeout(() => {
                          setModal('product', null);
                          setIsAdded(false);
                        }, 600);
                      }
                    }}
                    className={`w-full py-4 md:py-8 text-xl font-bold uppercase tracking-tighter shadow-2xl rounded-none md:rounded-2xl transition-all active:scale-80 ${isAdded ? 'bg-green-500 hover:bg-green-500' : 'bg-primary shadow-primary/30'}`}
                  >
                    <strong className="font-bold">{isAdded ? '✓ Adicionado!' : 'Adicionar ao Pedido'}</strong>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* --- OVERLAY DE ZOOM FULLSCREEN (1200w) --- */}
          {isImageZoomOpen && (
            <div
              className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
              style={{ zIndex: 999999 }} // Força o overlay de zoom a ficar acima de tudo
              onClick={() => {
                setPinchScale(1);
                setPan({ x: 0, y: 0 });
                setIsImageZoomOpen(false);
              }}
            >
              <button
                className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ zIndex: 1000001 }}
                onClick={() => {
                  setPinchScale(1);
                  setPan({ x: 0, y: 0 });
                  setIsImageZoomOpen(false);
                }}
              >
                <X size={32} />
              </button>

              {productImages.length > 1 && pinchScale <= 1.01 && (
                <div style={{ zIndex: 1000001 }}>
                  <button
                    className="absolute left-4 md:left-10 p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                    }}
                  >
                    <ChevronLeft size={48} strokeWidth={1.5} />
                  </button>

                  <button
                    className="absolute right-4 md:right-10 p-3 md:p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                    }}
                  >
                    <ChevronRight size={48} strokeWidth={1.5} />
                  </button>
                </div>
              )}

              <div
                ref={zoomContainerRef}
                className="relative w-full h-full flex items-center justify-center p-2 md:p-12"
                onClick={(e) => e.stopPropagation()}
                style={{ touchAction: 'none', zIndex: 1000000 }}
              >
                {/* TRATAMENTO MOBILE DE HARDWARE: Isolamos completamente o toque do Framer Motion usando listeners nativos */}
                <div 
                  className="w-full h-full flex items-center justify-center"
                  onTouchStart={onZoomTouchStart}
                  onTouchMove={onZoomTouchMove}
                  onTouchEnd={onZoomTouchEnd}
                >
                  <img
                    ref={zoomImageRef as any}
                    src={productImages[currentImageIndex]?.url1200}
                    alt="Visualização do Produto"
                    style={{
                      backgroundImage: `url(${productImages[currentImageIndex]?.url480})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${pinchScale})`,
                      touchAction: 'none',
                      transformOrigin: 'center center',
                    }}
                    className="max-w-full max-h-[75vh] md:max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300 select-none will-change-transform"
                  />
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ zIndex: 1000001 }}>
                  <span className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-medium tracking-widest border border-white/10">
                    {currentImageIndex + 1} / {productImages.length}
                  </span>
                  {pinchScale > 1.01 && (
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-white text-[10px] uppercase font-bold tracking-wider animate-in fade-in">
                      Mova o dedo para navegar nos detalhes do óculos
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAIS DE APOIO */}
      <SaveCodeModal
        isSaveModalOpen={!!modals.save}
        setIsModalOpen={(v) => setModal('save', v)}
        savedCode={savedCode}
        copyToClipboard={() => savedCode && navigator.clipboard.writeText(savedCode)}
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
          else setPasswordInput('');
        }}
      />

      {/* MODAL CHECKOUT IDENTIFICAÇÃO */}
      {modals.checkout && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0d1b2c]/80 backdrop-blur-md"
            onClick={() => {
              setModal('checkout', false);
              setModal('cart', true);
            }}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] p-8 md:p-12 animate-in zoom-in-95 shadow-2xl">
            <div className="absolute right-8 top-8">
              <button
                onClick={() => {
                  setModal('checkout', false);
                  setModal('cart', true);
                }}
                className="p-2 bg-gray-100 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <h2 className="text-3xl font-black mb-8 tracking-tighter text-secondary">Identificação</h2>
            {isRichCatalog && (
              <p className="-mt-5 mb-6 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Você está enviando um orçamento para análise do consultor.
              </p>
            )}
            <form onSubmit={onFinalize} className="space-y-4">
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nome Completo"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="WhatsApp (DDD + Número)"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
              <input
                required
                className="w-full p-5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20"
                placeholder="E-mail"
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              />
              <Button type="submit" isLoading={loadingStates.submitting} loadingText="Finalizando..." className="w-full py-7 text-lg uppercase font-black">
                {isRichCatalog ? 'Enviar para Análise' : 'Confirmar Pedido'}
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
            <h2 className="text-4xl font-black mb-4 tracking-tighter">Tudo pronto!</h2>
            <p className="text-gray-500 mb-10 text-lg">
              {isRichCatalog ? 'Seu orçamento foi enviado para análise com sucesso.' : 'Seu pedido foi processado com sucesso.'}
            </p>
            <div className="space-y-4">
              <button onClick={handleSendWhatsApp} className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3">
                <Send size={20} /> Chamar no WhatsApp
              </button>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={async () => await handleDownloadPDF()} className="w-full py-3 bg-white border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-2">
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