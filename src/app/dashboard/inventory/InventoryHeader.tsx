'use client';

import { FileDown, Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { exportInventoryPDF } from '@/lib/exportInventoryPDF';

export function InventoryHeader({
  products,
  store,
}: {
  products: any[];
  store: any;
}) {
  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.min_stock_level
  ).length;

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
      <div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-primary transition-colors mb-2"
        >
          <ArrowLeft size={14} /> Painel Principal
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Package className="text-primary" size={32} /> Gestão de Inventário
        </h1>
      </div>

      {lowStockCount > 0 && (
        <button
          onClick={() => exportInventoryPDF(products, store)}
          className="flex items-center gap-3 px-6 py-3 bg-[#b9722e] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 hover:bg-[#a06328] transition-all active:scale-95"
        >
          <FileDown size={18} />
          Exportar Reposição ({lowStockCount})
        </button>
      )}
    </header>
  );
}
