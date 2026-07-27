import { NotificationIntent } from '../notification-types'

export interface NotificationChannel {
  send(intent: NotificationIntent): Promise<{ success: boolean; error?: string }>;
}
