import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startFlowForContact } from '@/lib/queue';
import { logToDb } from '@/lib/log';

// POST: Trigger a chatbot flow manually for a contact
export async function POST(request) {
  try {
    const { contactId, flowId } = await request.json();

    if (!contactId || !flowId) {
      return NextResponse.json({ error: 'Faltando contactId ou flowId.' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    const flow = await prisma.flow.findUnique({
      where: { id: flowId }
    });

    if (!flow) {
      return NextResponse.json({ error: 'Fluxo não encontrado.' }, { status: 404 });
    }

    // Force contact status to AUTO so the chatbot can respond to subsequent messages
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'AUTO' }
    });

    await logToDb('INFO', 'FLOW', `Disparando fluxo manual '${flow.name}' para o contato ${contactId}`);
    
    // Trigger the flow execution (sends the first step)
    await startFlowForContact(contact, flow, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in trigger flow route:', error);
    return NextResponse.json({ error: error.message || 'Falha ao disparar o fluxo.' }, { status: 500 });
  }
}
