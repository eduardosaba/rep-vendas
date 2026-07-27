// src/components/catalogo/BrandingSettingsForm.tsx
'use client'

import React, { useState, useTransition } from 'react'
import { BrandConfig, getOrganizationBranding } from '@/actions/commercial/branding'
import { updateOrganizationBranding } from '@/actions/commercial/settings'

interface BrandingSettingsFormProps {
  initialBrand: BrandConfig
  operatorUserId: string
}

export function BrandingSettingsForm({ initialBrand, operatorUserId }: BrandingSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState(initialBrand.logoUrl || '')
  const [primaryColor, setPrimaryColor] = useState(initialBrand.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(initialBrand.secondaryColor)
  const [accentColor, setAccentColor] = useState(initialBrand.accentColor)
  const [whatsapp, setWhatsapp] = useState(initialBrand.contactWhatsapp || '')
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    startTransition(async () => {
      const result = await updateOrganizationBranding({
        operatorUserId,
        logoUrl: logoUrl || null,
        primaryColor,
        secondaryColor,
        accentColor,
        contactWhatsapp: whatsapp || null,
      })

      if (result.success) {
        setStatusMessage({ type: 'success', text: 'Identidade visual atualizada com sucesso! Seu catálogo já está com a nova cara.' })
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Erro ao atualizar configurações.' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl shadow border border-slate-100">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Identidade Visual e Marca</h2>
        <p className="text-sm text-slate-500">Personalize a cara do catálogo que seus vendedores e clientes acessam.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* URL do Logo */}
        <div className="flex flex-col gap-2 col-span-2">
          <label className="text-sm font-semibold text-slate-700">URL da Logomarca</label>
          <input 
            type="text" 
            placeholder="https://exemplo.com/sua-logo.png" 
            className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>

        {/* WhatsApp */}
        <div className="flex flex-col gap-2 col-span-2">
          <label className="text-sm font-semibold text-slate-700">WhatsApp de Contato (DDI + DDD + Número)</label>
          <input 
            type="text" 
            placeholder="5575999999999" 
            className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        {/* Seletores de Cores */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Cor Primária (Headers / Títulos)</label>
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              className="w-10 h-10 border-0 rounded cursor-pointer"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <span className="text-xs font-mono bg-slate-50 border px-2 py-1.5 rounded">{primaryColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Cor Secundária (Botões Principais)</label>
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              className="w-10 h-10 border-0 rounded cursor-pointer"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
            <span className="text-xs font-mono bg-slate-50 border px-2 py-1.5 rounded">{secondaryColor.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Cor de Destaque (Badges / Alertas)</label>
          <div className="flex gap-2 items-center">
            <input 
              type="color" 
              className="w-10 h-10 border-0 rounded cursor-pointer"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
            <span className="text-xs font-mono bg-slate-50 border px-2 py-1.5 rounded">{accentColor.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-lg text-sm ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          type="submit" 
          disabled={isPending}
          className="bg-slate-900 hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-all"
        >
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}
