'use client';

import { useRouter, usePathname } from 'next/navigation';

const filters = [
  { label: 'Hoje', value: 'today' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '6M', value: '6m' },
  { label: '1A', value: '12m' },
];

export default function DateFilter({ currentRange }: { currentRange: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleFilter = (value: string) => {
    router.push(`${pathname}?range=${value}`);
  };

  return (
    <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl flex gap-1">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilter(f.value)}
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            currentRange === f.value
              ? 'bg-white dark:bg-slate-700 text-primary shadow-sm scale-105'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
