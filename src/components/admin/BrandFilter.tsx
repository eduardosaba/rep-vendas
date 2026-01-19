'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';

export function BrandFilter({ brands }: { brands: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get('brand') || '';

  const handleChange = (brand: string) => {
    const params = new URLSearchParams(searchParams);
    if (brand) params.set('brand', brand);
    else params.delete('brand');

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Filter className="h-4 w-4 text-slate-400" />
      </div>
      <select
        value={currentBrand}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-xl pl-9 pr-10 py-2 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300"
      >
        <option value="">Todas as Marcas</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>
    </div>
  );
}
