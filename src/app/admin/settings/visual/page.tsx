'use client';

import React from 'react';
import { Palette, Type, Layout } from 'lucide-react';

export default function VisualSettings() {
  const fonts = [
    { name: 'Moderno (Inter)', value: 'font-sans' },
    { name: 'Clássico Luxo (Playfair)', value: 'font-serif' },
    { name: 'Minimalista (Geist)', value: 'font-mono' }
  ];

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <div>
        <h1 className="text-3xl font-black italic">Identidade Visual</h1>
        <p className="text-slate-500">Personalize o catálogo com as cores da sua marca.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2"><Palette size={20}/> Cores da Distribuidora</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase">Cor Principal</label>
              <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase">Cor de Destaque</label>
              <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" />
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2"><Type size={20}/> Tipografia</h3>
          <div className="grid grid-cols-1 gap-3">
            {fonts.map((font) => (
              <button key={font.value} className="p-4 rounded-2xl border-2 border-slate-100 hover:border-primary text-left transition-all">
                <span className={`text-lg ${font.value}`}>{font.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-4">
         <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Preview do Catálogo</p>
         <h2 className="text-4xl font-black italic">Ótica de Luxo</h2>
         <button className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold text-sm">
           Ver Coleção
         </button>
      </div>
    </div>
  );
}
