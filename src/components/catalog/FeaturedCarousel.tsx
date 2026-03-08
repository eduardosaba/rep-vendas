'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Lock, Search } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/components/catalogo/store-context';
import { createClient } from '@/lib/supabase/client';
import { PriceDisplay } from '@/components/catalogo/PriceDisplay';

export default function FeaturedCarousel({ products }: { products: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const productsLength = (products || []).length;
  const { isPricesVisible, setModal, store, brandsWithLogos } = useStore();
  const primaryColor = (store && (store as any).primary_color) || '#2563EB';
  const secondaryColor = (store && (store as any).secondary_color) || '#6366F1';

  useEffect(() => {
    if (productsLength <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === productsLength - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(interval);
  }, [productsLength]);

  if (productsLength === 0) return null;

  return (
    <section className="relative w-full py-6 md:py-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
        <div>
          <h2 className="text-lg md:text-2xl font-extrabold uppercase tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="bg-amber-500 p-1.5 rounded-md shadow-sm">
              <Star className="text-white" size={14} />
            </div>
            Produtos em Destaques
          </h2>
          <p className="text-xs md:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
            Curadoria exclusiva do seu representante
          </p>
        </div>

        {products.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1))}
              className="p-2 md:p-3 rounded-full bg-white/90 dark:bg-slate-800/80 shadow hover:scale-105 transition-transform active:scale-95"
              style={{ borderColor: primaryColor }}
              aria-label="Anterior"
            >
              <ChevronLeft size={18} color={primaryColor} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1))}
              className="p-2 md:p-3 rounded-full bg-white/90 dark:bg-slate-800/80 shadow hover:scale-105 transition-transform active:scale-95"
              style={{ borderColor: primaryColor }}
              aria-label="Próximo"
            >
              <ChevronRight size={18} color={primaryColor} />
            </button>
          </div>
        )}
      </div>
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl">
        <div className="flex transition-transform duration-1000" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {products.map((product) => {
            const brandName = String(product.brand || '').trim();
            const brandObj = (brandsWithLogos || []).find(
              (b: any) => String(b.name || '').trim().toLowerCase() === brandName.toLowerCase()
            );

            return (
              <div key={product.id} className="w-full flex-shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[260px] md:min-h-[450px]">
                  <div className="relative aspect-[4/3] md:aspect-auto max-h-[320px] md:max-h-none bg-white dark:bg-slate-800 overflow-hidden p-3 md:p-0 flex items-center justify-center">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain object-center transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/18 to-transparent pointer-events-none" />

                    {/* Mobile overlay: top bar with brand logo + reference */}
                    <div className="absolute top-3 left-3 right-3 md:hidden flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 bg-white/60 dark:bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                        {brandObj && brandObj.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={brandObj.logo_url} alt={brandObj.name || brandName} className="h-6 w-auto object-contain" />
                        ) : brandName ? (
                          <span className="text-xs font-bold text-slate-700">{brandName}</span>
                        ) : null}

                        {/* reference moved to bottom overlay for mobile alignment */}
                      </div>
                      <div />
                    </div>

                    {/* Mobile overlay: botão compacto (apenas ícone) sobre a imagem */}
                    <div className="absolute bottom-3 right-3 md:hidden flex items-center gap-1">
                      {/* Mobile: reference aligned with price and lupa */}
                      {(product.reference_code || product.reference || product.reference_id) ? (
                        <span className="bg-white/90 text-slate-700 rounded-full px-2 h-10 flex items-center text-sm font-semibold max-w-[120px] truncate">
                          {product.reference_code || product.reference || product.reference_id}
                        </span>
                      ) : null}
                      {isPricesVisible ? (
                        <div className="bg-white/90 text-slate-900 rounded-full h-10 flex items-center px-2 font-extrabold shadow-sm">
                          <PriceDisplay value={product.price} isPricesVisible={isPricesVisible} className="text-sm font-extrabold" />
                        </div>
                      ) : null}
                      <button
                        onClick={async () => {
                          try {
                            const supabase = createClient();
                            const { data } = await supabase
                              .from('products')
                              .select('*')
                              .eq('id', product.id)
                              .eq('user_id', (store && (store as any).user_id) || product.user_id)
                              .eq('is_active', true)
                              .maybeSingle();
                            if (data) {
                              setModal('product', data);
                            } else {
                              setModal('product', product);
                            }
                          } catch (e) {
                            console.error('Erro ao carregar detalhes do produto:', e);
                            setModal('product', product);
                          }
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white shadow-lg group"
                        style={{ backgroundColor: primaryColor }}
                        aria-label="Ver detalhes"
                      >
                        <Search size={18} />
                        <span className="absolute -bottom-10 right-0 hidden group-hover:flex items-center justify-center bg-black/80 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
                          + detalhes
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 md:p-12 flex flex-col justify-center space-y-4">
                    <div className="space-y-1">
                      {brandObj && brandObj.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brandObj.logo_url} alt={brandObj.name || brandName} className="hidden md:block h-5 md:h-6 object-contain" />
                      ) : brandName ? (
                        <span className="hidden md:inline-block font-extrabold text-[10px] uppercase tracking-[0.2em]" style={{ color: primaryColor }}>{brandName}</span>
                      ) : null}
                      <h3 className="text-xl md:text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{product.name}</h3>
                    </div>

                    <div className="flex items-baseline gap-3">
                      {isPricesVisible ? (
                        <div className="hidden md:flex items-baseline gap-3">
                          <PriceDisplay value={product.price} isPricesVisible={isPricesVisible} className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono" />
                          {product.original_price > product.price && (
                            <span className="text-sm md:text-lg text-slate-400 line-through font-semibold">R$ {Number(product.original_price).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase">
                          <Lock size={12} />
                          <span>Sob consulta</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {/* Desktop: botão completo */}
                      <button
                        onClick={async () => {
                          try {
                            const supabase = createClient();
                            const { data } = await supabase
                              .from('products')
                              .select('*')
                              .eq('id', product.id)
                              .eq('user_id', (store && (store as any).user_id) || product.user_id)
                              .eq('is_active', true)
                              .maybeSingle();
                            if (data) {
                              setModal('product', data);
                            } else {
                              setModal('product', product);
                            }
                          } catch (e) {
                            console.error('Erro ao carregar detalhes do produto:', e);
                            setModal('product', product);
                          }
                        }}
                        className="hidden md:inline-flex group items-center gap-3 px-6 py-3 md:px-10 md:py-4 text-white rounded-xl font-extrabold uppercase tracking-widest hover:shadow-2xl transition-all"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Ver detalhes do produto
                        <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {products.length > 1 && (
        <div className="flex justify-center gap-3 mt-6 md:mt-8">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === i ? 'w-8 md:w-12' : 'w-2 md:w-3'}`}
              style={{ backgroundColor: currentIndex === i ? primaryColor : 'rgba(0,0,0,0.12)' }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
