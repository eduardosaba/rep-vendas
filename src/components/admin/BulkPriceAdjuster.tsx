'use client';

import React, { useState } from 'react';
import { Percent, DollarSign, Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function BulkPriceAdjuster({ brands }: { brands: string[] }) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [propagate, setPropagate] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!selectedBrand || !value)
      return toast.error('Preencha todos os campos');
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = (userData as any)?.user;
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.rpc(
        'bulk_update_prices_by_brand',
        {
          p_user_id: user.id,
          p_brand: selectedBrand,
          p_adjustment_type: type,
          p_value: parseFloat(value.replace(',', '.')),
          p_propagate_to_clones: propagate,
        }
      );

      if (error) throw error;
      toast.success(
        `Sucesso! ${data} produtos da marca ${selectedBrand} foram atualizados.`
      );
      setValue('');
    } catch (err: any) {
      toast.error('Erro no ajuste: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-3 text-amber-600">
        <Zap size={24} fill="currentColor" />
        <h3 className="font-black text-xl uppercase tracking-tighter">
          Reajuste em Massa
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">
            Marca Alvo
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none"
          >
            <option value="">Selecione a marca...</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Tipo
            </label>
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mt-1">
              <button
                onClick={() => setType('percent')}
                className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${
                  type === 'percent'
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                <Percent size={18} />
              </button>
              <button
                onClick={() => setType('fixed')}
                className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${
                  type === 'fixed'
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                <DollarSign size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Valor ({type === 'percent' ? '%' : 'R$'})
            </label>
            <input
              type="text"
              placeholder={type === 'percent' ? 'Ex: 5' : 'Ex: 10,00'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-2 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
          <input
            type="checkbox"
            checked={propagate}
            onChange={(e) => setPropagate(e.target.checked)}
            className="w-5 h-5 accent-amber-600"
          />
          <span className="text-xs font-bold text-amber-800 dark:text-amber-500">
            Propagar alteração para todos os representantes clonados
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              'Aplicar Reajuste Global'
            )}
          </button>

          <a
            href={selectedBrand ? `/dashboard/products?brand=${encodeURIComponent(selectedBrand)}` : '/dashboard/products'}
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-50 text-center"
          >
            Editar manualmente
          </a>
        </div>
      </div>
    </div>
  );
}
