import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';

const WHATSAPP_API_VERSION = 'v20.0';

export async function sendWhatsAppMessage(payload) {
  const settings = await getSystemSettings();
  const { whatsappToken, whatsappPhoneId } = settings;

  if (!whatsappToken || !whatsappPhoneId) {
    console.error('WhatsApp API not configured. Missing Token or Phone ID.');
    return null;
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneId}/messages`;

  try {
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
      console.error('WhatsApp API Error Response:', JSON.stringify(data));
      throw new Error(data.error?.message || 'Error sending message via WhatsApp API');
    }
    return data;
  } catch (error) {
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
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'audio',
    audio: { link: audioUrl },
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

// Downloads media from Meta Servers to local storage
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

    // 3. Define local filename & path
    const extension = getExtensionFromMimeType(mimeType);
    const filename = `${mediaId}${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    console.log(`Saved media file locally at: ${filePath}`);

    // Return the web-accessible URL path in Next.js
    return `/uploads/${filename}`;
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
