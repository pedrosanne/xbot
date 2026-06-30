import crypto from 'crypto';
import { logToDb } from './log';
import { getSystemSettings } from './settings';
import { prisma } from './prisma';

// Helper: Hash using SHA-256 (required by Meta CAPI)
function hash(val) {
  if (!val) return null;
  const clean = String(val).trim().toLowerCase();
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Helper: Extract first name
function getFirstName(fullName) {
  if (!fullName) return null;
  return fullName.split(' ')[0];
}

/**
 * Send a Conversions API (CAPI) Purchase event to Meta for each product-configured pixel
 */
export async function sendMetaCapiPurchase({ contact, payment }) {
  try {
    const settings = await getSystemSettings();
    
    if (!payment.productId) {
      await logToDb('INFO', 'API', `Nenhum produto associado ao pagamento ${payment.id}. Pulando Meta CAPI.`);
      return { success: false, message: 'Sem produto associado.' };
    }

    // Fetch Facebook pixels for this product
    const pixels = await prisma.pixel.findMany({
      where: {
        productId: payment.productId,
        platform: 'facebook'
      }
    });

    if (pixels.length === 0) {
      await logToDb('INFO', 'API', `Nenhum Meta Pixel configurado para o produto '${payment.productId}'. Pulando CAPI.`);
      return { success: false, message: 'Sem pixels para este produto.' };
    }

    const cleanPhone = contact.clientPhone || contact.id.split(':').pop();
    const hashedPhone = hash(cleanPhone);
    const hashedEmail = contact.email ? hash(contact.email) : null;
    const hashedFirstName = contact.name ? hash(getFirstName(contact.name)) : null;

    const eventId = `pur_${payment.id}`;
    const eventTime = Math.floor(Date.now() / 1000);

    const userData = {
      ...(hashedPhone && { ph: [hashedPhone] }),
      ...(hashedEmail && { em: [hashedEmail] }),
      ...(hashedFirstName && { fn: [hashedFirstName] }),
      ...(contact.fbp && { fbp: contact.fbp }),
      ...(contact.fbc && { fbc: contact.fbc })
    };

    const customData = {
      value: payment.amount,
      currency: 'BRL',
      content_type: 'product',
      contents: [
        {
          id: payment.productId,
          quantity: 1,
          item_price: payment.amount
        }
      ]
    };

    const eventPayload = {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: eventId,
      event_source_url: settings.publicBaseUrl || 'https://xbot.com',
      action_source: 'chat',
      user_data: userData,
      custom_data: customData
    };

    let successCount = 0;
    
    for (const pixel of pixels) {
      const pixelId = pixel.pixelId;
      const accessToken = pixel.token;
      const testCode = pixel.testCode;

      if (!pixelId || !accessToken) {
        await logToDb('WARN', 'API', `Pixel ${pixel.id} associado ao produto ${payment.productId} está sem Pixel ID ou Access Token.`);
        continue;
      }

      const body = {
        data: [eventPayload],
        ...(testCode && { test_event_code: testCode })
      };

      try {
        await logToDb('INFO', 'API', `Enviando evento Purchase para o Pixel ID: ${pixelId}. Test Code: ${testCode || 'Nenhum'}`);

        const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || `Erro HTTP ${res.status}`);
        }

        successCount++;
        await logToDb('INFO', 'API', `Evento Purchase enviado com sucesso ao Pixel ${pixelId}. Eventos recebidos: ${data.events_received}`);
      } catch (pixelErr) {
        console.error(`Error sending CAPI to pixel ${pixelId}:`, pixelErr);
        await logToDb('ERROR', 'API', `Falha ao enviar evento ao Pixel ${pixelId}: ${pixelErr.message}`);
      }
    }

    return { success: successCount > 0, sentCount: successCount };
  } catch (err) {
    console.error('Error sending Meta CAPI event:', err);
    await logToDb('ERROR', 'API', `Falha crítica ao enviar evento ao Meta CAPI: ${err.message}`, {
      error: err.message
    });
    return { success: false, error: err.message };
  }
}
