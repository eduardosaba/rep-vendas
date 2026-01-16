'use client';

import React from 'react';
import { X, Eye } from 'lucide-react';

export default function ImpersonateBanner() {
  const stopImpersonating = async () => {
    try {
      await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: null }),
      });
    } catch (e) {
      // ignore
    }
    window.location.href = '/admin/curadoria';
  };

  return (
    <div className="bg-amber-500 text-white py-2 px-4 flex items-center justify-between shadow-lg sticky top-0 z-[100]">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
        <Eye size={16} />
        Você está visualizando o sistema como um cliente
      </div>

      <button
        onClick={stopImpersonating}
        className="bg-white/20 hover:bg-white/30 p-1 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase"
      >
        <X size={14} /> Sair da Visualização
      </button>
    </div>
  );
}
