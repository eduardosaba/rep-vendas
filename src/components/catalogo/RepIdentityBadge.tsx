"use client"

import React from 'react'
import { useRep } from './RepProvider'

export default function RepIdentityBadge({ representative }: { representative?: any }) {
  const rep = representative || useRep()
  if (!rep) return null

  return (
    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-center gap-3">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Atendimento Oficial:</span>
      <span className="text-[11px] font-bold italic border-b border-primary/50">{rep.full_name || rep.display_name || rep.email}</span>
    </div>
  )
}
