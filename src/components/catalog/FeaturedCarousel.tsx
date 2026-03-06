'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/components/catalogo/store-context';
import { createClient } from '@/lib/supabase/client';
import { PriceDisplay } from '@/components/catalogo/PriceDisplay';

export default function FeaturedCarousel({ products }: { products: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const productsLength = (products || []).length;
  const { isPricesVisible, setModal, store } = useStore();
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
    <section className="relative w-full py-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white">
            <div className="bg-amber-500 p-1.5 rounded-lg">
              <Star className="text-white" size={16} />
            </div>
            Produtos em Destaques
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Curadoria exclusiva do seu representante
          </p>
        </div>

        {products.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1))}
              className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-md border hover:scale-110 transition-all active:scale-95"
              style={{ borderColor: primaryColor }}
              aria-label="Anterior"
            >
              <ChevronLeft size={20} color={primaryColor} />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1))}
              className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-md border hover:scale-110 transition-all active:scale-95"
              style={{ borderColor: primaryColor }}
              aria-label="Próximo"
            >
              <ChevronRight size={20} color={primaryColor} />
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl">
        <div className="flex transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {products.map((product) => (
            <div key={product.id} className="w-full flex-shrink-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[450px]">
                <div className="relative aspect-square lg:aspect-auto bg-slate-50 dark:bg-slate-800 overflow-hidden">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-[3000ms] hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                <div className="p-8 md:p-16 flex flex-col justify-center space-y-6">
                  <div className="space-y-2">
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]" style={{ color: primaryColor }}>{product.brand}</span>
                    <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">{product.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-3">
                    {isPricesVisible ? (
                      <>
                        <PriceDisplay value={product.price} isPricesVisible={isPricesVisible} className="text-3xl font-black text-slate-900 dark:text-white font-mono" />
                        {product.original_price > product.price && (
                          <span className="text-lg text-slate-400 line-through font-bold">R$ {Number(product.original_price).toLocaleString('pt-BR')}</span>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
                        <Lock size={12} />
                        <span>Sob consulta</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={async () => {
                        try {
                          const supabase = createClient();
                          // Tentar buscar produto completo por id e user_id para garantir variantes
                          const { data } = await supabase
                            .from('products')
                            .select('*')
                            .eq('id', product.id)
                            .eq('user_id', (store && (store as any).user_id) || product.user_id)
                            .maybeSingle();
                          if (data) {
                            setModal('product', data);
                          } else {
                            // fallback: abrir com o objeto existente
                            setModal('product', product);
                          }
                        } catch (e) {
                          console.error('Erro ao carregar detalhes do produto:', e);
                          setModal('product', product);
                        }
                      }}
                      className="group inline-flex items-center gap-3 px-10 py-5 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-xl transition-all"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Ver detalhes do produto
                      <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {products.length > 1 && (
        <div className="flex justify-center gap-3 mt-8">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === i ? 'w-12' : 'w-3'}`}
              style={{ backgroundColor: currentIndex === i ? primaryColor : undefined }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
