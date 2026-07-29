import React from 'react'
import { ApplicationContext } from '@/core/context/application-context'
import { DistributorSidebar } from './DistributorSidebar'
import { DistributorHeader } from './DistributorHeader'
import { BrandingStyleInjector } from '@/features/branding'

interface DistributorShellProps {
  context: ApplicationContext
  children: React.ReactNode
}

export function DistributorShell({ context, children }: DistributorShellProps) {
  const { branding } = context

  return (
    <div className="min-h-screen bg-[var(--brand-background)] flex flex-col antialiased">
      <BrandingStyleInjector branding={branding} />

      <div className="flex flex-1">
        <DistributorSidebar context={context} />

        <main className="flex-1 flex flex-col min-h-screen">
          <DistributorHeader context={context} />

          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
