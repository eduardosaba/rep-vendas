'use client';

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);

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
              <Sidebar isMobile />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
