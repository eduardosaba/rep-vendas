import React from 'react'
import Link from 'next/link'
import { ApplicationContext } from '@/core/context/application-context'
import { TenantLogo, TenantName } from '@/features/branding'

interface DistributorSidebarProps {
  context: ApplicationContext
}

export function DistributorSidebar({ context }: DistributorSidebarProps) {
  const { branding, role } = context

  const navigationItems = [
    { href: '/distribuidora', label: '📊 Torre de Controle' },
    { href: '/distribuidora/produtos', label: '📦 Catálogo Óptico' },
    { href: '/distribuidora/estoque', label: '🛡️ Controle de Estoque' },
    { href: '/distribuidora/pedidos', label: '📝 Fila de Pedidos B2B' },
    { href: '/distribuidora/expedicao', label: '🚚 Esteira de Expedição' },
    { href: '/distribuidora/financeiro', label: '💰 Fluxo Financeiro' },
    { href: '/distribuidora/equipe', label: '👥 Time Comercial' },
    { href: '/distribuidora/configuracoes', label: '⚙️ Configurações' },
    { href: '/distribuidora/branding', label: '🎨 Personalização' }
  ]

  return (
    <aside className="w-64 bg-[var(--brand-primary)] text-[var(--brand-secondary)] flex flex-col justify-between shrink-0 border-r border-black/10 shadow-lg min-h-screen">
      <div className="flex flex-col">
        <header className="p-4 flex items-center gap-3 border-b border-white/10">
          <TenantLogo branding={branding} className="w-8 h-8" />
          <div className="flex flex-col overflow-hidden">
            <TenantName branding={branding} className="text-sm font-black tracking-tight" />
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Portal Distribuidor</span>
          </div>
        </header>

        <nav className="p-3 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-white/10 transition-all opacity-80 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <footer className="p-3 border-t border-white/10 bg-black/10 flex items-center justify-between text-[10px] opacity-70 font-mono">
        <span>Role: {role}</span>
        <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
          {branding.source}
        </span>
      </footer>
    </aside>
  )
}
