import { toast } from 'sonner';

function canUseNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function ensurePermission(): Promise<NotificationPermission> {
  if (!canUseNotifications()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return 'denied';
  }
}

async function showSystemNotification(title: string, body?: string) {
  if (!canUseNotifications()) return false;
  const perm = await ensurePermission();
  if (perm !== 'granted') return false;
  try {
    // eslint-disable-next-line no-new
    new Notification(title, { body });
    return true;
  } catch (e) {
    return false;
  }
}

export async function notifySuccess(message: string) {
  const shown = await showSystemNotification('Sucesso', message);
  if (!shown) toast.success(message);
}

export async function notifyError(message: string) {
  const shown = await showSystemNotification('Erro', message);
  if (!shown) toast.error(message);
}

export async function notifyInfo(message: string) {
  const shown = await showSystemNotification('Info', message);
  if (!shown) toast(message);
}

export default { notifySuccess, notifyError, notifyInfo };
