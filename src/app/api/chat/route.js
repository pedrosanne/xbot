import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo } from '@/lib/whatsapp';
import { getSystemSettings } from '@/lib/settings';
import { logToDb } from '@/lib/log';
import { voiceChanger } from '@/lib/tts';

// GET: Retrieve contacts list OR message history for a contact
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const connectionId = searchParams.get('connectionId');

  try {
    if (contactId) {
      // Return message history and profile details for a specific contact
      const messages = await prisma.message.findMany({
        where: { contactId },
        orderBy: { timestamp: 'asc' }
      });
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { connection: true }
      });
      return NextResponse.json({ messages, contact });
    }

    // Filter by connectionId if provided
    const where = {};
    if (connectionId && connectionId !== 'all') {
      where.connectionId = connectionId;
    }

    // Return list of all contacts with their last message
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastInteraction: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // Format output to include last message snippet and profile details directly
    const formattedContacts = contacts.map(c => ({
      id: c.id,
      name: c.name,
      profileName: c.profileName,
      status: c.status,
      email: c.email || '',
      notes: c.notes || '',
      tags: c.tags || '',
      avatarUrl: c.avatarUrl || '',
      lastInteraction: c.lastInteraction,
      lastMessage: c.messages[0] || null
    }));

    return NextResponse.json(formattedContacts);
  } catch (error) {
    console.error('Error fetching chat data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST: Send a manual message from human agent (takeover)
export async function POST(request) {
  let contactId, type, content, mediaUrl;
  try {
    const body = await request.json();
    contactId = body.contactId;
    type = body.type;
    content = body.content;
    mediaUrl = body.mediaUrl;
    const useVoiceChanger = body.useVoiceChanger;

    if (!contactId || !type) {
      return NextResponse.json({ error: 'Missing contactId or type' }, { status: 400 });
    }

    // Fetch contact to get its connection and designated agent details
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { connection: true }
    });

    await logToDb('INFO', 'API', `Solicitação de envio de mensagem manual para o contato ${contactId}. Tipo: ${type}`, { content });

    // Convert relative mediaUrl to absolute if needed for Meta WhatsApp API
    let absoluteMediaUrl = mediaUrl;
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    if (mediaUrl && !mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
      absoluteMediaUrl = `${baseUrl}${mediaUrl}`;
      await logToDb('INFO', 'API', `Convertendo URL de mídia relativa para absoluta: ${absoluteMediaUrl}`);
    }

    // Process Voice Changer if requested and type is audio
    if (type === 'audio' && useVoiceChanger && mediaUrl) {
      try {
        const filename = mediaUrl.split('/').pop();
        const uploadRecord = await prisma.upload.findUnique({
          where: { filename }
        });

        if (uploadRecord) {
          await logToDb('INFO', 'API', `Processando áudio com ElevenLabs Voice Changer para o arquivo: ${filename}`);
          const changedBuffer = await voiceChanger(uploadRecord.data, uploadRecord.mimeType, contact?.designatedAgentId);
          if (changedBuffer) {
            const newFilename = `voice_changer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.ogg`;
            await prisma.upload.create({
              data: {
                filename: newFilename,
                mimeType: 'audio/ogg',
                data: changedBuffer
              }
            });
            
            mediaUrl = `/api/uploads/${newFilename}`;
            absoluteMediaUrl = `${baseUrl}${mediaUrl}`;
            await logToDb('INFO', 'API', `Voz modulada com sucesso. Novo arquivo: ${newFilename}`);
          } else {
            await logToDb('WARN', 'API', `Falha ao converter áudio com Voice Changer. Prosseguindo com o original.`);
          }
        }
      } catch (err) {
        console.error('Error in Voice Changer route hook:', err);
        await logToDb('ERROR', 'API', `Erro no Voice Changer: ${err.message}`);
      }
    }

    let connectionToUse = null;
    let hasCredentials = false;

    if (contact?.connection?.whatsappToken && contact?.connection?.whatsappPhoneId) {
      connectionToUse = contact.connection;
      hasCredentials = true;
    } else {
      const settings = await getSystemSettings();
      if (settings.whatsappToken && settings.whatsappPhoneId) {
        hasCredentials = true;
      }
    }

    let result = null;
    let sendError = '';

    if (!hasCredentials) {
      sendError = 'WhatsApp credentials not set';
      await logToDb('WARN', 'API', `WhatsApp não está configurado para envio real. Salvando mensagem localmente de forma simulada.`);
    } else {
      try {
        if (type === 'text') {
          result = await sendText(contactId, content, null, connectionToUse);
        } else if (type === 'audio') {
          result = await sendAudio(contactId, absoluteMediaUrl, null, connectionToUse);
        } else if (type === 'image') {
          result = await sendImage(contactId, absoluteMediaUrl, content, null, connectionToUse);
        } else if (type === 'document') {
          result = await sendDocument(contactId, absoluteMediaUrl, 'documento', content, null, connectionToUse);
        } else if (type === 'video') {
          result = await sendVideo(contactId, absoluteMediaUrl, content, null, connectionToUse);
        }
      } catch (apiError) {
        sendError = apiError.message || 'Meta WhatsApp API Error';
        await logToDb('ERROR', 'API', `Erro retornado pela API do WhatsApp ao enviar mensagem manual: ${sendError}`);
      }
    }

    // Create unique ID for the manual outgoing message
    const messageId = result?.messages?.[0]?.id || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // Save outgoing manual message to DB
    const savedMessage = await prisma.message.create({
      data: {
        id: messageId,
        contactId,
        direction: 'OUTGOING',
        senderType: 'HUMAN',
        type,
        content: content || '',
        mediaUrl: mediaUrl || '',
        sendError: sendError || ''
      }
    });

    // Auto-switch contact status to MANUAL when a human intervenes!
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        status: 'MANUAL', // Pause the bot
        lastInteraction: new Date()
      }
    });

    await logToDb('INFO', 'API', `Mensagem manual registrada com sucesso para ${contactId}. ID: ${messageId}`);
    return NextResponse.json(savedMessage);
  } catch (error) {
    await logToDb('ERROR', 'API', `Erro ao enviar mensagem manual para o contato ${contactId}: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error('Error sending manual message:', error);
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}

// PUT: Update contact details (status, name, email, notes, tags, avatarUrl)
export async function PUT(request) {
  try {
    const { contactId, status, name, email, notes, tags, avatarUrl } = await request.json();

    if (!contactId) {
      return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
    }

    const dataToUpdate = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined) dataToUpdate.email = email;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (tags !== undefined) dataToUpdate.tags = tags;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: dataToUpdate
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
