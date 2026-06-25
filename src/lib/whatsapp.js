import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';
import { logToDb } from './log';
import { prisma } from './prisma';
import { uploadToSupabaseStorage } from './storage';

const WHATSAPP_API_VERSION = 'v20.0';

export async function sendWhatsAppMessage(payload, connection = null) {
  // Strip scoped contactId prefix (e.g. phoneId:clientPhone) to get pure destination number
  if (payload && payload.to && typeof payload.to === 'string' && payload.to.includes(':')) {
    payload.to = payload.to.split(':').pop();
  }

  // Check if this payload is simulated (starts with wamid_simulated_ or is sent to simulated numbers)
  const isSimulatedMsg = 
    (payload.message_id && String(payload.message_id).includes('simulated')) ||
    (payload.to && (String(payload.to).includes('simulated') || String(payload.to).includes('999999999') || String(payload.to).includes('88887777')));

  if (isSimulatedMsg) {
    await logToDb('INFO', 'API', `[SIMULADOR] Mensagem/ação simulada registrada localmente. Evitando chamada à API do WhatsApp.`);
    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: payload.to || 'simulated', wa_id: payload.to || 'simulated' }],
      messages: [{ id: payload.message_id || `simulated_msg_${Date.now()}` }]
    };
  }

  let whatsappToken, whatsappPhoneId;

  if (connection) {
    whatsappToken = connection.whatsappToken;
    whatsappPhoneId = connection.whatsappPhoneId;
  } else {
    const settings = await getSystemSettings();
    whatsappToken = settings.whatsappToken;
    whatsappPhoneId = settings.whatsappPhoneId;
  }

  if (!whatsappToken || !whatsappPhoneId) {
    await logToDb('ERROR', 'API', 'Falha no envio de mensagem: Credenciais do WhatsApp não configuradas (Token ou Phone ID em branco).');
    console.error('WhatsApp API not configured. Missing Token or Phone ID.');
    return null;
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneId}/messages`;

  const targetLogRecipient = payload.to || 'status/indicator';
  const targetLogType = payload.type || payload.status || 'unknown';

  try {
    await logToDb('INFO', 'API', `Enviando mensagem WhatsApp para o número ${targetLogRecipient}`, { type: targetLogType });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      await logToDb('ERROR', 'API', `Erro retornado pela API do WhatsApp (Código HTTP ${response.status})`, data);
      console.error('WhatsApp API Error Response:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Error sending message via WhatsApp API');
    }
    
    await logToDb('INFO', 'API', `Mensagem WhatsApp enviada com sucesso para ${targetLogRecipient}. ID: ${data.messages?.[0]?.id || 'N/A'}`);
    return data;
  } catch (error) {
    await logToDb('ERROR', 'API', `Exceção de rede ao enviar mensagem via WhatsApp: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
}

export async function sendText(to, text, contextMessageId = null, connection = null) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'text',
    text: { body: text },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendAudio(to, audioUrl, contextMessageId = null, connection = null) {
  const resolvedUrl = resolveSupabaseUrl(audioUrl);
  const isOgg = typeof resolvedUrl === 'string' && resolvedUrl.toLowerCase().split('?')[0].endsWith('.ogg');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'audio',
    audio: { 
      link: resolvedUrl,
      ...(isOgg && { voice: true })
    },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendImage(to, imageUrl, caption = '', contextMessageId = null, connection = null) {
  let targetImageUrl = resolveSupabaseUrl(imageUrl);
  if (targetImageUrl && typeof targetImageUrl === 'string') {
    if (targetImageUrl.toLowerCase().endsWith('.webp')) {
      targetImageUrl = targetImageUrl.slice(0, -5) + '.png';
    } else if (targetImageUrl.toLowerCase().includes('.webp?')) {
      targetImageUrl = targetImageUrl.replace(/\.webp\?/i, '.png?');
    }
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'image',
    image: {
      link: targetImageUrl,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendDocument(to, docUrl, filename = 'document', caption = '', contextMessageId = null, connection = null) {
  const resolvedUrl = resolveSupabaseUrl(docUrl);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'document',
    document: {
      link: resolvedUrl,
      filename,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendVideo(to, videoUrl, caption = '', contextMessageId = null, connection = null) {
  const resolvedUrl = resolveSupabaseUrl(videoUrl);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'video',
    video: {
      link: resolvedUrl,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendButtons(to, bodyText, buttons, contextMessageId = null, connection = null) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.substring(0, 20),
          },
        })),
      },
    },
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendCTAUrlButton(to, bodyText, buttonTitle, url, contextMessageId = null, connection = null) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    ...(contextMessageId && { context: { message_id: contextMessageId } }),
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: bodyText },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: buttonTitle.substring(0, 20),
          url: url
        }
      }
    }
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendPixPaymentRequest(to, amountInCents, pixCode, merchantName, pixKey, keyType, referenceId = null, bodyText = "Solicitação de Pagamento Pix", connection = null) {
  const refId = referenceId || `pay_${Date.now()}`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'order_details',
      body: {
        text: bodyText
      },
      action: {
        name: 'review_and_pay',
        parameters: {
          reference_id: refId,
          type: 'digital-goods',
          payment_type: 'br',
          currency: 'BRL',
          total_amount: {
            value: amountInCents,
            offset: 100
          },
          payment_settings: [
            {
              type: 'pix_dynamic_code',
              pix_dynamic_code: {
                code: pixCode,
                merchant_name: merchantName,
                key: pixKey,
                key_type: keyType
              }
            }
          ]
        }
      }
    }
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function sendTypingIndicator(to, connection = null) {
  // Official WhatsApp Cloud API does not support typing_indicator.
  // We return null immediately to avoid HTTP 400 errors and database log pollution.
  return null;
}



// Downloads media from Meta Servers to database storage
export async function downloadWhatsAppMedia(mediaId, mimeType, customToken = null) {
  let whatsappToken = customToken;
  if (!whatsappToken) {
    const settings = await getSystemSettings();
    whatsappToken = settings.whatsappToken;
  }

  if (!whatsappToken) {
    console.error('WhatsApp API Token not configured. Cannot download media.');
    return '';
  }

  try {
    // 1. Get Media URL
    const mediaUrlResponse = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${whatsappToken}` }
    });

    if (!mediaUrlResponse.ok) {
      const errData = await mediaUrlResponse.json();
      throw new Error(errData.error?.message || 'Failed to retrieve media download URL');
    }

    const mediaData = await mediaUrlResponse.json();
    const downloadUrl = mediaData.url;
    if (!downloadUrl) throw new Error('No URL found in media metadata');

    // 2. Download Media Stream
    const mediaFileResponse = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${whatsappToken}` }
    });

    if (!mediaFileResponse.ok) {
      throw new Error(`Failed to download media file: ${mediaFileResponse.statusText}`);
    }

    const buffer = Buffer.from(await mediaFileResponse.arrayBuffer());

    // 3. Define local filename
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `${mediaId}${extension}`;
    
    // Save to Supabase Storage
    await uploadToSupabaseStorage(filename, mimeType, buffer);

    // Save metadata record in DB
    await prisma.upload.upsert({
      where: { filename },
      update: {
        mimeType
      },
      create: {
        filename,
        mimeType
      }
    });

    console.log(`Saved WhatsApp media to Supabase Storage: ${filename}`);

    return `/api/uploads/${filename}`;
  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    return '';
  }
}

function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/ogg': '.ogg',
    'audio/ogg; codecs=opus': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/amr': '.amr',
    'audio/mp4': '.m4a',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
  };

  // Strip parameters like ;codecs=opus
  const baseMime = mimeType.split(';')[0].trim();
  return mimeMap[baseMime] || mimeMap[mimeType] || '.bin';
}

export async function markWhatsAppMessageAsRead(messageId, connection = null) {
  if (!messageId) return null;
  try {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    };
    const result = await sendWhatsAppMessage(payload, connection);

    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { type: true }
      });

      if (message) {
        if (message.type === 'audio') {
          const payloadPlayed = {
            messaging_product: 'whatsapp',
            status: 'played',
            message_id: messageId
          };
          try {
            await sendWhatsAppMessage(payloadPlayed, connection);
          } catch (playedErr) {
            console.error('Failed to send played indicator:', playedErr);
          }
          
          await prisma.message.update({
            where: { id: messageId },
            data: { status: 'played' }
          });
        } else {
          await prisma.message.update({
            where: { id: messageId },
            data: { status: 'read' }
          });
        }
      }
    } catch (dbError) {
      console.error('Error handling database message status update:', dbError);
    }

    return result;
  } catch (error) {
    await logToDb('WARN', 'API', `Erro ignorado ao marcar mensagem como lida (para evitar travamento do fluxo): ${error.message}`);
    console.error('Failed to mark message as read:', error);
    return null;
  }
}

export async function sendReaction(to, messageId, emoji, connection = null) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'reaction',
    reaction: {
      message_id: messageId,
      emoji: emoji
    }
  };
  return sendWhatsAppMessage(payload, connection);
}

export async function deleteWhatsAppMessage(messageId, connection = null) {
  let whatsappToken, whatsappPhoneId;
  if (connection) {
    whatsappToken = connection.whatsappToken;
    whatsappPhoneId = connection.whatsappPhoneId;
  } else {
    const settings = await getSystemSettings();
    whatsappToken = settings.whatsappToken;
    whatsappPhoneId = settings.whatsappPhoneId;
  }

  if (!whatsappToken || !whatsappPhoneId) {
    return null;
  }

  // If it's a simulated message, we do nothing on Meta
  if (messageId.includes('simulated') || messageId.includes('manual_')) {
    return { success: true };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${messageId}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Error deleting WhatsApp message:', error);
    return null;
  }
}

function resolveSupabaseUrl(mediaUrl) {
  if (!mediaUrl || typeof mediaUrl !== 'string') return mediaUrl;

  // 1. Ensure the mediaUrl itself is correctly URL-encoded if it contains /api/uploads/
  let sanitizedMediaUrl = mediaUrl;
  if (mediaUrl.includes('/api/uploads/')) {
    const parts = mediaUrl.split('/api/uploads/');
    const prefix = parts[0] + '/api/uploads/';
    const remaining = parts[1];
    if (remaining) {
      const [pathPart, queryPart] = remaining.split('?');
      const decodedPath = decodeURIComponent(pathPart);
      const encodedPath = encodeURIComponent(decodedPath).replace(/%2F/g, '/');
      sanitizedMediaUrl = prefix + encodedPath;
      if (queryPart) {
        sanitizedMediaUrl += '?' + queryPart;
      }
    }
  }

  // 2. Resolve to direct Supabase URL if it's not a WebP (which must go through the proxy for conversion)
  let filename = '';
  if (sanitizedMediaUrl.includes('/api/uploads/')) {
    const parts = sanitizedMediaUrl.split('/api/uploads/');
    filename = parts[1]?.split('?')[0];
  }

  if (filename) {
    // Decoded filename check for webp extension
    const decodedFilename = decodeURIComponent(filename);
    if (decodedFilename.toLowerCase().endsWith('.webp')) {
      return sanitizedMediaUrl;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const bucket = process.env.SUPABASE_BUCKET || 'media';
    if (supabaseUrl) {
      // Filename is already URL-encoded since we derived it from sanitizedMediaUrl
      const directUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
      console.log(`Resolved local media url ${mediaUrl} to direct Supabase URL: ${directUrl}`);
      return directUrl;
    }
  }

  return sanitizedMediaUrl;
}
