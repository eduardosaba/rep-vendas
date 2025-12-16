'use client';

import { useState } from 'react';
import ManualOrderForm from './ManualOrderForm';

export default function ManualOrderLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 shadow-sm transition-colors"
      >
        Nova Venda Manual
      </button>
      {open && <ManualOrderForm onClose={() => setOpen(false)} />}
    </>
  );
}
