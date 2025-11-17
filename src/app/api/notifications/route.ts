import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

// Simulação de notificações em memória (em produção, use Redis ou database)
let notifications: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 },
      );
    }

    // Filtrar notificações do usuário
    const userNotifications = notifications.filter((n) => n.userId === userId);

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: userNotifications.filter((n) => !n.read).length,
    });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      title,
      message,
      type = "info",
      data,
    } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "Campos obrigatórios: userId, title, message" },
        { status: 400 },
      );
    }

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      message,
      type, // 'info', 'success', 'warning', 'error'
      data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(notification);

    // Manter apenas as últimas 100 notificações por usuário
    const userNotifications = notifications.filter((n) => n.userId === userId);
    if (userNotifications.length > 100) {
      const oldestNotifications = userNotifications
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .slice(0, userNotifications.length - 100);

      notifications = notifications.filter(
        (n) => !oldestNotifications.includes(n),
      );
    }

    console.log("🔔 Notificação criada:", notification);

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { notificationId, userId } = await request.json();

    if (!notificationId || !userId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: notificationId, userId" },
        { status: 400 },
      );
    }

    const notificationIndex = notifications.findIndex(
      (n) => n.id === notificationId && n.userId === userId,
    );

    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 },
      );
    }

    notifications[notificationIndex].read = true;

    return NextResponse.json({
      success: true,
      notification: notifications[notificationIndex],
    });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
