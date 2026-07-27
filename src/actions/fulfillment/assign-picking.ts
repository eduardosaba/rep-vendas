'use server'

import { createClient } from '@/lib/supabase/server'
import { BusinessPermission } from '@/domain/auth/permissions'
import { PickListAggregate } from '@/domain/fulfillment/picking/pick-list-aggregate'
import { PickList } from '@/domain/fulfillment/types'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'

export async function assignPicking(pickListId: string) {
  const supabase = await createClient()
  
  // 1. Auth & Permissão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()
    
  if (!profile) throw new Error('Profile not found')

  const hasPermission = (profile.permissions || []).includes(BusinessPermission.ASSIGN_PICKING)
  if (!hasPermission && profile.role !== 'master') {
    throw new Error('Sem permissão para assumir fila de separação')
  }

  // 2. Load Aggregate State
  const { data: pickList, error } = await supabase
    .from('pick_lists')
    .select('*, items:pick_list_items(*), exceptions:pick_list_exceptions(*)')
    .eq('id', pickListId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !pickList) throw new Error('PickList não encontrada')

  // 3. Executar Regra de Domínio
  const aggregate = PickListAggregate.load(pickList as unknown as PickList)
  aggregate.assign(user.id)
  
  const newState = aggregate.getState()

  // 4. Salvar estado mutado
  const { error: updateError } = await supabase
    .from('pick_lists')
    .update({ 
      status: newState.status,
      assigned_to: newState.assigned_to,
      locked_by: newState.locked_by,
      locked_at: newState.locked_at
    })
    .eq('id', pickListId)

  if (updateError) throw updateError

  // 5. Iniciar Picking Session (Produtividade)
  const { data: session } = await supabase
    .from('picking_sessions')
    .insert({
      pick_list_id: pickListId,
      operator_id: user.id,
      organization_id: profile.organization_id,
      started_at: new Date().toISOString()
    })
    .select('id')
    .single()

  // 6. Registrar Evento e Outbox
  const eventPayload = {
    order_id: newState.order_id,
    type: OrderEventType.PICKING_ASSIGNED,
    actor_id: user.id,
    aggregate_type: 'FULFILLMENT',
    aggregate_id: pickListId,
    metadata: { session_id: session?.id }
  }

  const { data: eventData } = await supabase
    .from('order_events')
    .insert(eventPayload)
    .select('id')
    .single()

  if (eventData) {
    await notifyEvent(supabase, eventData.id, OrderEventType.PICKING_ASSIGNED, { pickListId })
  }

  return { success: true, sessionId: session?.id }
}
