'use server'

import { createClient } from '@/lib/supabase/server'
import { BusinessPermission } from '@/domain/auth/permissions'
import { PickListAggregate } from '@/domain/fulfillment/picking/pick-list-aggregate'
import { PickList, PickingExceptionType } from '@/domain/fulfillment/types'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'

export async function registerException(pickListId: string, sessionId: string, productId: string, type: PickingExceptionType, description: string) {
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
    throw new Error('Sem permissão para registrar divergências')
  }

  const { data: pickList, error } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(*), exceptions:pick_list_exceptions(*)')
    .eq('id', pickListId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !pickList) throw new Error('PickList não encontrada')

  const aggregate = PickListAggregate.load(pickList as unknown as PickList)
  aggregate.registerException(productId, type, description, user.id)
  
  const newState = aggregate.getState()
  // Pega a exception recém criada (a última do array)
  const newException = newState.exceptions[newState.exceptions.length - 1]

  const { error: insertError } = await supabase
    .from('pick_list_exceptions')
    .insert({ 
      id: newException.id,
      pick_list_id: pickListId,
      product_id: productId,
      type: newException.type,
      description: newException.description,
      created_by: newException.created_by,
      status: newException.status
    })

  if (insertError) throw insertError

  await supabase.from('picking_sessions').update({ last_activity_at: new Date().toISOString() }).eq('id', sessionId)

  const eventPayload = {
    order_id: newState.order_id,
    type: OrderEventType.PICKING_EXCEPTION_CREATED,
    actor_id: user.id,
    aggregate_type: 'FULFILLMENT',
    aggregate_id: pickListId,
    metadata: { session_id: sessionId, product_id: productId, type }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.PICKING_EXCEPTION_CREATED, { pickListId, exceptionId: newException.id })
  }

  return { success: true }
}
