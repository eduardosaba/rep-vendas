'use client'

import { usePathname } from 'next/navigation'
import { AlertTriangle, Info } from 'lucide-react'

export function MaintenanceBanner({ forcedVisible }: { forcedVisible?: boolean }) {
  const pathname = usePathname() ?? ''

  // permite controle server-side via MAINTENANCE_MODE ou client-side via NEXT_PUBLIC
  const isMaintenance = Boolean(forcedVisible) || process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'

  if (!isMaintenance) return null

  const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/torre-de-controle') || pathname.startsWith('/dashboard')

  return (
    <div className={`w-full py-2.5 px-6 text-sm font-medium shadow-md border-b ${
      isAdminArea
        ? 'bg-gray-900 text-gray-100 border-red-700'
        : 'bg-blue-600 text-white border-blue-700'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        {isAdminArea ? (
          <>
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="text-center">
              <strong className="font-bold text-red-400">ALERTA TÉCNICO (SUPABASE):</strong>
              {' '}
              Instabilidade no Postgres (Versão &lt; 15.1.1.57).
              <span className="underline decoration-red-500 ml-1">Não reinicie o projeto no painel.</span>
            </span>
          </>
        ) : (
          <>
            <Info className="h-5 w-5 text-blue-200" />
            <span className="text-center">
              <strong className="font-semibold">RepVendas Informa:</strong>
              {' '}
              Estamos otimizando nossos servidores para melhorar sua experiência. Algumas funções podem oscilar temporariamente.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
