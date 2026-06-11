import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import { logToDb } from '@/lib/log';

export async function POST(request) {
  try {
    const { title, body } = await request.json();
    
    await logToDb('INFO', 'API', 'Disparando notificação push de teste.');
    
    const result = await sendPushNotification(
      title || 'Teste do Xbot ⚡',
      body || 'Sua notificação de teste nativa do PWA está funcionando perfeitamente!',
      '/chat'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.reason || result.error }, { status: 400 });
    }

    return NextResponse.json({
      total: result.total,
      sent: result.sent
    });
  } catch (error) {
    console.error('Error in send-test route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
