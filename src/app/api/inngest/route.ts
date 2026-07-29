import { inngest } from '@/inngest/client';
import { serve } from 'inngest/next';

// Importação determinística do Worker do Core Financeiro (Sprint 1A)
import { processMercadoPagoWebhook } from '@/inngest/functions/payment-processor';

/**
 * INNGEST CORE ROUTER & HANDLER
 * Gateway único e centralizado que gerencia o ciclo de vida e a execução das funções assíncronas.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,

  functions: [
    // ==========================================
    // MODULE: CORE PAYMENTS ENGINE (Soberano)
    // ==========================================
    processMercadoPagoWebhook,

    // Futuros ganchos da Sprint 1C/1D (syncStockAfterPayment, crmPipeline) entram aqui de forma limpa
  ],
});
