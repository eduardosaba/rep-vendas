'use client';

import React, { useState } from 'react';
import { useStore } from './store-context';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

export function StoreModals() {
  const { modals, setModal, unlockPrices } = useStore();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    setPassword('');
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
        <div className="space-y-4">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Senha de preços"
            className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-slate-950"
          />
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
