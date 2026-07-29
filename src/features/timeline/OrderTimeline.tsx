import React from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrderTimelineProps {
  orderId: string
}

export function OrderTimeline({ orderId }: OrderTimelineProps) {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadTimeline() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('aggregate_type', 'ORDER')
        .eq('order_id', orderId) // order_id acts as aggregate_id in this case
        .order('order_version', { ascending: true })

      if (!error && data) {
        setEvents(data)
      }
      setLoading(false)
    }

    if (orderId) loadTimeline()
  }, [orderId])

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Carregando histórico...</div>
  if (events.length === 0) return <div className="text-xs text-slate-500">Nenhum evento registrado.</div>

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED': return '🛒'
      case 'APPROVAL_REQUESTED': return '⚠️'
      case 'APPROVED': return '✅'
      case 'REJECTED': return '❌'
      case 'INVOICED': return '🧾'
      case 'SHIPPED': return '🚚'
      case 'DELIVERED': return '📍'
      case 'CANCELLED': return '⛔'
      default: return '🔹'
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED': return 'Pedido criado'
      case 'APPROVAL_REQUESTED': return 'Enviado para aprovação'
      case 'APPROVED': return 'Aprovado'
      case 'REJECTED': return 'Rejeitado'
      case 'INVOICED': return 'Faturado'
      case 'SHIPPED': return 'Enviado'
      case 'DELIVERED': return 'Entregue'
      case 'CANCELLED': return 'Cancelado'
      default: return type
    }
  }

  return (
    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            {getEventIcon(event.event_type)}
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-slate-700 text-sm">{getEventLabel(event.event_type)}</div>
              <time className="font-mono text-xs text-emerald-600">
                {new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
            
            <div className="text-slate-500 text-xs">
              Por {event.actor_name || 'Sistema'}
            </div>
            
            {event.payload?.reason && (
              <div className="mt-2 text-xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-100">
                <strong>Motivo:</strong> {event.payload.reason}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
