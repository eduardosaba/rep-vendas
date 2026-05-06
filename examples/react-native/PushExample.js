import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export default function PushExample() {
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
    });
    return unsubscribe;
  }, []);

  async function enablePush() {
    const authStatus = await messaging().requestPermission();
    if (authStatus) {
      const token = await messaging().getToken();
      console.log('FCM token:', token);
      // Envie token ao backend
      fetch('/api/fcm-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform: 'react-native' })
      });
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>React Native Push Example</Text>
      <Button title="Ativar notificações" onPress={enablePush} />
    </View>
  );
}
