import webPush from 'web-push';
import { prisma } from './prisma';
import { getSystemSettings } from './settings';
import { logToDb } from './log';

export async function sendPushNotification(title, body, url = '/chat', targetUserIds = null, soundType = 'default') {
  try {
    const settings = await getSystemSettings();
    
    if (!settings.vapidPublicKey || !settings.vapidPrivateKey) {
      console.warn('Push Notification: VAPID keys not configured. Skipping notification.');
      return { success: false, reason: 'VAPID keys not configured' };
    }

    const subject = 'mailto:admin@xbotting.com.br';
    webPush.setVapidDetails(
      subject,
      settings.vapidPublicKey,
      settings.vapidPrivateKey
    );

    const whereClause = {};
    if (targetUserIds && Array.isArray(targetUserIds)) {
      whereClause.userId = { in: targetUserIds };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause
    });
    if (subscriptions.length === 0) {
      return { success: true, sent: 0 };
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      url,
      data: {
        url,
        soundType
      }
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.keysAuth,
              p256dh: sub.keysP256dh
            }
          };
          await webPush.sendNotification(pushSubscription, payload);
          return { id: sub.id, success: true };
        } catch (err) {
          console.error(`Failed to send push notification to ${sub.endpoint}:`, err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
            await logToDb('INFO', 'DATABASE', `Removida assinatura de push inválida ou expirada (HTTP ${err.statusCode}).`);
          }
          return { id: sub.id, success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    return { success: true, total: subscriptions.length, sent: successCount };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}
