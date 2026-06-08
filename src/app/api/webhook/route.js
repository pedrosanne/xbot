import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/settings';
import { downloadWhatsAppMedia } from '@/lib/whatsapp';
import { enqueueMessage } from '@/lib/queue';

// GET: Webhook Verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = await getSystemSettings();
  const verifyToken = settings.whatsappVerifyToken || 'antigravity_token_123';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook WhatsApp verificado com sucesso!');
      return new Response(challenge, { status: 200 });
    }
    console.warn('Falha na verificação do Webhook: Token inválido.');
    return new Response('Forbidden', { status: 403 });
  }

  return new Response('Bad Request', { status: 400 });
}

// POST: Receive Incoming WhatsApp Webhooks
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Optional: Log webhook payload for inspection
    // console.log('Webhook Payload:', JSON.stringify(body, null, 2));

    // Check if it's a WhatsApp status update or actual message
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Acknowledge immediately if it's a status update (read, delivered, sent)
    if (value?.statuses) {
      return NextResponse.json({ status: 'success' });
    }

    const message = value?.messages?.[0];
    if (!message) {
      // Not a message event, acknowledge anyway
      return NextResponse.json({ status: 'success' });
    }

    const messageId = message.id;

    // 1. Prevent duplicate processing (WhatsApp webhook retry check)
    const alreadyProcessed = await prisma.processedWebhook.findUnique({
      where: { id: messageId }
    });

    if (alreadyProcessed) {
      console.log(`Message ${messageId} already processed. Acknowledging with 200 OK.`);
      return NextResponse.json({ status: 'success', duplicate: true });
    }

    // Save to processed cache immediately
    await prisma.processedWebhook.create({
      data: { id: messageId }
    });

    // 2. Extract sender details
    const contactId = message.from; // Sender's phone number
    const profileName = value?.contacts?.[0]?.profile?.name || '';
    
    // 3. Process media if present
    const type = message.type;
    let content = '';
    let mediaUrl = '';

    if (type === 'text') {
      content = message.text?.body || '';
    } else if (type === 'audio') {
      const mediaId = message.audio?.id;
      const mimeType = message.audio?.mime_type || 'audio/ogg';
      console.log(`Downloading incoming audio: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = '[Mensagem de voz]';
    } else if (type === 'image') {
      const mediaId = message.image?.id;
      const mimeType = message.image?.mime_type || 'image/jpeg';
      console.log(`Downloading incoming image: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.image?.caption || '[Imagem]';
    } else if (type === 'video') {
      const mediaId = message.video?.id;
      const mimeType = message.video?.mime_type || 'video/mp4';
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.video?.caption || '[Vídeo]';
    } else if (type === 'document') {
      const mediaId = message.document?.id;
      const mimeType = message.document?.mime_type || 'application/pdf';
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.document?.caption || message.document?.filename || '[Documento]';
    } else {
      content = `[Mídia não suportada: ${type}]`;
    }

    // 4. Enqueue the message for asynchronous debounced reply
    const messageData = {
      id: messageId,
      content,
      type,
      mediaUrl,
      timestamp: parseInt(message.timestamp) * 1000, // WhatsApp timestamp is in seconds
      profileName,
      name: profileName || contactId
    };

    // Run enqueue asynchronously to avoid blocking the webhook response
    enqueueMessage(contactId, messageData).catch((err) => {
      console.error('Error enqueuing message:', err);
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error in Webhook POST handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
