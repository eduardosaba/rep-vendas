'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchCustomers } from './actions';
import Link from 'next/link';

export default function RepCustomerSearchPage() {
  const [term, setTerm] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value: string) => {
    setTerm(value);
    setLoading(true);
    try {
      const res = await searchCustomers(value);
      if (res.success) setCustomers(res.data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('');
  }, []);

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Meus Clientes</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Minha Distribuidora</p>
        </div>
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg">
          <UserPlus size={24} />
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
        <Input
          placeholder="Nome da Ótica ou CNPJ..."
          className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm text-lg focus-visible:ring-2 focus-visible:ring-primary"
          value={term}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-300" size={20} />}
      </div>

      <div className="space-y-3">
        {customers.length === 0 && !loading && (
          <div className="text-center py-10 opacity-40">
            <Search size={48} className="mx-auto mb-2" />
            <p>Nenhum cliente encontrado</p>
          </div>
        )}

        {customers.map((customer) => (
          <Link
            key={customer.id}
            href={`/rep/customers/${customer.id}`}
            className="flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 hover:border-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-800 truncate uppercase text-sm">{customer.name}</h3>
                <span className={`h-2 w-2 rounded-full ${customer.financial_status === 'bloqueado' ? 'bg-red-500' : 'bg-green-500'}`} title={customer.financial_status} />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">{customer.document}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin size={12} className="text-primary" />
                {customer.address_city} - {customer.address_state}
              </div>
            </div>
            <div className="bg-slate-50 p-2 rounded-full text-slate-300">
              <ArrowRight size={18} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
