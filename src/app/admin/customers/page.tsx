'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Filter, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCustomers } from './actions';

export default function CompanyCRMPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await getCustomers();
      if (res.success && res.data) setCustomers(res.data as any[]);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(s) ||
      (c.document || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">CRM de Clientes</h1>
          <p className="text-slate-500">Base unificada de CNPJs e histórico de compras</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Buscar por CNPJ ou Nome..."
              className="pl-10 w-[300px] rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 rounded-xl">
            <Filter size={18} /> Filtros
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            <tr>
              <th className="p-4">Cliente / CNPJ</th>
              <th className="p-4">Localização</th>
              <th className="p-4">Representante Responsável</th>
              <th className="p-4">Última Compra</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">Carregando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 uppercase">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.document}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} /> {(c.address && c.address.city) || '—'}
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">—</td>
                  <td className="p-4">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold">—</span>
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" className="text-primary gap-1">
                      Ver Ficha <ExternalLink size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
