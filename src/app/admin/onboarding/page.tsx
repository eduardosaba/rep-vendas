'use client';

import { Building2, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CompanyOnboarding() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-slate-900">Configuração da Distribuidora</h1>
        <p className="text-slate-500">Prepare o ambiente para sua equipe de vendas e logística.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <CreditCard size={24} />
            <h3 className="font-bold text-lg">Regras de Negócio</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Pedido Mínimo (R$)</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none" placeholder="500,00" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Condições de Pagamento</label>
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none" placeholder="Boleto 30/60/90, PIX..." />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Truck size={24} />
            <h3 className="font-bold text-lg">Logística e Entrega</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Prazo Médio (Dias)</label>
              <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none" placeholder="2 a 5 dias úteis" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Frete Grátis acima de (R$)</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none" placeholder="1000,00" />
            </div>
          </div>
        </div>
      </div>

      <Button className="w-full h-16 rounded-[2rem] text-xl font-black shadow-xl shadow-primary/20">Finalizar Configuração e Ir ao Painel</Button>
    </div>
  );
}
