import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendText } from '@/lib/whatsapp';
import { startFlowForContact } from '@/lib/queue';
import { logToDb } from '@/lib/log';

// Helper: Parse Spintax {Option A|Option B|Option C}
function parseSpintax(text) {
  if (!text) return '';
  let parsed = text;
  while (/{([^{}]+)}/.test(parsed)) {
    parsed = parsed.replace(/{([^{}]+)}/g, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }
  return parsed;
}

export async function POST(request) {
  try {
    const { broadcastId, contactId } = await request.json();

    if (!broadcastId || !contactId) {
      return NextResponse.json({ error: 'Broadcast ID e Contact ID são obrigatórios.' }, { status: 400 });
    }

    // 1. Fetch Broadcast and Contact
    const broadcast = await prisma.broadcast.findUnique({
      where: { id: broadcastId }
    });

    if (!broadcast) {
      return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
    }

    // If campaign was cancelled or paused, abort
    if (broadcast.status === 'CANCELLED' || broadcast.status === 'PAUSED') {
      return NextResponse.json({ success: false, message: 'Campanha pausada ou cancelada.' });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      // Record failure log
      await prisma.broadcastLog.create({
        data: {
          broadcastId,
          contactId,
          status: 'FAILED',
          error: 'Contato não encontrado no banco de dados.'
        }
      });
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { failedLeads: { increment: 1 } }
      });
      return NextResponse.json({ success: false, error: 'Contato não encontrado.' });
    }

    // 2. Select Sender using rotation
    const senderIds = broadcast.senderIds.split(',').filter(Boolean);
    if (senderIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum remetente configurado para esta campanha.' }, { status: 400 });
    }

    // Calculate rotation index based on current progress
    const totalProcessed = broadcast.sentLeads + broadcast.failedLeads;
    const senderId = senderIds[totalProcessed % senderIds.length];

    const connection = await prisma.whatsAppConnection.findUnique({
      where: { id: senderId }
    });

    if (!connection || !connection.isActive) {
      // Record failure
      const errMsg = `Conexão remetente ID ${senderId} está inativa ou foi excluída.`;
      await prisma.broadcastLog.create({
        data: {
          broadcastId,
          contactId,
          status: 'FAILED',
          error: errMsg
        }
      });
      await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { failedLeads: { increment: 1 } }
      });
      return NextResponse.json({ success: false, error: errMsg });
    }

    // 3. Prepare Message (Spintax + Variables)
    let rawMessage = parseSpintax(broadcast.message);
    
    // Replace dynamic variables
    const contactName = contact.name || contact.profileName || 'Cliente';
    let finalMessage = rawMessage
      .replace(/{{nome}}/gi, contactName)
      .replace(/{{name}}/gi, contactName)
      .replace(/{{telefone}}/gi, contact.clientPhone || contact.id)
      .replace(/{{phone}}/gi, contact.clientPhone || contact.id);

    // 4. Send Message / Trigger Flow
    let sendSuccess = false;
    let sendError = '';

    try {
      // Set contact scope to this connection so replies are routed correctly
      await prisma.contact.update({
        where: { id: contact.id },
        data: { connectionId: connection.id }
      });

      // a. Send Text Message first if it exists
      if (finalMessage.trim()) {
        await sendText(contact.id, finalMessage, null, connection);
        
        // Save message to chat history
        await prisma.message.create({
          data: {
            id: `broadcast_${broadcastId}_${Date.now()}`,
            contactId: contact.id,
            direction: 'OUTGOING',
            senderType: 'BOT',
            type: 'text',
            content: finalMessage,
            status: 'sent'
          }
        });
      }

      // b. Start Flow if configured
      if (broadcast.flowId) {
        const flow = await prisma.flow.findUnique({
          where: { id: broadcast.flowId }
        });
        if (flow) {
          // Trigger the flow steps
          await startFlowForContact(contact, flow, null);
        }
      }

      sendSuccess = true;
    } catch (err) {
      sendError = err.message || 'Erro desconhecido ao enviar via API do WhatsApp.';
    }

    // 5. Record Log and Update Counters
    if (sendSuccess) {
      await prisma.broadcastLog.create({
        data: {
          broadcastId,
          contactId,
          status: 'SENT'
        }
      });
      
      const updated = await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { sentLeads: { increment: 1 } }
      });

      // Check if completed
      if (updated.sentLeads + updated.failedLeads >= updated.totalLeads) {
        await prisma.broadcast.update({
          where: { id: broadcastId },
          data: { status: 'COMPLETED' }
        });
      }

      return NextResponse.json({ success: true });
    } else {
      await prisma.broadcastLog.create({
        data: {
          broadcastId,
          contactId,
          status: 'FAILED',
          error: sendError
        }
      });

      const updated = await prisma.broadcast.update({
        where: { id: broadcastId },
        data: { failedLeads: { increment: 1 } }
      });

      // Check if completed
      if (updated.sentLeads + updated.failedLeads >= updated.totalLeads) {
        await prisma.broadcast.update({
          where: { id: broadcastId },
          data: { status: 'COMPLETED' }
        });
      }

      return NextResponse.json({ success: false, error: sendError });
    }
  } catch (error) {
    console.error('Error sending broadcast item:', error);
    return NextResponse.json({ error: 'Failed to send broadcast item' }, { status: 500 });
  }
}
