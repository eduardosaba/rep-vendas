import { PushNotifications } from '@capacitor/push-notifications';

export async function setupPush() {
  const { receive } = await PushNotifications.requestPermissions();
  if (receive === 'granted') {
    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      // Envie token ao backend
      fetch('/api/fcm-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value, platform: 'capacitor' })
      });
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('push received', notification);
    });
  }
}
