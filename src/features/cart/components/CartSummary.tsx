import React from 'react'

interface CartSummaryProps {
  activeDraft: any;
}

export function CartSummary({ activeDraft }: CartSummaryProps) {
  if (!activeDraft) return null;

  const totalItems = activeDraft.total_items || 0;
  const subtotal = activeDraft.subtotal || 0;
  const campaignDiscount = activeDraft.campaign_discount || 0;
  const repDiscount = activeDraft.rep_discount || 0;
  const freightValue = activeDraft.freight_value || 0;
  const taxValue = activeDraft.tax_value || 0;
  const grandTotal = activeDraft.grand_total || activeDraft.total_value || 0;

  return (
    <div className="bg-[var(--brand-background)] border border-[var(--brand-border)] p-4 rounded-xl space-y-2.5">
      <div className="flex justify-between items-center text-xs text-slate-500">
        <span>Subtotal Itens ({totalItems} peças):</span>
        <span className="font-bold text-[var(--brand-text)] font-mono">
          {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>

      {campaignDiscount > 0 && (
        <div className="flex justify-between items-center text-xs text-emerald-600">
          <span>Campanhas Aplicadas:</span>
          <span className="font-bold font-mono">
            - {campaignDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}

      {repDiscount > 0 && (
        <div className="flex justify-between items-center text-xs text-emerald-600">
          <span>Desconto Comercial:</span>
          <span className="font-bold font-mono">
            - {repDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}

      {freightValue > 0 && (
        <div className="flex justify-between items-center text-xs text-amber-600">
          <span>Frete Adicionado:</span>
          <span className="font-bold font-mono">
            {freightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}

      <hr className="border-[var(--brand-border)] border-dashed" />
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Valor Líquido:</span>
        <span className="font-black text-xl text-[var(--brand-text)] font-mono">
          {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>
  )
}
