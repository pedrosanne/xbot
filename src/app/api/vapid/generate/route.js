import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webPush from 'web-push';
import { logToDb } from '@/lib/log';

// GET or POST: Generate VAPID keys
export async function POST(request) {
  try {
    await logToDb('INFO', 'API', 'Solicitação de geração de novas chaves VAPID.');

    // Generate keys
    const vapidKeys = webPush.generateVAPIDKeys();

    // Automatically save them in settings in database
    const updatedSettings = await prisma.setting.update({
      where: { id: 'system' },
      data: {
        vapidPublicKey: vapidKeys.publicKey,
        vapidPrivateKey: vapidKeys.privateKey
      }
    });

    await logToDb('INFO', 'API', 'Novas chaves VAPID geradas e salvas com sucesso.');

    return NextResponse.json({
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey
    });
  } catch (error) {
    await logToDb('ERROR', 'API', `Erro ao gerar chaves VAPID: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error('Error generating VAPID keys:', error);
    return NextResponse.json({ error: 'Failed to generate VAPID keys' }, { status: 500 });
  }
}
