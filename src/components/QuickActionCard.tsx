import Link from 'next/link';
import React from 'react';

interface Props {
  href: string;
  icon: any;
  label: string;
  color?: 'orange' | 'blue' | 'red' | 'slate';
}

export default function QuickActionCard({
  href,
  icon: Icon,
  label,
  color = 'slate',
}: Props) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center bg-white border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200"
    >
      <div
        className={`p-3 rounded-xl ${colorMap[color]} group-hover:scale-110 transition-transform duration-200`}
      >
        <Icon size={20} className="flex-shrink-0" />
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-tight">
        {label}
      </span>
    </Link>
  );
}
