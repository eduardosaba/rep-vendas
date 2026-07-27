'use server'

import { createClient } from '@/lib/supabase/server'
import { BusinessPermission } from '@/domain/auth/permissions'
import { PickListAggregate } from '@/domain/fulfillment/picking/pick-list-aggregate'
import { PickList } from '@/domain/fulfillment/types'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'
import { handleCreateDraftInvoiceOnPickingCompleted } from '@/domain/events/handlers/create-draft-invoice'

export async function completePicking(pickListId: string, sessionId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()
    
  if (!profile) throw new Error('Profile not found')

  const hasPermission = (profile.permissions || []).includes(BusinessPermission.EXECUTE_PICKING)
  if (!hasPermission && profile.role !== 'master') {
    throw new Error('Sem permissão para finalizar separação')
  }

  const { data: pickList, error } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(*), exceptions:pick_list_exceptions(*)')
    .eq('id', pickListId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !pickList) throw new Error('PickList não encontrada')

  const aggregate = PickListAggregate.load(pickList as unknown as PickList)
  
  // A domain policy verificará se pode ser completado (100% conferido ou com exceção aprovada)
  aggregate.complete()
  
  const newState = aggregate.getState()

  const { error: updateError } = await supabase
    .from('pick_lists')
    .update({ 
      status: newState.status,
      completed_at: new Date().toISOString()
    })
    .eq('id', pickListId)

  if (updateError) throw updateError

  // Update session
  await supabase.from('picking_sessions').update({ 
    finished_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  }).eq('id', sessionId)

  const eventPayload = {
    order_id: newState.order_id,
    type: OrderEventType.PICKING_COMPLETED,
    actor_id: user.id,
    aggregate_type: 'FULFILLMENT',
    aggregate_id: pickListId,
    metadata: { session_id: sessionId }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.PICKING_COMPLETED, { pickListId })
    
    // Dispara Handler de Domínio de forma assíncrona (Simulando um Event Bus interno)
    handleCreateDraftInvoiceOnPickingCompleted(pickListId).catch(err => {
       console.error('Falha no Event Handler PICKING_COMPLETED:', err)
    })
  }

  return { success: true }
}
