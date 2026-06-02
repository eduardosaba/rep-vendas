// @ts-nocheck
'use server';

import createServerSupabaseClient from '@/lib/supabase/server';

// Inicializa o Admin SDK apenas uma vez
function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    console.warn(
      '[sendOrderNotification] Firebase Admin não configurado (variáveis faltando)'
    );
    return null as unknown as typeof admin;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    return admin;
  } catch (err) {
    console.error('[sendOrderNotification] erro ao inicializar admin', err);
    return null as unknown as typeof admin;
  }
}

export async function sendOrderNotification(
  vendedorId: string,
  orderDetails: { cliente?: string; valor?: string; id?: string }
) {
  try {
    const adminSdk = initFirebaseAdmin();
    if (!adminSdk)
      return { success: false, message: 'Firebase Admin não configurado' };

    const supabase = await createServerSupabaseClient();

    const { data: devices, error } = await supabase
      .from('user_fcm_tokens')
      .select('token')
      .eq('user_id', vendedorId);

    if (error) {
      console.error('[sendOrderNotification] erro ao buscar tokens', error);
      return { success: false, error };
    }

    const tokens = (devices || []).map((d: any) => d.token).filter(Boolean);
    if (!tokens.length)
      return { success: true, message: 'Nenhum token registrado' };

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: '🛍️ Novo Pedido no Catálogo!',
        body: `${orderDetails.cliente || 'Cliente'} enviou pedido${orderDetails.valor ? ' de R$ ' + orderDetails.valor : ''}`,
      },
      data: {
        url: `/dashboard/orders/${orderDetails.id || ''}`,
        orderId: String(orderDetails.id || ''),
      },
      tokens,
    };

    const response = await adminSdk
      .messaging()
      .sendEachForMulticast(message as any);
    console.log(
      '[sendOrderNotification] enviada:',
      response.successCount,
      'falhas:',
      response.failureCount
    );
    return { success: true, response };
  } catch (err) {
    console.error('[sendOrderNotification] erro', err);
    return { success: false, error: err };
  }
}
