import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo, sendReaction, deleteWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request) {
  try {
    const { targetContactIds, messageId } = await request.json();
    if (!targetContactIds || !Array.isArray(targetContactIds) || !messageId) {
      return NextResponse.json({ error: 'Missing targetContactIds or messageId' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    const sentMessages = [];

    for (const contactId of targetContactIds) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { connection: true }
      });

      if (!contact) continue;

      let absoluteMediaUrl = message.mediaUrl;
      if (absoluteMediaUrl && !absoluteMediaUrl.startsWith('http://') && !absoluteMediaUrl.startsWith('https://')) {
        absoluteMediaUrl = `${baseUrl}${absoluteMediaUrl}`;
      }

      let connectionToUse = null;
      let hasCredentials = false;

      if (contact.connection?.whatsappToken && contact.connection?.whatsappPhoneId) {
        connectionToUse = contact.connection;
        hasCredentials = true;
      }

      let result = null;
      let sendError = '';

      if (hasCredentials) {
        try {
          if (message.type === 'text') {
            result = await sendText(contactId, message.content, null, connectionToUse);
          } else if (message.type === 'audio') {
            result = await sendAudio(contactId, absoluteMediaUrl, null, connectionToUse);
          } else if (message.type === 'image') {
            result = await sendImage(contactId, absoluteMediaUrl, message.content, null, connectionToUse);
          } else if (message.type === 'document') {
            result = await sendDocument(contactId, absoluteMediaUrl, 'documento', message.content, null, connectionToUse);
          } else if (message.type === 'video') {
            result = await sendVideo(contactId, absoluteMediaUrl, message.content, null, connectionToUse);
          }
        } catch (apiError) {
          sendError = apiError.message || 'Meta WhatsApp API Error';
        }
      } else {
        sendError = 'WhatsApp credentials not set';
      }

      const forwardMessageId = result?.messages?.[0]?.id || `forward_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const savedMessage = await prisma.message.create({
        data: {
          id: forwardMessageId,
          contactId,
          direction: 'OUTGOING',
          senderType: 'HUMAN',
          type: message.type,
          content: message.content || '',
          mediaUrl: message.mediaUrl || '',
          sendError: sendError || '',
          status: sendError ? 'failed' : 'sent'
        }
      });

      // Auto-switch contact status to MANUAL when a human forwards a message
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          status: 'MANUAL',
          lastInteraction: new Date()
        }
      });

      sentMessages.push(savedMessage);
    }

    return NextResponse.json({ success: true, messages: sentMessages });
  } catch (error) {
    console.error('Error forwarding message:', error);
    return NextResponse.json({ error: error.message || 'Failed to forward message' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { action, messageId, newContent, emoji, senderType } = await request.json();

    if (!messageId || !action) {
      return NextResponse.json({ error: 'Missing messageId or action' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: { include: { connection: true } } }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (action === 'edit') {
      if (message.direction !== 'OUTGOING' || message.senderType !== 'HUMAN') {
        return NextResponse.json({ error: 'Only outgoing human messages can be edited' }, { status: 400 });
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: newContent || '',
          isEdited: true
        }
      });
      return NextResponse.json(updated);
    }

    if (action === 'react') {
      let currentReactions = [];
      try {
        currentReactions = JSON.parse(message.reactions || '[]');
      } catch (e) {
        currentReactions = [];
      }

      // Filter out this sender's existing reaction
      currentReactions = currentReactions.filter(r => r.senderType !== senderType);

      // Add new reaction if emoji is provided
      if (emoji) {
        currentReactions.push({ emoji, senderType });
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          reactions: JSON.stringify(currentReactions)
        }
      });

      // Send to WhatsApp if real connection is available
      if (message.contact?.connection?.whatsappToken && message.contact?.connection?.whatsappPhoneId) {
        try {
          await sendReaction(message.contactId, messageId, emoji || '', message.contact.connection);
        } catch (err) {
          console.error('Error sending reaction to WhatsApp API:', err);
        }
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: error.message || 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const deleteType = searchParams.get('deleteType') || 'me'; // 'me' or 'everyone'

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { contact: { include: { connection: true } } }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Perform database status update
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedFor: deleteType
      }
    });

    // Try deleting via Meta WhatsApp API if deleting for everyone and outgoing
    if (deleteType === 'everyone' && message.direction === 'OUTGOING') {
      if (message.contact?.connection?.whatsappToken && message.contact?.connection?.whatsappPhoneId) {
        try {
          await deleteWhatsAppMessage(messageId, message.contact.connection);
        } catch (err) {
          console.error('Error deleting message from WhatsApp API:', err);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete message' }, { status: 500 });
  }
}
