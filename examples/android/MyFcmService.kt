package com.repvendas.example

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

class MyFcmService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        remoteMessage.notification?.let {
            showNotification(it.title ?: "Novo pedido", it.body ?: "Você tem uma nova notificação")
        }
    }

    override fun onNewToken(token: String) {
        // Envie este token para seu backend seguro
        sendTokenToBackend(token)
    }

    private fun showNotification(title: String, body: String) {
        val channelId = "repvendas_notifications"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(channelId, "Notificações Rep‑Vendas", NotificationManager.IMPORTANCE_DEFAULT)
            nm.createNotificationChannel(ch)
        }

        val n = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .build()

        nm.notify(System.currentTimeMillis().toInt(), n)
    }

    private fun sendTokenToBackend(token: String) {
        Thread {
            try {
                val url = URL("/api/fcm-tokens")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                val payload = "{\"token\":\"$token\",\"platform\":\"android\"}"
                conn.outputStream.use { it.write(payload.toByteArray()) }
                val code = conn.responseCode
                conn.inputStream.close()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }
}
