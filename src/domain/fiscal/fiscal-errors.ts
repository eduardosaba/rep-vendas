export class FiscalProviderError extends Error {
  constructor(public providerName: string, message: string, public rawError?: any) {
    super(`[FiscalProvider - ${providerName}] ${message}`)
    this.name = 'FiscalProviderError'
  }
}
