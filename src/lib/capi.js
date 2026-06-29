import crypto from 'crypto';
import { logToDb } from './log';
import { getSystemSettings } from './settings';

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
 * Send a Conversions API (CAPI) Purchase event to Meta
 */
export async function sendMetaCapiPurchase({ contact, payment }) {
  try {
    const settings = await getSystemSettings();
    const pixelId = settings.globalPixelId;
    const accessToken = settings.globalPixelToken;
    const testCode = settings.globalPixelTestCode;

    if (!pixelId || !accessToken) {
      // Quiet return if CAPI is not configured
      return { success: false, message: 'Meta CAPI não configurado.' };
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
          id: payment.productId || 'default',
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

    const body = {
      data: [eventPayload],
      ...(testCode && { test_event_code: testCode })
    };

    await logToDb('INFO', 'API', `Enviando evento de compra (Purchase) para o Meta CAPI. Event ID: ${eventId}. Test Code: ${testCode || 'Nenhum'}`);

    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `Erro HTTP ${res.status}`);
    }

    await logToDb('INFO', 'API', `Evento Purchase enviado com sucesso ao Meta CAPI. Eventos recebidos: ${data.events_received}`);
    return { success: true, data };
  } catch (err) {
    console.error('Error sending Meta CAPI event:', err);
    await logToDb('ERROR', 'API', `Falha ao enviar evento ao Meta CAPI: ${err.message}`, {
      error: err.message
    });
    return { success: false, error: err.message };
  }
}
