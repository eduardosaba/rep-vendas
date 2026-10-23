'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Store, ShoppingBag, ShieldCheck } from 'lucide-react';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

export default function DemoDashboardPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2C] text-white flex flex-col items-center justify-center p-4 selection:bg-[#A46431]/30">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <img
            src={SYSTEM_LOGO_URL}
            alt="RepVendas"
            className="h-12 w-auto object-contain"
          />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A46431]/20 text-[#A46431] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} /> Demonstração Interativa
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Conheça o RepVendas
          </h2>
          <p className="text-sm text-slate-300 font-normal leading-relaxed">
            Experimente o catálogo digital para representantes ópticos e distribuidoras. Veja como seus clientes farão pedidos pelo WhatsApp.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/demo/catalogo"
            className="w-full py-3.5 bg-[#A46431] hover:bg-[#8e5527] text-white font-extrabold rounded-xl transition-all shadow-lg shadow-[#A46431]/20 flex items-center justify-center gap-2 text-sm"
          >
            <Store size={18} /> Explorar Catálogo de Demonstração <ArrowRight size={16} />
          </Link>

          <Link
            href="/register"
            className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-white/10"
          >
            Criar Conta Grátis para Testar
          </Link>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sem necessidade de cartão para testar</span>
        </div>
      </div>
    </div>
  );
}
