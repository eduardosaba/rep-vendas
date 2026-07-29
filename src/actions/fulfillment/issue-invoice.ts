'use server'

import { createClient } from '@/lib/supabase/server'
import { BusinessPermission } from '@/domain/auth/permissions'
import { InvoiceAggregate } from '@/domain/fulfillment/invoicing/invoice-aggregate'
import { MockFiscalProvider } from '@/domain/fiscal/mock-fiscal-provider'
import { FiscalStatus, InvoiceStatus } from '@/domain/fulfillment/invoicing/types'
import { OrderEventType } from '@/domain/orders/types'
import { notifyEvent } from '@/features/notifications/outbox-service'
import { handleCreateShipmentOnInvoiceIssued } from '@/domain/events/handlers/create-shipment'

export async function issueInvoice(invoiceId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, permissions, role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Perfil não encontrado.')

  const hasPerm = (profile.permissions || []).includes(BusinessPermission.ISSUE_INVOICE) || profile.role === 'master'
  if (!hasPerm) {
    throw new Error('Acesso negado: Falta permissão de emissão fiscal.')
  }

  // 1. Carregar a Invoice do Banco
  const { data: invoiceData, error: loadError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (loadError || !invoiceData) {
    throw new Error('Invoice não encontrada.')
  }

  // 2. Instanciar Aggregate e Provider
  const aggregate = InvoiceAggregate.load(invoiceData as any)
  const provider = new MockFiscalProvider()

  try {
    // 3. Preparar envio (muda status para GENERATED e PROCESSANDO)
    aggregate.submitToProvider(profile.id, provider.name)
    
    // Atualizar BD para "processando" antes da chamada demorada
    const processingState = aggregate.getState()
    await supabase.from('invoices').update({
      status: processingState.status,
      fiscal_status: processingState.fiscal_status,
      fiscal_provider: processingState.fiscal_provider,
      created_by: processingState.created_by
    }).eq('id', invoiceId)

    // Evento Submetido
    const { data: evtSub } = await supabase.from('order_events').insert({
      order_id: processingState.order_id,
      type: OrderEventType.INVOICE_SUBMITTED_TO_PROVIDER,
      actor_id: profile.id,
      aggregate_type: 'FULFILLMENT',
      aggregate_id: invoiceId
    }).select('id').single()
    if (evtSub) await notifyEvent(supabase, evtSub.id, OrderEventType.INVOICE_SUBMITTED_TO_PROVIDER, { invoiceId })

    // 4. Chamada Fiscal Real/Mock
    const response = await provider.issueInvoice({
      invoiceId: invoiceId,
      organizationId: profile.organization_id,
      orderId: processingState.order_id,
      totalAmount: processingState.total_amount,
      customerData: processingState.customer_snapshot,
      itemsData: processingState.items_snapshot
    })

    // 5. Processar Resposta (muda status para ISSUED ou REJECTED)
    aggregate.processFiscalResponse(
      response.status as FiscalStatus, 
      response.rawResponse, 
      response.invoiceNumber, 
      response.xmlUrl, 
      response.pdfUrl,
      profile.id
    )

    const finalState = aggregate.getState()

    // 6. Atualizar BD com o desfecho
    await supabase.from('invoices').update({
      status: finalState.status,
      fiscal_status: finalState.fiscal_status,
      provider_response: finalState.provider_response,
      invoice_number: finalState.invoice_number,
      xml_url: finalState.xml_url,
      pdf_url: finalState.pdf_url,
      issued_at: finalState.issued_at,
      issued_by: finalState.issued_by
    }).eq('id', invoiceId)

    // 7. Eventos Pós-Emissão
    const eventType = finalState.status === InvoiceStatus.ISSUED 
      ? OrderEventType.INVOICE_ISSUED 
      : OrderEventType.INVOICE_REJECTED

    const { data: evtRes } = await supabase.from('order_events').insert({
      order_id: finalState.order_id,
      type: eventType,
      actor_id: profile.id,
      aggregate_type: 'FULFILLMENT',
      aggregate_id: invoiceId,
      metadata: { provider_message: response.providerMessage }
    }).select('id').single()
    
    if (evtRes) {
      await notifyEvent(supabase, evtRes.id, eventType, { invoiceId })
      
      // Se sucesso, encadeia a criação do Shipment via Handler Assíncrono (Domain Event)
      if (finalState.status === InvoiceStatus.ISSUED) {
         handleCreateShipmentOnInvoiceIssued(invoiceId).catch(err => {
            console.error('Falha no Event Handler INVOICE_ISSUED:', err)
         })
      }
    }

    return { 
      success: true, 
      status: finalState.status, 
      message: response.providerMessage 
    }

  } catch (error: any) {
    console.error('Erro na emissão de nota:', error)
    return { success: false, error: error.message }
  }
}
