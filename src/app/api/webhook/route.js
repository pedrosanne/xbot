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
  const systemVerifyToken = settings.whatsappVerifyToken || 'antigravity_token_123';

  // Retrieve verify tokens from system settings and all active connections
  const verifyTokens = [systemVerifyToken];
  try {
    const activeConnections = await prisma.whatsAppConnection.findMany({
      where: { isActive: true },
      select: { whatsappVerifyToken: true }
    });
    activeConnections.forEach(c => {
      if (c.whatsappVerifyToken) verifyTokens.push(c.whatsappVerifyToken);
    });
  } catch (err) {
    console.error('Error fetching verify tokens from connections:', err);
  }

  const isValidToken = verifyTokens.includes(token);

  if (mode && token) {
    if (mode === 'subscribe' && isValidToken) {
      await logToDb('INFO', 'WEBHOOK', 'Webhook verificado com sucesso pelo Meta Developer Console.');
      console.log('Webhook WhatsApp verificado com sucesso!');
      return new Response(challenge, { status: 200 });
    }
    await logToDb('WARN', 'WEBHOOK', 'Falha na verificação do Webhook: Token inválido.', {
      tokenRecebido: token,
      tokensValidos: verifyTokens
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
      
      // Update delivery/error status in database
      for (const status of value.statuses) {
        let updateData = { status: status.status };
        
        if (status.status === 'failed') {
          const errorCode = status.errors?.[0]?.code || 'N/A';
          const errorMsg = status.errors?.[0]?.error_data?.details || status.errors?.[0]?.message || 'Erro desconhecido';
          const fullError = `(#${errorCode}) ${errorMsg}`;
          updateData.sendError = fullError;
          
          await logToDb('WARN', 'WEBHOOK', `Mensagem ${status.id} falhou ao ser entregue: ${fullError}`);
        }
        
        await prisma.message.updateMany({
          where: { id: status.id },
          data: updateData
        });
      }
      
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
    const systemSettings = await getSystemSettings();
    const receiverPhoneId = value?.metadata?.phone_number_id || systemSettings.whatsappPhoneId || 'system';
    const contactId = `${receiverPhoneId}:${message.from}`;
    const profileName = value?.contacts?.[0]?.profile?.name || '';

    // Find connection to use its token for downloading media
    let connection = null;
    if (receiverPhoneId && receiverPhoneId !== 'system') {
      try {
        connection = await prisma.whatsAppConnection.findUnique({
          where: { whatsappPhoneId: receiverPhoneId }
        });
      } catch (err) {
        console.error('Error finding connection in webhook POST:', err);
      }
    }
    const tokenToUse = connection?.whatsappToken || systemSettings.whatsappToken;
    
    // 3. Process media
    const type = message.type;
    
    // Handle incoming reactions
    if (type === 'reaction') {
      const reactionData = message.reaction;
      if (reactionData) {
        const targetMessageId = reactionData.message_id;
        const emoji = reactionData.emoji;
        
        try {
          const targetMessage = await prisma.message.findUnique({
            where: { id: targetMessageId }
          });
          
          if (targetMessage) {
            let currentReactions = [];
            try {
              currentReactions = JSON.parse(targetMessage.reactions || '[]');
            } catch (e) {
              currentReactions = [];
            }
            
            // Remove any existing reaction by the client, and add the new one (if emoji is not empty)
            currentReactions = currentReactions.filter(r => r.senderType !== 'CLIENT');
            if (emoji) {
              currentReactions.push({ emoji, senderType: 'CLIENT' });
            }
            
            await prisma.message.update({
              where: { id: targetMessageId },
              data: { reactions: JSON.stringify(currentReactions) }
            });
            await logToDb('INFO', 'WEBHOOK', `Reação '${emoji}' processada para a mensagem ${targetMessageId}`);
          }
        } catch (err) {
          console.error('Error processing incoming reaction:', err);
        }
      }
      return NextResponse.json({ status: 'success' });
    }

    let replyToId = '';
    let replyToContent = '';
    if (message.context?.id) {
      replyToId = message.context.id;
      try {
        const parentMsg = await prisma.message.findUnique({
          where: { id: replyToId },
          select: { content: true }
        });
        if (parentMsg) {
          replyToContent = parentMsg.content;
        }
      } catch (err) {
        console.error('Error fetching parent message for context:', err);
      }
    }

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
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType, tokenToUse);
      content = '[Mensagem de voz]';
    } else if (type === 'image') {
      const mediaId = message.image?.id;
      const mimeType = message.image?.mime_type || 'image/jpeg';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de imagem. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType, tokenToUse);
      content = message.image?.caption || '[Imagem]';
    } else if (type === 'video') {
      const mediaId = message.video?.id;
      const mimeType = message.video?.mime_type || 'video/mp4';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de vídeo. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType, tokenToUse);
      content = message.video?.caption || '[Vídeo]';
    } else if (type === 'document') {
      const mediaId = message.document?.id;
      const mimeType = message.document?.mime_type || 'application/pdf';
      await logToDb('INFO', 'WEBHOOK', `Baixando arquivo de documento. ID: ${mediaId}`);
      mediaUrl = await downloadWhatsAppMedia(mediaId, mimeType, tokenToUse);
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
      replyToId,
      replyToContent,
      ...(buttonId && { buttonId })
    };

    await logToDb('INFO', 'WEBHOOK', `Enfileirando mensagem para o contato ${contactId}`, messageData);

    // Processa de forma síncrona aguardando a finalização antes de responder à chamada de API
    await enqueueMessage(contactId, messageData);

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
