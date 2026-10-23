'use client';

import React, { useState } from 'react';
import { useStore } from './store-context';
import { Button } from '@/components/ui/button';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function StoreModals() {
  const { modals, setModal, unlockPrices, store } = useStore();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isDemoStore = Boolean(
    store?.catalog_slug === 'demo' ||
    store?.user_id === 'demo-store' ||
    store?.user_id === 'demo' ||
    store?.price_password === '123456' ||
    store?.price_password === 'demo'
  );

  const close = () => {
    setPassword('');
    setShowPassword(false);
    setModal('password', false);
  };

  if (!modals?.password) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const ok = await unlockPrices(password);
      if (ok) {
        toast.success('Preços desbloqueados');
        close();
      } else {
        toast.error('Senha inválida');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao validar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-[90%] max-w-md shadow-lg border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Digite a senha</h3>
          <button onClick={close} className="p-2">
            <X />
          </button>
        </div>
        {isDemoStore && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs shadow-sm text-center">
            <span className="font-semibold block mb-1">💡 Modo Demonstração</span>
            Senha para ver preços:{' '}
            <strong className="font-mono text-sm bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
              123456
            </strong>
          </div>
        )}
        <div className="space-y-4">
          <div className="relative flex items-center">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha de preços"
              className="w-full p-2.5 pr-11 border rounded-lg bg-gray-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              title={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button isLoading={loading} onClick={handleSubmit}>
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreModals;
