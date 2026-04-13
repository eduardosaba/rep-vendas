'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EyeOff, Lock, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PriceUnlockMode = 'none' | 'modal' | 'fab';

interface UnlockPriceActionsProps {
  mode?: PriceUnlockMode | null;
  isUnlocked: boolean;
  onOpenAuth: () => void;
  onLockPrices: () => void;
}

export function UnlockPriceActions({
  mode = 'none',
  isUnlocked,
  onOpenAuth,
  onLockPrices,
}: UnlockPriceActionsProps) {
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hideFabOnScroll, setHideFabOnScroll] = useState(false);
  const scrollStopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'modal' && !isUnlocked) {
      const timer = window.setTimeout(() => setShowInitialModal(true), 1200);
      return () => window.clearTimeout(timer);
    }
    setShowInitialModal(false);
  }, [mode, isUnlocked]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobileViewport(media.matches);

    apply();
    media.addEventListener('change', apply);

    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (mode !== 'fab' || !isMobileViewport) {
      setHideFabOnScroll(false);
      return;
    }

    const onScroll = () => {
      setHideFabOnScroll(true);

      if (scrollStopTimerRef.current) {
        window.clearTimeout(scrollStopTimerRef.current);
      }

      scrollStopTimerRef.current = window.setTimeout(() => {
        setHideFabOnScroll(false);
      }, 220);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollStopTimerRef.current) {
        window.clearTimeout(scrollStopTimerRef.current);
        scrollStopTimerRef.current = null;
      }
    };
  }, [mode, isMobileViewport]);

  if (mode === 'none') return null;

  return (
    <>
      {mode === 'modal' && showInitialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="text-primary" size={30} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">
              Preço sob consulta
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Este catálogo possui valores exclusivos para lojistas e parceiros.
              Deseja desbloquear agora?
            </p>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setShowInitialModal(false);
                  onOpenAuth();
                }}
              >
                Mostrar preços (Clique e digite a senha)
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInitialModal(false)}
              >
                Ver catálogo completo, sem preços
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === 'fab' && (
        <motion.div
          initial={false}
          animate={
            isMobileViewport && hideFabOnScroll
              ? { opacity: 0, y: 18 }
              : { opacity: 1, y: 0 }
          }
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed right-4 md:right-6 bottom-24 md:bottom-6 z-[90]"
          style={{ pointerEvents: isMobileViewport && hideFabOnScroll ? 'none' : 'auto' }}
        >
          <motion.button
            layout
            initial={false}
            animate={{
              backgroundColor: isUnlocked ? '#ef4444' : 'var(--primary)',
              scale: 1,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isUnlocked ? onLockPrices : onOpenAuth}
            className="relative overflow-hidden flex items-center gap-3 px-5 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white"
            aria-label={isUnlocked ? 'Ocultar precos' : 'Consultar precos'}
          >
            <AnimatePresence mode="wait">
              {isUnlocked ? (
                <motion.div
                  key="unlocked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <EyeOff size={22} />
                  <span className="font-bold whitespace-nowrap">
                    Bloquear Precos
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <LockKeyhole size={22} />
                  <span className="font-bold whitespace-nowrap">
                    Consultar Precos
                  </span>
                  <motion.span
                    className="absolute inset-0 bg-white opacity-10"
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      )}
    </>
  );
}
