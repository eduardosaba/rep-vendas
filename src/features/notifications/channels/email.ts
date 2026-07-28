import { NotificationChannel } from './index'
import { NotificationIntent } from '../notification-types'

export class EmailChannel implements NotificationChannel {
  async send(intent: NotificationIntent): Promise<{ success: boolean; error?: string }> {
    console.log(`[STUB EMAIL ${intent.provider}] Dispatching template '${intent.template}' to ${intent.destination}`);
    console.log(`[STUB EMAIL Variables]:`, intent.variables);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Stub success
    return { success: true };
  }
}
