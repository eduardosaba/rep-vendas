'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function CloneUserPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      setUsers(usersData || []);

      const { data: brandsData } = await supabase
        .from('products')
        .select('brand')
        .neq('brand', null);
      const brandsList = (brandsData || [])
        .map((b: any) => b.brand)
        .filter(Boolean);
      setBrands(Array.from(new Set(brandsList)));
    }
    load();
  }, []);

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const handleSubmit = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário alvo');
    if (selectedBrands.length === 0)
      return toast.error('Selecione pelo menos uma marca');
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro');
      toast.success('Clone iniciado');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao iniciar clone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">
        Setup: Clonar catálogo para novo usuário
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Usuário alvo</label>
          <select
            value={selectedUser ?? ''}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- selecione --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Marcas</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border rounded p-2">
            {brands.map((b) => (
              <label key={b} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => toggleBrand(b)}
                />
                <span className="text-sm">{b}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded"
        >
          {loading ? 'Iniciando...' : 'Clonar catálogo'}
        </button>
      </div>
    </div>
  );
}
