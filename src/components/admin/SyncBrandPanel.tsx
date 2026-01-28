import React, { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function SyncBrandPanel({ brands }: { brands: string[] }) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const supabase = createClient();

  const handleGlobalSync = async () => {
    if (!selectedBrand) return toast.error('Selecione uma marca');

    setIsSyncing(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const res = await fetch('/api/admin/sync-brand', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ brandName: selectedBrand }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro');
      toast.success(
        `Sucesso! ${data.reps_affected} representantes atualizados.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro na sincronização global.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="text-emerald-400" size={24} />
        <h2 className="font-black text-lg uppercase tracking-widest">
          Sincronização Global
        </h2>
      </div>

      <div className="space-y-4">
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full bg-slate-800 border-none rounded-2xl p-4 font-bold text-slate-300 outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Selecione a Marca para Atualizar</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          onClick={handleGlobalSync}
          disabled={isSyncing}
          className="w-full py-5 bg-[var(--primary)] hover:bg-orange-600 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
        >
          {isSyncing ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
          {isSyncing ? 'Sincronizando...' : 'Atualizar todos os Catálogos'}
        </button>
      </div>
    </div>
  );
}

export default SyncBrandPanel;
