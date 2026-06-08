import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/settings';
import { downloadWhatsAppMedia } from '@/lib/whatsapp';
import { enqueueMessage } from '@/lib/queue';
import { logToDb } from '@/lib/log';

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
      await logToDb('INFO', 'WEBHOOK', 'Webhook verificado com sucesso pelo Meta Developer Console.');
      console.log('Webhook WhatsApp verificado com sucesso!');
      return new Response(challenge, { status: 200 });
    }
    await logToDb('WARN', 'WEBHOOK', 'Falha na verificação do Webhook: Token inválido.', {
      tokenRecebido: token,
      tokenEsperado: verifyToken
    });
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

    // Log incoming payload details
    await logToDb('INFO', 'WEBHOOK', 'Payload bruto recebido do WhatsApp.', body);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Acknowledge status updates
    if (value?.statuses) {
      await logToDb('INFO', 'WEBHOOK', 'Webhook de status de entrega/leitura recebido.', value.statuses);
      return NextResponse.json({ status: 'success' });
    }

    const message = value?.messages?.[0];
    if (!message) {
      return NextResponse.json({ status: 'success' });
    }

    const messageId = message.id;

    // 1. Duplicate check
    const alreadyProcessed = await prisma.processedWebhook.findUnique({
      where: { id: messageId }
    });

    if (alreadyProcessed) {
      await logToDb('WARN', 'WEBHOOK', `Mensagem duplicada ignorada. ID: ${messageId}`);
      return NextResponse.json({ status: 'success', duplicate: true });
    }

    // Save to processed
    await prisma.processedWebhook.create({
      data: { id: messageId }
    });

    // 2. Extract details
    const contactId = message.from;
    const profileName = value?.contacts?.[0]?.profile?.name || '';
    
    // 3. Process media
    const type = message.type;
    let content = '';
    let mediaUrl = '';
    let buttonId = '';

    if (type === 'text') {
      content = message.text?.body || '';
    } else if (type === 'interactive') {
      const buttonReply = message.interactive?.button_reply;
      content = buttonReply?.title || '';
      buttonId = buttonReply?.id || '';
      await logToDb('INFO', 'WEBHOOK', `Botão interativo clicado. ID: ${buttonId}, Título: ${content}`);
    } else if (type === 'audio') {
      const mediaId = message.audio?.id;
      const mimeType = message.audio?.mime_type || 'audio/ogg';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de áudio. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = '[Mensagem de voz]';
    } else if (type === 'image') {
      const mediaId = message.image?.id;
      const mimeType = message.image?.mime_type || 'image/jpeg';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de imagem. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.image?.caption || '[Imagem]';
    } else if (type === 'video') {
      const mediaId = message.video?.id;
      const mimeType = message.video?.mime_type || 'video/mp4';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de vídeo. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.video?.caption || '[Vídeo]';
    } else if (type === 'document') {
      const mediaId = message.document?.id;
      const mimeType = message.document?.mime_type || 'application/pdf';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de documento. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType);
      content = message.document?.caption || message.document?.filename || '[Documento]';
    } else {
      content = `[Mídia não suportada: ${type}]`;
      await logToDb('WARN', 'WEBHOOK', `Tipo de mídia não suportado recebido: ${type}`);
    }

    const messageData = {
      id: messageId,
      content,
      type,
      mediaUrl,
      timestamp: parseInt(message.timestamp) * 1000,
      profileName,
      name: profileName || contactId,
      ...(buttonId && { buttonId })
    };

    await logToDb('INFO', 'WEBHOOK', `Enfileirando mensagem para o contato ${contactId}`, messageData);

    // Enqueue
    enqueueMessage(contactId, messageData).catch((err) => {
      logToDb('ERROR', 'WEBHOOK', `Erro ao enfileirar mensagem para o contato ${contactId}`, {
        error: err.message,
        stack: err.stack
      });
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    logToDb('ERROR', 'WEBHOOK', 'Erro interno ao processar webhook.', {
      error: error.message,
      stack: error.stack
    });
    console.error('Error in Webhook POST handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
