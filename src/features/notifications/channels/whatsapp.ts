import { NotificationChannel } from './index'
import { NotificationIntent } from '../notification-types'

export class WhatsAppChannel implements NotificationChannel {
  async send(intent: NotificationIntent): Promise<{ success: boolean; error?: string }> {
    console.log(`[STUB WHATSAPP ${intent.provider}] Dispatching template '${intent.template}' to ${intent.destination}`);
    console.log(`[STUB WHATSAPP Variables]:`, intent.variables);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Stub success
    return { success: true };
  }
}
