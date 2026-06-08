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
      // Return message history for a specific contact
      const messages = await prisma.message.findMany({
        where: { contactId },
        orderBy: { timestamp: 'asc' }
      });
      return NextResponse.json(messages);
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

    // Format output to include last message snippet directly
    const formattedContacts = contacts.map(c => ({
      id: c.id,
      name: c.name,
      profileName: c.profileName,
      status: c.status,
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
  try {
    const { contactId, type, content, mediaUrl } = await request.json();

    if (!contactId || !type) {
      return NextResponse.json({ error: 'Missing contactId or type' }, { status: 400 });
    }

    await logToDb('INFO', 'API', `Solicitação de envio de mensagem manual para o contato ${contactId}. Tipo: ${type}`, { content });

    // Fetch system settings to see if they are configured
    const settings = await getSystemSettings();
    if (!settings.whatsappToken || !settings.whatsappPhoneId) {
      console.warn('WhatsApp credentials not set. Saving message locally for simulation.');
      await logToDb('WARN', 'API', `WhatsApp não está configurado para envio real. Salvando mensagem localmente de forma simulada.`);
    }

    let result = null;

    // Send via official WhatsApp API if configured
    if (settings.whatsappToken && settings.whatsappPhoneId) {
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
        mediaUrl: mediaUrl || ''
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

    await logToDb('INFO', 'API', `Mensagem manual registrada e enviada com sucesso para ${contactId}. ID: ${messageId}`);
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

// PUT: Toggle Bot Mode (AUTO) vs Manual Mode (MANUAL)
export async function PUT(request) {
  try {
    const { contactId, status } = await request.json();

    if (!contactId || !status) {
      return NextResponse.json({ error: 'Missing contactId or status' }, { status: 400 });
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: { status }
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error('Error updating bot status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
