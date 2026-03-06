'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import React from 'react';

interface Props {
  userId: string;
}

export default function ClearUserProductsButton({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [removeAll, setRemoveAll] = useState(false);

  const handleClick = () => {
    setShowConfirm(true);
    // fetch brands for this user
    (async () => {
      try {
        const res = await fetch(`/api/admin/user-brands?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const json = await res.json();
        setAvailableBrands(json.brands || []);
        setSelectedBrands([]);
        setRemoveAll(false);
      } catch (e) {
        console.error('failed to fetch brands', e);
      }
    })();
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const body: any = { userId };
      if (!removeAll) {
        body.brands = selectedBrands.length > 0 ? selectedBrands : [];
      }
      const res = await fetch('/api/admin/clear-user-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Erro' }));
        throw new Error(json.error || 'Erro ao limpar produtos');
      }
      toast.success('Produtos do usuário removidos (registros).');
      window.location.reload();
    } catch (e: any) {
      console.error('clear-user-products error', e);
      toast.error(e?.message || 'Erro ao limpar produtos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`px-3 py-1 rounded-xl text-xs font-bold ${loading ? 'bg-rose-400' : 'bg-rose-600 hover:bg-rose-700'} text-white`}
        disabled={loading}
      >
        {loading ? 'Processando...' : 'Limpar Produtos'}
      </button>

      <ClearUserProductsModal
        visible={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        availableBrands={availableBrands}
        selectedBrands={selectedBrands}
        setSelectedBrands={setSelectedBrands}
        removeAll={removeAll}
        setRemoveAll={setRemoveAll}
      />
    </>
  );
}

// Confirmation modal is rendered as part of this component when requested
export function ClearUserProductsModal({
  visible,
  onCancel,
  onConfirm,
  availableBrands,
  selectedBrands,
  setSelectedBrands,
  removeAll,
  setRemoveAll,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  availableBrands: string[];
  selectedBrands: string[];
  setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;
  removeAll: boolean;
  setRemoveAll: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl">
        <h3 className="font-black text-lg">Confirmar remoção</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Escolha as marcas a remover. Se desejar, marque "Remover tudo" para apagar todos os produtos do usuário. Os arquivos de storage não serão removidos.</p>
        <div className="mt-4">
          <label className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={removeAll} onChange={(e) => setRemoveAll(e.target.checked)} />
            <span className="text-sm font-bold">Remover tudo (todas as marcas)</span>
          </label>
          {!removeAll && (
            <div className="max-h-48 overflow-y-auto border rounded p-2">
              {availableBrands.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma marca encontrada.</p>
              ) : (
                availableBrands.map((b: string) => (
                  <label key={b} className="flex items-center justify-between p-2" >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedBrands.includes(b)} onChange={(e) => {
                        if (e.target.checked) setSelectedBrands(prev => [...prev, b]);
                        else setSelectedBrands(prev => prev.filter(x => x !== b));
                      }} />
                      <span className="text-sm">{b}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Cancelar</button>
          <button onClick={() => {
            // require selection unless removeAll
            if (!removeAll && selectedBrands.length === 0) {
              alert('Selecione ao menos uma marca ou marque Remover tudo');
              return;
            }
            onConfirm();
          }} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black">Confirmar remoção</button>
        </div>
      </div>
    </div>
  );
}
