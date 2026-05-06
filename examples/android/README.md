Android example

1) Adicione a dependência no `app/build.gradle`:

```gradle
implementation 'com.google.firebase:firebase-messaging-ktx:23.4.0'
```

2) Registre `MyFcmService` no `AndroidManifest.xml`:

```xml
<service android:name="com.repvendas.example.MyFcmService" android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

3) Capture o token no app e envie ao endpoint que grava em `user_fcm_tokens`.
