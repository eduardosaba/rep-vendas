import { Inngest } from 'inngest';

// Criamos o cliente que enviará os eventos
export const inngest = new Inngest({
  id: 'repvendas-app',
  name: 'RepVendas Sync',
});
