// src/components/catalogo/RepShareLink.tsx
'use client'

import React, { useState } from 'react'

interface RepShareLinkProps {
  organizationId: string
  repUserId: string
  repName: string
}

export function RepShareLink({ organizationId, repUserId, repName }: RepShareLinkProps) {
  const [copied, setCopied] = useState(false)

  // Monta a URL inteligente
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.repvendas.com.br'
  const personalCatalogUrl = `${baseUrl}/catalogo/${organizationId}?rep=${repUserId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(personalCatalogUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Falha ao copiar link', err)
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm max-w-lg space-y-4">
      <div>
        <h3 className="font-bold text-slate-800 text-lg">Seu Link de Vendas</h3>
        <p className="text-xs text-slate-500">
          Compartilhe este link com suas óticas compradoras. Todas as vendas feitas por ele serão comissionadas para você.
        </p>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          readOnly
          value={personalCatalogUrl}
          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 outline-none flex-1 font-mono"
        />
        <button 
          onClick={handleCopy}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-lg transition-all active:scale-95 shrink-0"
        >
          {copied ? 'Copiado! ✓' : 'Copiar Link'}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg">
        <span>👤</span>
        <span>Código do Representante: <strong>{repName}</strong> ativo na sessão de compras.</span>
      </div>
    </div>
  )
}
