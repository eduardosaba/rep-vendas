'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from './store-context';

export function FloatingCart() {
  const { cart, setModal } = useStore() as any;

  const total = cart.reduce(
    (acc: number, it: any) => acc + it.price * it.quantity,
    0
  );
  const count = cart.reduce((acc: number, it: any) => acc + it.quantity, 0);

  const [hidden, setHidden] = useState(false);
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const lastDir = useRef(0);

  useEffect(() => {
    const threshold = 15;
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const delta = y - lastY.current;
      let dir = 0;
      if (delta > threshold && y > 50) dir = 1;
      else if (delta < -threshold) dir = -1;

      if (dir === 1 && lastDir.current !== 1) {
        setHidden(true);
        lastDir.current = 1;
      } else if (dir === -1 && lastDir.current !== -1) {
        setHidden(false);
        lastDir.current = -1;
      }

      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-transform duration-300 ${hidden ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}
    >
      <div className="bg-white/95 backdrop-blur rounded-full shadow-lg px-3 py-2 flex items-center gap-3 border border-gray-100">
        <Button
          variant="ghost"
          onClick={() => setModal('cart', true)}
          className="flex items-center gap-2 px-3 py-2"
        >
          <div className="relative">
            <ShoppingCart size={18} />
            <div className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold">
              {count}
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-500">Ver carrinho</div>
            <div className="font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(total)}
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
