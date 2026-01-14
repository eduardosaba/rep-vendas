'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Copy, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NewUserSetup() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const availableBrands = ['Boss', 'Tommy Hilfiger', 'Love Moschino'];

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/list-users');
        const json = await res.json();
        setUsers(json || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleClone = async () => {
    if (!selectedUser || selectedBrands.length === 0) {
      toast.error('Selecione um usuário e ao menos uma marca.');
      return;
    }

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro');
      toast.success(json?.message || 'Clonagem iniciada');
      setSelectedBrands([]);
      setSelectedUser('');
    } catch (e: any) {
      console.error(e);
      toast.error('Falha na clonagem: ' + (e.message || 'erro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-center gap-3 text-indigo-600">
        <Users size={24} />
        <h3 className="font-black text-xl uppercase tracking-tighter">
          Setup de Novo Cliente
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">
            Selecionar Representante
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecione o novo usuário...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">
            Marcas para Clonar
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
            {availableBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => toggleBrand(brand)}
                className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${selectedBrands.includes(brand) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500'}`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleClone}
        disabled={loading}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <Copy size={18} /> Clonar Catálogo Master
          </>
        )}
      </button>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex gap-3 items-start">
        <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-700 dark:text-blue-300">
          A clonagem duplica os registros do banco, mas mantém o vínculo com as
          imagens originais do Storage. O novo usuário terá total autonomia para
          editar preços e excluir itens sem afetar o seu catálogo.
        </p>
      </div>
    </div>
  );
}
