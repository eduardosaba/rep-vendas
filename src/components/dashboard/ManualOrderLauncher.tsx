'use client';

import { useState } from 'react';
import ManualOrderForm from './ManualOrderForm';

export default function ManualOrderLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors"
      >
        Nova Venda Manual
      </button>
      {open && <ManualOrderForm onClose={() => setOpen(false)} />}
    </>
  );
}
