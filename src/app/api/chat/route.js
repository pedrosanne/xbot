import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo } from '@/lib/whatsapp';
import { getSystemSettings } from '@/lib/settings';
import { logToDb } from '@/lib/log';

// GET: Retrieve contacts list OR message history for a contact
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');

  try {
    if (contactId) {
      // Return message history and profile details for a specific contact
      const messages = await prisma.message.findMany({
        where: { contactId },
        orderBy: { timestamp: 'asc' }
      });
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      return NextResponse.json({ messages, contact });
    }

    // Return list of all contacts with their last message
    const contacts = await prisma.contact.findMany({
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

    if (!contactId || !type) {
      return NextResponse.json({ error: 'Missing contactId or type' }, { status: 400 });
    }

    await logToDb('INFO', 'API', `Solicitação de envio de mensagem manual para o contato ${contactId}. Tipo: ${type}`, { content });

    // Fetch system settings to see if they are configured
    const settings = await getSystemSettings();
    let result = null;
    let sendError = '';

    if (!settings.whatsappToken || !settings.whatsappPhoneId) {
      sendError = 'WhatsApp credentials not set';
      await logToDb('WARN', 'API', `WhatsApp não está configurado para envio real. Salvando mensagem localmente de forma simulada.`);
    } else {
      try {
        if (type === 'text') {
          result = await sendText(contactId, content);
        } else if (type === 'audio') {
          result = await sendAudio(contactId, mediaUrl);
        } else if (type === 'image') {
          result = await sendImage(contactId, mediaUrl, content);
        } else if (type === 'document') {
          result = await sendDocument(contactId, mediaUrl, 'documento', content);
        } else if (type === 'video') {
          result = await sendVideo(contactId, mediaUrl, content);
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
