import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo, markWhatsAppMessageAsRead } from '@/lib/whatsapp';
import { getSystemSettings } from '@/lib/settings';
import { logToDb } from '@/lib/log';
import { voiceChanger, convertToOggOpus } from '@/lib/tts';
import { verifyToken } from '@/lib/auth';

// GET: Retrieve contacts list OR message history for a contact
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const connectionId = searchParams.get('connectionId');

  try {
    // Authenticate the requesting user to resolve scoped connections
    let loggedUserId = null;
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get('session');
      const token = cookie ? cookie.value : null;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          loggedUserId = payload.userId;
        }
      }
    } catch (e) {}

    let userConnections = [];
    if (loggedUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: loggedUserId },
        include: { connections: { select: { id: true } } }
      });
      userConnections = dbUser?.connections?.map(c => c.id) || [];
    }

    if (contactId) {
      // Return profile details first to get the connection details
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { 
          connection: true,
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!contact) {
        return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
      }

      // Check if collaborator is assigned to this contact's connection
      if (userConnections.length > 0 && contact.connectionId && !userConnections.includes(contact.connectionId)) {
        return NextResponse.json({ error: 'Acesso negado para este lead.' }, { status: 403 });
      }

      // Find unread incoming messages and mark them as read
      const unreadIncoming = await prisma.message.findMany({
        where: {
          contactId,
          direction: 'INCOMING',
          status: { notIn: ['read', 'played'] }
        }
      });

      if (unreadIncoming.length > 0) {
        // Update non-audio messages to 'read'
        const nonAudioIds = unreadIncoming.filter(m => m.type !== 'audio').map(m => m.id);
        if (nonAudioIds.length > 0) {
          await prisma.message.updateMany({
            where: { id: { in: nonAudioIds } },
            data: { status: 'read' }
          });
        }

        // Update audio messages to 'played'
        const audioIds = unreadIncoming.filter(m => m.type === 'audio').map(m => m.id);
        if (audioIds.length > 0) {
          await prisma.message.updateMany({
            where: { id: { in: audioIds } },
            data: { status: 'played' }
          });
        }

        // Trigger read receipts asynchronously to avoid blocking the client request
        for (const msg of unreadIncoming) {
          markWhatsAppMessageAsRead(msg.id, contact?.connection).catch(err => {
            console.error(`Failed to send read receipt to Meta for message ${msg.id}:`, err);
          });
        }
      }

      // Return message history and profile details for a specific contact
      const messages = await prisma.message.findMany({
        where: { contactId },
        orderBy: { timestamp: 'asc' }
      });
      return NextResponse.json({ messages, contact });
    }

    // Filter by connectionId if provided
    const where = {};
    if (userConnections.length > 0) {
      if (connectionId && connectionId !== 'all') {
        if (userConnections.includes(connectionId)) {
          where.connectionId = connectionId;
        } else {
          where.connectionId = 'unauthorized_connection_id';
        }
      } else {
        where.connectionId = { in: userConnections };
      }
    } else {
      if (connectionId && connectionId !== 'all') {
        where.connectionId = connectionId;
      }
    }

    // Return list of all contacts with their last message and assigned user
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastInteraction: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
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
      lastMessage: c.messages[0] || null,
      assignedUserId: c.assignedUserId || null,
      assignedUser: c.assignedUser || null
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
    const replyToId = body.replyToId;
    const replyToContent = body.replyToContent;

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

    // Ensure all audio files sent to the client are OGG Opus formatted for native voice note playback
    if (type === 'audio' && mediaUrl && !mediaUrl.toLowerCase().split('?')[0].endsWith('.ogg')) {
      try {
        const filename = mediaUrl.split('/').pop();
        const uploadRecord = await prisma.upload.findUnique({
          where: { filename }
        });

        if (uploadRecord) {
          await logToDb('INFO', 'API', `Convertendo áudio original para OGG Opus para envio nativo: ${filename}`);
          const oggBuffer = await convertToOggOpus(uploadRecord.data);
          
          if (oggBuffer) {
            const newFilename = `converted_voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.ogg`;
            await prisma.upload.create({
              data: {
                filename: newFilename,
                mimeType: 'audio/ogg',
                data: oggBuffer
              }
            });
            
            mediaUrl = `/api/uploads/${newFilename}`;
            absoluteMediaUrl = `${baseUrl}${mediaUrl}`;
            await logToDb('INFO', 'API', `Áudio convertido com sucesso para OGG Opus para envio nativo: ${newFilename}`);
          }
        }
      } catch (err) {
        console.error('Error converting audio to OGG Opus:', err);
        await logToDb('WARN', 'API', `Falha ao converter áudio para OGG Opus: ${err.message}. Enviando original.`);
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
          result = await sendText(contactId, content, replyToId || null, connectionToUse);
        } else if (type === 'audio') {
          result = await sendAudio(contactId, absoluteMediaUrl, replyToId || null, connectionToUse);
        } else if (type === 'image') {
          result = await sendImage(contactId, absoluteMediaUrl, content, replyToId || null, connectionToUse);
        } else if (type === 'document') {
          result = await sendDocument(contactId, absoluteMediaUrl, 'documento', content, replyToId || null, connectionToUse);
        } else if (type === 'video') {
          result = await sendVideo(contactId, absoluteMediaUrl, content, replyToId || null, connectionToUse);
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
        sendError: sendError || '',
        status: sendError ? 'failed' : 'sent',
        replyToId: replyToId || '',
        replyToContent: replyToContent || ''
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

// PUT: Update contact details (status, name, email, notes, tags, avatarUrl, typingState, isPinned, isBlocked, reminderDate)
export async function PUT(request) {
  try {
    const { 
      contactId, 
      status, 
      name, 
      email, 
      notes, 
      tags, 
      avatarUrl, 
      typingState, 
      assignedUserId,
      isPinned,
      isBlocked,
      reminderDate
    } = await request.json();

    if (!contactId) {
      return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
    }

    const existing = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined) dataToUpdate.email = email;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;
    if (typingState !== undefined) dataToUpdate.typingState = typingState;
    if (assignedUserId !== undefined) dataToUpdate.assignedUserId = assignedUserId;
    if (isPinned !== undefined) dataToUpdate.isPinned = isPinned;
    if (isBlocked !== undefined) dataToUpdate.isBlocked = isBlocked;
    if (reminderDate !== undefined) dataToUpdate.reminderDate = reminderDate ? new Date(reminderDate) : null;

    if (status !== undefined) {
      dataToUpdate.status = status;
      
      const currentTagsStr = tags !== undefined ? tags : (existing?.tags || '');
      let currentTags = currentTagsStr ? currentTagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      // Update or add the status tag
      const statusTag = `Status: ${status === 'MANUAL' ? 'Manual' : 'Robô'}`;
      currentTags = currentTags.filter(t => !t.startsWith('Status:'));
      currentTags.push(statusTag);
      
      dataToUpdate.tags = currentTags.join(', ');
    } else if (tags !== undefined) {
      dataToUpdate.tags = tags;
    }

    if (!existing) {
      if (typingState !== undefined || status !== undefined || name !== undefined) {
        const isMultiNumber = contactId.includes(':');
        const [phoneId, clientPhone] = isMultiNumber ? contactId.split(':') : ['', contactId];
        
        const newContact = await prisma.contact.create({
          data: {
            id: contactId,
            name: name || 'Cliente WhatsApp',
            status: status || 'AUTO',
            phoneNumberId: phoneId || '',
            clientPhone: clientPhone || contactId,
            typingState: typingState || 'IDLE',
            isPinned: isPinned || false,
            isBlocked: isBlocked || false,
            reminderDate: reminderDate ? new Date(reminderDate) : null
          }
        });
        return NextResponse.json(newContact);
      }
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: dataToUpdate,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE: Delete contact or clear conversation
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const action = searchParams.get('action'); // "clear" or "delete"

    if (!contactId) {
      return NextResponse.json({ error: 'Missing contactId' }, { status: 400 });
    }

    if (action === 'clear') {
      // Clear conversation (delete all messages for this contact)
      await prisma.message.deleteMany({
        where: { contactId }
      });
      return NextResponse.json({ success: true, message: 'Conversa limpa com sucesso.' });
    } else {
      // Exclude contact (cascade delete messages, payments, calls)
      await prisma.message.deleteMany({ where: { contactId } });
      await prisma.payment.deleteMany({ where: { contactId } });
      await prisma.call.deleteMany({ where: { contactId } });
      await prisma.contact.delete({
        where: { id: contactId }
      });
      return NextResponse.json({ success: true, message: 'Contato excluído com sucesso.' });
    }
  } catch (error) {
    console.error('Error in DELETE contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete contact/conversation' }, { status: 500 });
  }
}
