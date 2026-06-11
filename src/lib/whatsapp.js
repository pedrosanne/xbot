import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';
import { logToDb } from './log';
import { prisma } from './prisma';

const WHATSAPP_API_VERSION = 'v20.0';

export async function sendWhatsAppMessage(payload) {
  const settings = await getSystemSettings();
  const { whatsappToken, whatsappPhoneId } = settings;

  if (!whatsappToken || !whatsappPhoneId) {
    await logToDb('ERROR', 'API', 'Falha no envio de mensagem: Credenciais do WhatsApp não configuradas (Token ou Phone ID em branco).');
    console.error('WhatsApp API not configured. Missing Token or Phone ID.');
    return null;
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneId}/messages`;

  try {
    await logToDb('INFO', 'API', `Enviando mensagem WhatsApp para o número ${payload.to}`, { type: payload.type });

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
    
    await logToDb('INFO', 'API', `Mensagem WhatsApp enviada com sucesso para ${payload.to}. ID: ${data.messages?.[0]?.id || 'N/A'}`);
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

export async function sendText(to, text) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  };
  return sendWhatsAppMessage(payload);
}

export async function sendAudio(to, audioUrl) {
  const isOgg = audioUrl && audioUrl.split('?')[0].toLowerCase().endsWith('.ogg');
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'audio',
    audio: { 
      link: audioUrl,
      ...(isOgg && { voice: true })
    },
  };
  return sendWhatsAppMessage(payload);
}

export async function sendImage(to, imageUrl, caption = '') {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload);
}

export async function sendDocument(to, docUrl, filename = 'document', caption = '') {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: {
      link: docUrl,
      filename,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload);
}

export async function sendVideo(to, videoUrl, caption = '') {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'video',
    video: {
      link: videoUrl,
      ...(caption && { caption }),
    },
  };
  return sendWhatsAppMessage(payload);
}

export async function sendButtons(to, bodyText, buttons) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
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
  return sendWhatsAppMessage(payload);
}

export async function sendCTAUrlButton(to, bodyText, buttonTitle, url) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
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
  return sendWhatsAppMessage(payload);
}


// Downloads media from Meta Servers to database storage
export async function downloadWhatsAppMedia(mediaId, mimeType) {
  const settings = await getSystemSettings();
  const { whatsappToken } = settings;

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
    
    // Save to database
    await prisma.upload.upsert({
      where: { filename },
      update: {
        mimeType,
        data: buffer
      },
      create: {
        filename,
        mimeType,
        data: buffer
      }
    });

    console.log(`Saved WhatsApp media to database: ${filename}`);

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
