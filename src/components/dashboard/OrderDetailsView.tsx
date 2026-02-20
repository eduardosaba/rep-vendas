"use client";

import React from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Package, ZoomIn, ChevronDown, X } from 'lucide-react';
import { SmartImage } from '../catalogo/SmartImage';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';

// Simple EAN-13 barcode renderer (SVG)
function EAN13Barcode({ code, width = 120, height = 48 }: { code: string; width?: number; height?: number }) {
  const clean = (code || '').replace(/[^0-9]/g, '');
  if (!clean || (clean.length !== 13 && clean.length !== 8)) {
    return <div className="text-xs text-slate-500">{code}</div>;
  }

  const isEAN13 = clean.length === 13;
  const digits = clean.split('').map((d) => Number(d));

  // Encoding tables
  const L = {
    '0': '0001101',
    '1': '0011001',
    '2': '0010011',
    '3': '0111101',
    '4': '0100011',
    '5': '0110001',
    '6': '0101111',
    '7': '0111011',
    '8': '0110111',
    '9': '0001011',
  } as Record<string, string>;
  const G = {
    '0': '0100111',
    '1': '0110011',
    '2': '0011011',
    '3': '0100001',
    '4': '0011101',
    '5': '0111001',
    '6': '0000101',
    '7': '0010001',
    '8': '0001001',
    '9': '0010111',
  } as Record<string, string>;
  const R = {
    '0': '1110010',
    '1': '1100110',
    '2': '1101100',
    '3': '1000010',
    '4': '1011100',
    '5': '1001110',
    '6': '1010000',
    '7': '1000100',
    '8': '1001000',
    '9': '1110100',
  } as Record<string, string>;

  // Parity pattern for first digit
  const parity = {
    '0': ['L','L','L','L','L','L'],
    '1': ['L','L','G','L','G','G'],
    '2': ['L','L','G','G','L','G'],
    '3': ['L','L','G','G','G','L'],
    '4': ['L','G','L','L','G','G'],
    '5': ['L','G','G','L','L','G'],
    '6': ['L','G','G','G','L','L'],
    '7': ['L','G','L','G','L','G'],
    '8': ['L','G','L','G','G','L'],
    '9': ['L','G','G','L','G','L'],
  } as Record<string, string[]>;

  // Build full pattern string of 1/0 for bars
  let pattern = '';
  if (isEAN13) {
    // start guard
    pattern += '101';
    const first = String(digits[0]);
    const left = digits.slice(1, 7).map(String);
    const right = digits.slice(7, 13).map(String);
    const p = parity[first];
    left.forEach((d, i) => {
      pattern += (p[i] === 'L' ? L[d] : G[d]);
    });
    // center guard
    pattern += '01010';
    right.forEach((d) => (pattern += R[d]));
    // end guard
    pattern += '101';
  } else {
    // EAN-8: start + left(4 L) + center + right(4 R) + end
    pattern += '101';
    const left = digits.slice(0,4).map(String);
    const right = digits.slice(4,8).map(String);
    left.forEach((d) => (pattern += L[d]));
    pattern += '01010';
    right.forEach((d) => (pattern += R[d]));
    pattern += '101';
  }

  const totalBars = pattern.length;
  const barWidth = Math.max(1, Math.floor(width / totalBars));
  const svgWidth = totalBars * barWidth;
  const barHeight = Math.max(24, height - 14);

  return (
    <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Código de barras ${code}`}>
      <rect width={svgWidth} height={height} fill="transparent" />
      <g>
        {pattern.split('').map((bit, i) => (
          bit === '1' ? (
            <rect key={i} x={i * barWidth} y={0} width={barWidth} height={barHeight} fill="#111827" />
          ) : null
        ))}
      </g>
      <text x={svgWidth / 2} y={height - 2} fontSize={10} fill="#374151" textAnchor="middle" fontFamily="monospace">{code}</text>
    </svg>
  );
}

export function OrderDetailsView({ order }: { order: any }) {
  const [lightbox, setLightbox] = React.useState<null | { src: string; product: any }>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    if (lightbox) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const fmt = React.useMemo(
    () =>
      new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    []
  );

  const normalize = (s: string) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const [brandLogos, setBrandLogos] = React.useState<Record<string, string | null>>({});
  const [brandLogoFailed, setBrandLogoFailed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) return;
        const { data } = await supabase
          .from('brands')
          .select('name,logo_url')
          .eq('user_id', user.id);
        if (!mounted) return;
        const map: Record<string, string | null> = {};
        (data || []).forEach((b: any) => {
          if (b && b.name) map[normalize(String(b.name))] = b.logo_url || null;
        });
        setBrandLogos(map);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const safeImg = (url: any) => {
    if (!url || typeof url !== 'string') return null;
    if (url.includes('/storage/v1/object/public/')) {
      try {
        const parts = url.split('/storage/v1/object/public/');
        const path = parts.length > 1 ? parts[1] : parts[0];
        const cleanPath = path.split('?')[0];
        return `/api/storage-image?path=${encodeURIComponent(cleanPath)}`;
      } catch (e) {
        return url;
      }
    }
    return url;
  };

  const safeImageUrl = (url: any) => {
    const PLACEHOLDER_DATA_URI =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>" +
          "<rect width='100%' height='100%' fill='%23f1f5f9'/>" +
          "<g fill='%23cbd5e1' transform='translate(80,120)'>" +
          "<rect width='240' height='160' rx='12'/>" +
          "</g>" +
          "<text x='200' y='360' font-size='14' text-anchor='middle' fill='%239ca3af' font-family='Arial, Helvetica, sans-serif'>Imagem indisponível</text>" +
          "</svg>"
      );

    const u = safeImg(url);
    if (!u || typeof u !== 'string') return PLACEHOLDER_DATA_URI;
    const trimmed = u.trim();
    return trimmed === '' ? PLACEHOLDER_DATA_URI : trimmed;
  };

  const calculatedTotal =
    order?.order_items?.reduce((acc: number, item: any) => {
      return acc + (item.quantity || 0) * (item.unit_price || item.price || 0);
    }, 0) || 0;

  const groups = React.useMemo(() => {
    const g: Record<string, any[]> = {};
    (order?.order_items || []).forEach((item: any) => {
      const brandKey = (item?.products?.brand || item.brand || item.product_brand || 'Sem Marca')
        .toString()
        .trim();
      const key = brandKey || 'Sem Marca';
      if (!g[key]) g[key] = [];
      g[key].push(item);
    });
    return g;
  }, [order]);

  // Identifica o primeiro item do pedido para marcar sua imagem como LCP/priority
  const lcpItemId = order?.order_items && order.order_items.length > 0 ? order.order_items[0].id : null;

  const openLightbox = (src: string, product: any) => setLightbox({ src, product });

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={18} /> Itens do Pedido
          </h2>
          <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
            {(order?.order_items || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0)} un.
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {Object.keys(groups).map((brand) => {
            const items = groups[brand] || [];

            // procura logo no mapa de marcas (prioritário) ou na galeria dos produtos do grupo
            let brandLogo: string | null = null;
            const brandKeyLower = normalize(brand || '');
            if (brandKeyLower && brandLogos[brandKeyLower]) {
              brandLogo = brandLogos[brandKeyLower] as string;
            }
            
            if (!brandLogo) {
            for (const it of items) {
              const pics = it?.products?.product_images || it?.products?.gallery_images || null;
              if (Array.isArray(pics) && pics.length > 0) {
                const primary = pics.find((p: any) => p.is_primary) || pics[0];
                if (primary) {
                  const cand = primary.url || primary.path || primary.storage_path || null;
                  if (cand) {
                    const resolved = buildSupabaseImageUrl(cand) || (typeof cand === 'string' && (cand.startsWith('http') ? cand : null));
                    if (resolved) {
                      brandLogo = resolved;
                      break;
                    }
                  }
                }
              }
            }
            }

            const groupTotalUnits = items.reduce((a: number, i: any) => a + (i.quantity || 0), 0);
            const groupTotalValue = items.reduce((a: number, i: any) => a + ((i.quantity || 0) * (i.unit_price || i.price || 0)), 0);

            return (
              <div key={brand} className="py-4">
                <div className="flex items-center gap-3 px-6 mb-3">
                  <div className="w-12 h-12 rounded-md bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {brandLogo && !brandLogoFailed[brandKeyLower] ? (
                      <Image
                        src={brandLogo}
                        alt={brand}
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                        onError={() => setBrandLogoFailed((s) => ({ ...s, [brandKeyLower]: true }))}
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700">{brand}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{brand}</h3>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">{groupTotalUnits} un. — {fmt.format(groupTotalValue)}</div>
                        <button
                          aria-expanded={!collapsed[brand]}
                          onClick={() => setCollapsed((s) => ({ ...s, [brand]: !s[brand] }))}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <ChevronDown className={`transition-transform ${collapsed[brand] ? '-rotate-90' : 'rotate-0'}`} size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {!collapsed[brand] && (
                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {items.map((item: any) => {
                      const candidate = item.image_url || item.external_image_url || item.products?.image_url || item.products?.external_image_url || null;
                      const displayImage = candidate;
                      const unit = item.unit_price ?? item.price ?? 0;

                      const rawVariants = item.products?.optimized_variants || item.products?.image_variants || null;
                      let variant480: any = null;
                      if (Array.isArray(rawVariants)) variant480 = rawVariants.find((v: any) => Number(v.size) === 480) || null;

                      let dbgInitial = null;
                      try {
                        dbgInitial = (variant480 && (variant480.url || (variant480.path && buildSupabaseImageUrl(variant480.path)))) || (typeof displayImage === 'string' ? buildSupabaseImageUrl(displayImage, { width: 480 }) : null) || safeImageUrl(displayImage);
                        // debug removed
                      } catch (err) {
                        // ignore
                      }

                      const rawVariantsForModal = item.products?.optimized_variants || item.products?.image_variants || null;
                      let variantLarge: any = null;
                      if (Array.isArray(rawVariantsForModal) && rawVariantsForModal.length > 0) {
                        variantLarge = rawVariantsForModal.find((v: any) => Number(v.size) >= 1024) || rawVariantsForModal.sort((a: any, b: any) => Number(b.size) - Number(a.size))[0];
                      }

                      const modalSrc = (variantLarge && (variantLarge.url || (variantLarge.path && buildSupabaseImageUrl(variantLarge.path)))) || (typeof displayImage === 'string' ? buildSupabaseImageUrl(displayImage, { width: 1200 }) : null) || safeImageUrl(displayImage);

                      return (
                        <div key={item.id} className="flex flex-col py-4 border-b last:border-0 border-slate-100 dark:border-slate-800 px-6">
                          <div className="w-full flex items-start gap-4">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => openLightbox(modalSrc, item.products)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') openLightbox(modalSrc, item.products);
                              }}
                              className="w-28 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800 flex-shrink-0 cursor-pointer relative"
                            >
                              <SmartImage
                                product={{ ...(item.products || {}), image_url: item.products?.image_url || item.image_url || item.external_image_url, external_image_url: item.products?.external_image_url || item.external_image_url, optimized_variants: item.products?.optimized_variants || item.products?.image_variants, image_variants: item.products?.image_variants }}
                                initialSrc={(variant480 && (variant480.url || (variant480.path && buildSupabaseImageUrl(variant480.path)))) || (typeof displayImage === 'string' ? buildSupabaseImageUrl(displayImage, { width: 480 }) : null) || safeImageUrl(displayImage)}
                                preferredSize={480}
                                variant="thumbnail"
                                priority={Boolean(item.id && lcpItemId && item.id === lcpItemId)}
                                className="w-full h-full"
                                imgClassName="object-cover"
                              />

                              <div className="absolute right-1 bottom-1 bg-white/80 dark:bg-black/60 rounded-full p-1">
                                <ZoomIn size={14} className="text-slate-700" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-white truncate">{item.name || item.product_name}</h4>
                              {(item.products?.ean || item.ean || item.products?.barcode || item.barcode || item.products?.sku || item.sku) && (
                                <p className="text-xs text-slate-500 mt-1">Código: {item.products?.ean || item.ean || item.products?.barcode || item.barcode || item.products?.sku || item.sku}</p>
                              )}
                              <p className="text-sm text-slate-500">Qtd: {item.quantity} × {fmt.format(unit)}</p>
                            </div>
                          </div>

                          <div className="w-full mt-3 flex items-center">
                            <div className="w-1/2 flex items-center justify-start px-3">
                              {
                                (() => {
                                  const raw = String(item.products?.ean || item.ean || item.products?.barcode || item.barcode || item.products?.sku || item.sku || '');
                                  const code = raw.replace(/[^0-9]/g, '');
                                  if (code.length !== 13) return null;

                                  return (
                                    <div className="bg-white dark:bg-white rounded border border-gray-200 px-2 py-1 shadow-sm flex items-center justify-center max-w-[160px] w-full">
                                      <div className="w-full flex items-center justify-center">
                                        <EAN13Barcode code={code} width={Math.min(160, 120)} height={48} />
                                      </div>
                                    </div>
                                  );
                                })()
                              }
                            </div>

                            <div className="w-1/2 flex items-center justify-end px-3">
                              <p className="font-black text-slate-900 dark:text-white">{fmt.format(unit * (item.quantity || 0))}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <span className="font-medium text-gray-600 dark:text-gray-400">Total do Pedido</span>
          <span className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{fmt.format(calculatedTotal)}</span>
        </div>
      </div>

      {lightbox && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-900 rounded shadow-lg overflow-hidden p-2 relative">
              <button
                aria-label="Fechar"
                autoFocus
                onClick={() => setLightbox(null)}
                className="absolute right-3 top-3 z-50 bg-white/90 dark:bg-slate-800/90 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X size={16} />
              </button>

              <div className="w-[80vw] h-[80vh] md:w-[60vw] md:h-[60vh] flex items-center justify-center">
                <SmartImage product={{ ...(lightbox.product || {}) }} initialSrc={lightbox.src} preferredSize={1200} variant="large" className="w-full h-full" imgClassName="object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
