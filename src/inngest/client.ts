import { Inngest } from 'inngest';

// Criamos o cliente que enviará os eventos. A versão do SDK usada
// espera um único argumento (config). O Inngest SDK lê as variáveis
// de ambiente `INNGEST_API_KEY` / `INNGEST_EVENT_KEY` automaticamente
// em execução server-side, então basta passar o id/nome.
export const inngest = new Inngest({
  id: 'repvendas-app',
  name: 'RepVendas Sync',
});
