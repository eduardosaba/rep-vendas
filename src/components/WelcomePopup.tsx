"use client";

import React, { useEffect, useState } from 'react';
import { Rocket, Sparkles, X } from 'lucide-react';

interface WelcomePopupProps {
  version: any;
  onConfirm: () => Promise<void> | void;
}

export default function WelcomePopup({ version, onConfirm }: WelcomePopupProps) {
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    // register delivery when popup mounts
    if (!version) return;
    try {
      fetch('/api/popup/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popupId: version.id }),
      }).catch(() => {});
    } catch (e) {}
  }, [version]);

  if (!version) return null;

  const handleClose = async () => {
    if (!version) return onConfirm();
    try {
      setPosting(true);
      await fetch('/api/popup/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popupId: version.id }),
      }).catch(() => {});
    } catch (e) {
      // ignore
    } finally {
      setPosting(false);
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
          aria-label="Fechar"
        >
          <X size={20} className="text-slate-400" />
        </button>

        <div
          className="p-10 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${version.color_from || '#0f172a'}, ${version.color_to || '#334155'})`,
          }}
        >
          <Rocket size={48} className="mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-black leading-tight mb-2">{version.title}</h2>
          <span className="px-4 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest">
            Versão {version.version}
          </span>
        </div>

        <div className="p-10">
          <ul className="space-y-4 mb-10">
            {version.highlights?.map((h: string, i: number) => (
              <li key={i} className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleClose}
            disabled={posting}
            className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
            style={{ background: version.color_from || '#0f172a' }}
          >
            {posting ? 'Registrando...' : 'Explorar Novidades'}
          </button>
        </div>
      </div>
    </div>
  );
}
