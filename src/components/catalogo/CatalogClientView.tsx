'use client';

import React from 'react';
import { StoreProvider } from './store-context';
import StoreModals from './StoreModals';
import type { Product, Settings as StoreSettings } from '@/lib/types';

interface Props {
  store: StoreSettings;
  products: Product[];
  categories: any[];
}

export const CatalogClientView = ({
  store,
  products = [],
  categories = [],
}: Props) => {
  return (
    <StoreProvider store={store} initialProducts={products}>
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <main className="container mx-auto p-4">
          <header className="mb-4">
            <h1 className="text-2xl font-bold">
              {store.store_name || store.name}
            </h1>
            <p className="text-sm text-slate-500">{products.length} produtos</p>
          </header>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <article key={p.id} className="bg-white p-3 rounded shadow">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-slate-500">
                  {typeof p.price === 'number'
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(p.price)
                    : ''}
                </div>
              </article>
            ))}
          </section>
        </main>
        <StoreModals />
      </div>
    </StoreProvider>
  );
};

export default CatalogClientView;
