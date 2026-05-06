# Push Notifications — Mobile Receivers & Test Script

Este documento reúne instruções e exemplos para configurar recepção de notificações em várias plataformas (Android, iOS, React Native, Flutter, Ionic) e um script Node.js usando `firebase-admin` para testes.

## 1) Node.js — Script de envio com `firebase-admin`

Instalação:

```bash
npm install firebase-admin --save
```

Crie um arquivo JSON da conta de serviço no Google Cloud e defina a variável de ambiente:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/service-account.json"
```

Script de exemplo (veja `scripts/send-fcm-admin.mjs` no repositório):
- inicializa `firebase-admin` usando `GOOGLE_APPLICATION_CREDENTIALS` ou JSON em `FIREBASE_SERVICE_ACCOUNT`;
- aceita uma lista de tokens via argumento ou arquivo `tokens.json` e envia notificação multicast.

Uso rápido:

```bash
node scripts/send-fcm-admin.mjs token1 token2
# ou
node scripts/send-fcm-admin.mjs --file tokens.json
```

---

## 2) Android (Kotlin)

Dependência (app/build.gradle):

```gradle
implementation 'com.google.firebase:firebase-messaging-ktx:23.4.0'
```

Classe de serviço (`MyFcmService.kt`):

```kotlin
class MyFcmService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        remoteMessage.notification?.let {
            // Mostrar notificação local usando NotificationManager
            showNotification(it.title, it.body)
        }
    }

    override fun onNewToken(token: String) {
        // Envie este token para seu backend (ex.: via fetch para API que grava em user_fcm_tokens)
    }
}
```

AndroidManifest.xml (registre o serviço):

```xml
<service android:name=".MyFcmService" android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

Dica: capture o token via `FirebaseMessaging.getInstance().token.addOnCompleteListener { ... }` para enviar ao backend.

---

## 3) iOS (Swift)

No Xcode: habilite "Push Notifications" e "Background Modes" → Remote notifications.

AppDelegate.swift (exemplo básico):

```swift
import Firebase
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in }
    UIApplication.shared.registerForRemoteNotifications()
    Messaging.messaging().delegate = self as? MessagingDelegate
    return true
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }
}
```

Implemente `messaging(_:didReceiveRegistrationToken:)` para capturar o token e enviá-lo ao seu backend.

---

## 4) React Native (react-native-firebase)

Instale `@react-native-firebase/messaging` e siga o setup nativo.

Exemplo (JS):

```js
import messaging from '@react-native-firebase/messaging';

async function requestPermissionAndGetToken() {
  const authStatus = await messaging().requestPermission();
  if (authStatus) {
    const token = await messaging().getToken();
    // envie token para o backend
  }
}

messaging().onMessage(async remoteMessage => {
  // handle foreground messages
});
```

---

## 5) Flutter (firebase_messaging)

`pubspec.yaml`:

```yaml
dependencies:
  firebase_messaging: ^14.6.0
```

Exemplo (Dart):

```dart
FirebaseMessaging messaging = FirebaseMessaging.instance;
NotificationSettings settings = await messaging.requestPermission();
String? token = await messaging.getToken();
// enviar token ao backend

FirebaseMessaging.onMessage.listen((RemoteMessage message) { /* foreground */ });
```

---

## 6) Ionic / Capacitor

Use `@capacitor/push-notifications` ou integre Firebase via plugins (ex.: `cordova-plugin-fcm-with-dependecy-updated`), preferindo Capacitor moderno.

Exemplo com Capacitor Push API:

```ts
import { PushNotifications } from '@capacitor/push-notifications';

PushNotifications.requestPermissions().then(result => {
  if (result.receive === 'granted') {
    PushNotifications.register();
  }
});

PushNotifications.addListener('registration', (token) => {
  // envie token ao backend
});
```

---

## 7) Boas práticas e checklist
- Sempre enviar tokens ao endpoint seguro que grava em `user_fcm_tokens` escopado por `user_id`.
- Implementar deduplicação de tokens e expiração.
- No backend, usar `firebase-admin` (Node) ou HTTP v1 com JWT em Edge Functions.
- Teste em dispositivos reais; emuladores podem não suportar FCM completamente.

---

Se quiser, gero arquivos de exemplo prontos (Android `MyFcmService.kt`, `AppDelegate.swift`, exemplos React Native/Flutter/Ionic completos) e o script `scripts/send-fcm-admin.mjs` agora.
