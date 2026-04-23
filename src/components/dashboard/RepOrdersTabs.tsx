"use client";

import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, Store } from 'lucide-react';
import { OrdersTable } from '@/components/dashboard/OrdersTable';

type RepOrdersTabsProps = {
  mySales: any[];
  distributorOrders: any[];
  currentUserId?: string | null;
};

type TabKey = 'my_sales' | 'distributor';

export default function RepOrdersTabs({
  mySales,
  distributorOrders,
  currentUserId = null,
}: RepOrdersTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('my_sales');

  const tabs = useMemo(
    () => [
      {
        key: 'my_sales' as TabKey,
        label: 'Minhas Vendas',
        count: mySales.length,
        icon: BriefcaseBusiness,
      },
      {
        key: 'distributor' as TabKey,
        label: 'Distribuidora (Otica Saba)',
        count: distributorOrders.length,
        icon: Store,
      },
    ],
    [mySales.length, distributorOrders.length]
  );

  const currentData =
    activeTab === 'my_sales' ? mySales : distributorOrders;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 inline-flex gap-2 w-full md:w-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {currentData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400">
          Nenhum pedido encontrado nesta aba.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
          <OrdersTable initialOrders={currentData} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
