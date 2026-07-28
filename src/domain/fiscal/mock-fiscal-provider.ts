import { FiscalProvider } from './fiscal-provider'
import { IssueInvoiceRequest, IssueInvoiceResponse, CancelInvoiceRequest, CancelInvoiceResponse } from './fiscal-types'

export class MockFiscalProvider implements FiscalProvider {
  
  get name(): string {
    return 'MockSEFAZ_v1'
  }

  async issueInvoice(request: IssueInvoiceRequest): Promise<IssueInvoiceResponse> {
    // Simular tempo de latência do provedor fiscal (e.g., Sefaz)
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (request.totalAmount <= 0) {
      return {
        status: 'DENIED',
        providerMessage: 'Rejeição: Valor total da nota fiscal não pode ser menor ou igual a zero.',
        rawResponse: { error_code: 'V01', timestamp: new Date().toISOString() }
      }
    }

    // Para fins de teste de reprocessamento, se o valor for exatamente 999.99, retorna PROCESSING
    if (request.totalAmount === 999.99) {
      return {
        status: 'PROCESSING',
        providerMessage: 'Lote recebido com sucesso. Aguardando processamento.',
        rawResponse: { receipt: 'REC-999', timestamp: new Date().toISOString() }
      }
    }

    // Simulação de Sucesso
    const fakeInvoiceNumber = Math.floor(Math.random() * 1000000).toString().padStart(9, '0')
    const fakeAccessKey = Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join('')

    return {
      status: 'AUTHORIZED',
      invoiceNumber: fakeInvoiceNumber,
      xmlUrl: `https://mock-sefaz.gov.br/nfe/${fakeAccessKey}.xml`,
      pdfUrl: `https://mock-sefaz.gov.br/nfe/${fakeAccessKey}.pdf`,
      providerMessage: 'Autorizado o uso da NF-e',
      rawResponse: { access_key: fakeAccessKey, protocol: '123456789', timestamp: new Date().toISOString() }
    }
  }

  async cancelInvoice(request: CancelInvoiceRequest): Promise<CancelInvoiceResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (request.reason.length < 15) {
      return {
        success: false,
        providerMessage: 'Rejeição: Justificativa de cancelamento deve ter no mínimo 15 caracteres.',
        rawResponse: { error_code: 'C01' }
      }
    }

    return {
      success: true,
      providerMessage: 'Cancelamento homologado',
      rawResponse: { protocol: '987654321', timestamp: new Date().toISOString() }
    }
  }
}
