'use client';

import React, { useEffect, useState } from 'react';
import { assertDevelopmentMode } from '@/lib/dev-kernel/safety-guard';

export default function DevToolbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      assertDevelopmentMode();
      setMounted(true);
    } catch (e) {
      console.error(e);
      // Silently prevent rendering in non-development environments
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-[#0d1b2c] text-white p-4 rounded-xl shadow-2xl border border-white/20 flex flex-col gap-3 min-w-[200px]">
      <div className="flex justify-between items-center border-b border-white/10 pb-2">
        <h3 className="font-bold text-sm tracking-wide text-[#b9722e] uppercase">Developer Tools</h3>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
      </div>
      
      <div className="flex flex-col gap-2">
        <button className="text-sm text-left hover:bg-white/10 px-2 py-1.5 rounded transition-colors">
          🔄 Bootstrap Scenarios
        </button>
        <button className="text-sm text-left hover:bg-white/10 px-2 py-1.5 rounded transition-colors">
          ⏱️ Simulator Panel
        </button>
        <button className="text-sm text-left hover:bg-white/10 px-2 py-1.5 rounded transition-colors">
          🔥 Chaos Mode
        </button>
        <button className="text-sm text-left hover:bg-white/10 px-2 py-1.5 rounded transition-colors">
          📦 Outbox Inspector
        </button>
      </div>
    </div>
  );
}
