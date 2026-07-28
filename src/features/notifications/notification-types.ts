export enum NotificationChannelType {
  WHATSAPP = "WHATSAPP",
  EMAIL = "EMAIL",
  WEBHOOK = "WEBHOOK",
  PUSH = "PUSH"
}

export interface NotificationIntent {
  channel: NotificationChannelType;
  provider: string; // Ex: 'ZAPI', 'RESEND'
  destination: string;
  template: string;
  variables: Record<string, unknown>;
  priority: number;
}
