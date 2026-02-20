'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';

export default function DemoCredentialsClient({
  href = '/demo/catalogo',
  label = 'Catálogo Demo',
  className = '',
  showOnlyPrice = false,
}: {
  href?: string;
  label?: string;
  className?: string;
  showOnlyPrice?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  function go() {
    if (typeof href === 'string' && href.startsWith('http')) {
      // abre em nova aba para manter a página atual visível
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      // navegação cliente para rotas internas
      try {
        router.push(href);
      } catch {
        window.location.href = href;
      }
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          // se for rota interna, navega direto sem abrir modal
          if (typeof href === 'string' && href.startsWith('/')) {
            e.preventDefault();
            try {
              router.push(href);
            } catch {
              window.location.href = href;
            }
            return;
          }

          e.preventDefault();
          setOpen(true);
        }}
        className={className}
      >
        {label}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 h-screen"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />

            <div className="relative max-w-md w-full bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-auto">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Acesso Demo
              </h3>

              {showOnlyPrice ? (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    Senha para ver preço
                  </p>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded mb-4">
                    <div>
                      <div className="font-mono font-bold text-sm">0000</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    Use estas credenciais de teste para acessar o catálogo de
                    demonstração.
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                      <div>
                        <div className="text-xs text-slate-400">Email</div>
                        <div className="font-mono font-bold text-sm">
                          teste@repvendas.com.br
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                      <div>
                        <div className="text-xs text-slate-400">Senha</div>
                        <div className="font-mono font-bold text-sm">
                          teste123
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                      <div>
                        <div className="text-xs text-slate-400">
                          Senha para ver preço
                        </div>
                        <div className="font-mono font-bold text-sm">0000</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded bg-slate-100 text-sm font-medium"
                >
                  Fechar
                </button>

                <button
                  onClick={go}
                  className="px-4 py-2 rounded bg-[#b9722e] text-white font-bold flex items-center gap-2"
                >
                  Ir para Demo <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
