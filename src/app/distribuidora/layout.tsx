import React from 'react'
import { getApplicationContext } from '@/core/context/application-context'
import { DistributorShell } from '@/features/dashboard/components/DistributorShell'
import { DraftCartProvider } from '@/features/cart/use-draft-cart'
import { getActiveDraftWithItems } from '@/features/cart/draft-order-service'
import { CartDrawer } from '@/features/cart/components/CartDrawer'

export default async function DistribuidoraRootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const context = await getApplicationContext()
  const { data: draftData } = await getActiveDraftWithItems()

  if (!context) {
    return <div className="p-8 text-slate-500">Sessão expirada ou contexto inválido.</div>
  }

  return (
    <DraftCartProvider>
      <DistributorShell context={context}>
        {children}
      </DistributorShell>
      <CartDrawer activeDraft={draftData?.draft} draftItems={draftData?.items || []} />
    </DraftCartProvider>
  )
}
