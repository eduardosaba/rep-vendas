'use client';

import { useState } from 'react';
import { Lock, CreditCard, MessageCircle, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { gerarLinkPagamento } from '@/app/dashboard/fatura/actions';

interface PaywallProps {
  user: { id: string; name: string; email: string; plan_id?: string };
}

export default function PaywallBlock({ user }: PaywallProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAssinar = async () => {
    setIsGenerating(true);
    const checkoutUrl = await gerarLinkPagamento({
      id: user.id,
      name: user.name,
      email: user.email,
      plan_id: user.plan_id // Passa o plan_id para a action buscar o preço correto
    });

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      alert("Não conseguimos gerar o link. Tente o suporte via WhatsApp.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
      <div className="relative mb-6">
        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-full animate-pulse">
          <Lock size={48} className="text-amber-600 dark:text-amber-500" />
        </div>
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
          Bloqueado
        </div>
      </div>

      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
        Você tem novos pedidos aguardando!
      </h2>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        Identificamos que seu período de teste ou mensalidade expirou. 
        Os detalhes dos seus últimos pedidos foram ocultados. 
        <span className="block mt-2 font-semibold text-slate-700 dark:text-slate-200">
          Regularize sua conta para liberar o acesso imediatamente.
        </span>
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <button 
          onClick={handleAssinar}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Zap size={18} /> Ativar Agora
            </>
          )}
        </button>
        
        <a 
          href="https://wa.me/5575981272323" 
          target="_blank"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
        >
          <MessageCircle size={18} /> Suporte
        </a>
      </div>

      {/* Simulação de dados ocultos */}
      <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-lg border-t border-gray-100 dark:border-slate-800 pt-8">
        <div className="text-center opacity-40">
          <div className="text-xl font-bold text-slate-400">#---</div>
          <div className="text-[10px] uppercase text-slate-400 font-bold">ID Pedido</div>
        </div>
        <div className="text-center opacity-40">
          <div className="text-xl font-bold text-slate-400">R$ --,--</div>
          <div className="text-[10px] uppercase text-slate-400 font-bold">Valor Total</div>
        </div>
        <div className="text-center opacity-40">
          <div className="text-xl font-bold text-slate-400">--/--/--</div>
          <div className="text-[10px] uppercase text-slate-400 font-bold">Data</div>
        </div>
      </div>
    </div>
  );
}