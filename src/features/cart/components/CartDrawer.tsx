'use client'

import React from 'react'
import { useDraftCart } from '../use-draft-cart'
import { CartItem } from './CartItem'
import { CartSummary } from './CartSummary'
import { useRouter } from 'next/navigation'

interface CartDrawerProps {
  activeDraft: any;
  draftItems: any[];
}

export function CartDrawer({ activeDraft, draftItems = [] }: CartDrawerProps) {
  const { isOpen, setIsOpen, isLoading, error, executeCheckout } = useDraftCart()
  const router = useRouter()

  const [paymentMethodId, setPaymentMethodId] = React.useState('boleto-28')
  const [notes, setNotes] = React.useState('')
  const [isCheckingOut, setIsCheckingOut] = React.useState(false)

  const handleCheckout = async () => {
    if (!activeDraft?.id) return
    setIsCheckingOut(true)
    const success = await executeCheckout(activeDraft.id, paymentMethodId, notes)
    setIsCheckingOut(false)
    
    if (success) {
      router.push('/distribuidora/pedidos') // Redirecionar após sucesso
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs antialiased">
      <div className="flex-1" onClick={() => setIsOpen(false)} />

      <div className="w-full max-w-md bg-[var(--brand-background)] h-full shadow-2xl flex flex-col justify-between border-l border-[var(--brand-border)] text-[var(--brand-text)] animate-slide-in">
        
        <header className="p-4 border-b border-[var(--brand-border)] bg-[var(--brand-secondary)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base tracking-tight">Bloco de Pré-Venda</h2>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                #{activeDraft?.id?.substring(0, 5).toUpperCase() || 'DRAFT'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sessão persistente ativa para o representante.</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-900 font-bold text-lg p-1"
          >
            ✕
          </button>
        </header>

        {error && <div className="m-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100">{error}</div>}
        {isLoading && <div className="px-4 py-2 bg-slate-100 text-slate-600 text-center font-mono text-[10px] tracking-widest uppercase">Sincronizando Banco...</div>}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {draftItems.length > 0 ? (
            draftItems.map((item) => (
              <CartItem 
                key={item.id}
                item={item}
              />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <span className="text-3xl mb-2">🛒</span>
              <p className="text-xs font-semibold">Nenhuma armação óptica adicionada.</p>
              <p className="text-[11px] text-slate-400 mt-1">Navegue pelas grifes e clique em "+ Adicionar" para iniciar o bloco de notas.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-[var(--brand-background)] border-t border-[var(--brand-border)] space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ótica Cliente (Obrigatório)</label>
            <div className="border border-slate-300 bg-slate-50 p-2 text-xs rounded-lg text-slate-700 font-medium flex items-center justify-between">
              <span>{activeDraft?.customer_id ? 'Ótica Vision Center' : 'Nenhum cliente vinculado'}</span>
              <button className="text-[var(--brand-primary)] font-bold text-[10px] uppercase">Alterar</button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</label>
            <select 
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full border border-[var(--brand-border)] bg-[var(--brand-background)] p-2 text-xs rounded-lg outline-none focus:border-[var(--brand-primary)]"
            >
              <option value="boleto-28">Boleto 28 dias</option>
              <option value="boleto-21-28">Boleto 21/28 dias</option>
              <option value="pix">PIX Imediato</option>
              <option value="cartao">Cartão de Crédito</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações (Opcional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregar na matriz"
              className="w-full border border-[var(--brand-border)] bg-[var(--brand-background)] p-2 text-xs rounded-lg outline-none focus:border-[var(--brand-primary)] resize-none h-12"
            />
          </div>
        </div>

        <footer className="p-4 bg-[var(--brand-secondary)] border-t border-[var(--brand-border)] space-y-4">
          <CartSummary activeDraft={activeDraft} />
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setIsOpen(false)}
              className="border border-[var(--brand-border)] text-slate-600 font-semibold text-xs py-2.5 rounded-lg hover:bg-slate-50 transition-all text-center"
            >
              Continuar Comprando
            </button>
            <button 
              onClick={handleCheckout}
              disabled={draftItems.length === 0 || isCheckingOut || !activeDraft?.customer_id}
              className="bg-[var(--brand-primary)] text-white font-semibold text-xs py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all text-center shadow-sm flex items-center justify-center gap-2"
            >
              {isCheckingOut ? 'Processando...' : '⚙️ Finalizar Pedido B2B'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
