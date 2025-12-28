'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close when route changes (user navigated)
  useEffect(() => {
    if (open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on physical scroll/wheel/touch move (user intent to scroll page)
  useEffect(() => {
    if (!open) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 20) setOpen(false);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches?.[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartY.current;
      if (start == null) return;
      const y = e.touches?.[0]?.clientY ?? 0;
      if (Math.abs(y - start) > 30) setOpen(false);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      touchStartY.current = null;
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/90 dark:bg-slate-900/90 shadow-sm border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div className="relative w-72 max-w-full h-full bg-white dark:bg-slate-950 border-r dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="font-bold">Menu</div>
              <button
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="h-full overflow-auto">
              <Sidebar isMobile onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
