import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';
import { verifyToken } from '@/lib/auth';

// POST: Subscribe a device to push notifications
export async function POST(request) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription data is missing or invalid' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const auth = keys?.auth || '';
    const p256dh = keys?.p256dh || '';

    // Find authenticated user if exists in cookies session
    let userId = null;
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get('session');
      const token = cookie ? cookie.value : null;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
        }
      }
    } catch (sessionErr) {
      console.error('Error extracting user session in push subscribe:', sessionErr);
    }

    // Save or update subscription in DB (including optional userId link)
    const savedSub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        keysAuth: auth,
        keysP256dh: p256dh,
        userId
      },
      create: {
        endpoint,
        keysAuth: auth,
        keysP256dh: p256dh,
        userId
      }
    });

    await logToDb('INFO', 'API', `Dispositivo inscrito com sucesso para notificações push. Endpoint: ${endpoint.substring(0, 45)}...`);

    return NextResponse.json(savedSub);
  } catch (error) {
    await logToDb('ERROR', 'API', `Erro ao salvar inscrição de push: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error('Error in subscribe POST:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

// DELETE: Unsubscribe a device
export async function DELETE(request) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint }
    });

    await logToDb('INFO', 'API', `Dispositivo desinscrito de notificações push. Endpoint: ${endpoint.substring(0, 45)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    await logToDb('ERROR', 'API', `Erro ao remover inscrição de push: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error('Error in subscribe DELETE:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
