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
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl p-3 text-sm font-bold border border-gray-100 hover:shadow transition-all`}
    >
      <span className={`p-2 rounded-lg ${colorMap[color]}`}>
        {' '}
        <Icon />{' '}
      </span>
      <span>{label}</span>
    </Link>
  );
}
