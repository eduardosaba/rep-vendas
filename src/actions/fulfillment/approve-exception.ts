'use server'

import { createClient } from '@/lib/supabase/server'
import { BusinessPermission } from '@/domain/auth/permissions'
import { PickListAggregate } from '@/domain/fulfillment/picking/pick-list-aggregate'
import { PickList } from '@/domain/fulfillment/types'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'

export async function approveException(pickListId: string, exceptionId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()
    
  if (!profile) throw new Error('Profile not found')

  const hasPermission = (profile.permissions || []).includes(BusinessPermission.APPROVE_PICKING_EXCEPTION)
  if (!hasPermission && profile.role !== 'master') {
    throw new Error('Sem permissão para aprovar divergências de estoque')
  }

  const { data: pickList, error } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(*), exceptions:pick_list_exceptions(*)')
    .eq('id', pickListId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !pickList) throw new Error('PickList não encontrada')

  const aggregate = PickListAggregate.load(pickList as unknown as PickList)
  aggregate.approveException(exceptionId, user.id)
  
  const newState = aggregate.getState()
  const updatedException = newState.exceptions.find(e => e.id === exceptionId)!

  const { error: updateError } = await supabase
    .from('pick_list_exceptions')
    .update({ 
      status: updatedException.status,
      approved_by: updatedException.approved_by,
      approved_at: updatedException.approved_at
    })
    .eq('id', exceptionId)

  if (updateError) throw updateError

  const eventPayload = {
    order_id: newState.order_id,
    type: OrderEventType.PICKING_EXCEPTION_APPROVED,
    actor_id: user.id,
    aggregate_type: 'FULFILLMENT',
    aggregate_id: pickListId,
    metadata: { exception_id: exceptionId }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.PICKING_EXCEPTION_APPROVED, { pickListId, exceptionId })
  }

  return { success: true }
}
