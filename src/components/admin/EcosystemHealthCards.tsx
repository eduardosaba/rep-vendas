'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  Tag,
  Users,
  HardDrive,
  TrendingUp,
  Zap,
  ShieldCheck,
} from 'lucide-react';

type Summary = {
  total_products: number;
  total_brands: number;
  total_users: number;
  shared_images_count: number;
  storage_savings_percent: number;
} | null;

export default function EcosystemHealthCards() {
  const [stats, setStats] = useState<Summary>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // try to read session token if endpoint exists
        const sess = await fetch('/api/auth/session');
        const sessJson = await sess.json().catch(() => ({}));
        const token = sessJson?.access_token || null;

        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/admin/ecosystem-summary', { headers });
        if (!res.ok) {
          setStats(null);
          return;
        }
        const j = await res.json();
        setStats(j.data || null);
      } catch (err) {
        console.error('fetch ecosystem summary', err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="h-32 w-full animate-pulse bg-gray-100 rounded-[2.5rem]" />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 text-indigo-50 group-hover:text-indigo-100 transition-colors">
          <Database size={100} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
            Total de Produtos
          </p>
          <h3 className="text-3xl font-black text-indigo-600">
            {stats.total_products?.toLocaleString?.() ?? stats.total_products}
          </h3>
          <div className="flex items-center gap-1 mt-2 text-green-500 text-[10px] font-bold">
            <TrendingUp size={12} /> Ecossistema Ativo
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 text-emerald-50 group-hover:text-emerald-100 transition-colors">
          <Tag size={100} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
            Marcas no Sistema
          </p>
          <h3 className="text-3xl font-black text-emerald-600">
            {stats.total_brands ?? 0}
          </h3>
          <p className="text-[10px] text-gray-400 font-medium mt-2">
            Prontas para clonagem
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 text-amber-50 group-hover:text-amber-100 transition-colors">
          <Users size={100} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
            Licenciados (Contas)
          </p>
          <h3 className="text-3xl font-black text-amber-600">
            {stats.total_users ?? 0}
          </h3>
          <div className="flex items-center gap-1 mt-2 text-amber-600 text-[10px] font-bold">
            <ShieldCheck size={12} /> Rede Protegida
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 text-white/10">
          <Zap size={100} fill="currentColor" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase text-indigo-100 tracking-widest mb-1">
            Eficiência de Storage
          </p>
          <h3 className="text-3xl font-black text-white">
            {stats.storage_savings_percent ?? 0}%
          </h3>
          <div className="flex items-center gap-1 mt-2 text-indigo-100 text-[10px] font-bold">
            <HardDrive size={12} /> {stats.shared_images_count ?? 0} fotos
            otimizadas
          </div>
        </div>
      </div>
    </div>
  );
}
