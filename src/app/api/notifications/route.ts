import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

// Nota: anteriormente as notificações eram mantidas em memória.
// Agora persistimos no banco via Supabase server client. Mantemos um
// fallback em memória caso a escrita ao banco falhe.

let inMemoryNotifications: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    try {
      const supabase = await createRouteSupabase();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const notifications = (data || []) as any[];
      return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
    } catch (dbErr) {
      // Fallback para in-memory se o banco não estiver acessível
      console.warn('Fallback in-memory notifications (GET):', dbErr);
      const userNotifications = inMemoryNotifications.filter((n) => n.userId === userId);
      return NextResponse.json({ notifications: userNotifications, unreadCount: userNotifications.filter((n) => !n.read).length });
    }
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message, type = 'info', data } = await request.json();

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Campos obrigatórios: userId, title, message' }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      title,
      message,
      type,
      data: data || null,
      read: false,
    };

    try {
      const supabase = await createRouteSupabase();
      const { data: inserted, error } = await supabase.from('notifications').insert(payload).select().maybeSingle();
      if (error) throw error;

      console.log('🔔 Notificação criada no DB:', inserted);
      return NextResponse.json({ success: true, notification: inserted });
    } catch (dbErr) {
      // Fallback para memória
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        title,
        message,
        type,
        data,
        read: false,
        createdAt: new Date().toISOString(),
      };
      inMemoryNotifications.push(notification);
      console.warn('Fallback in-memory notifications (POST):', dbErr);
      return NextResponse.json({ success: true, notification });
    }
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { notificationId, userId } = await request.json();

    if (!notificationId || !userId) {
      return NextResponse.json({ error: 'Campos obrigatórios: notificationId, userId' }, { status: 400 });
    }

    try {
      const supabase = await createRouteSupabase();
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;

      return NextResponse.json({ success: true, notification: data });
    } catch (dbErr) {
      const idx = inMemoryNotifications.findIndex((n) => n.id === notificationId && n.userId === userId);
      if (idx === -1) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
      inMemoryNotifications[idx].read = true;
      console.warn('Fallback in-memory notifications (PATCH):', dbErr);
      return NextResponse.json({ success: true, notification: inMemoryNotifications[idx] });
    }
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
