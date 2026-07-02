import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startFlowForContact } from '@/lib/queue';
import { logToDb } from '@/lib/log';

// POST: Trigger a chatbot flow manually for multiple contacts
export async function POST(request) {
  try {
    const { contactIds, flowId } = await request.json();

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0 || !flowId) {
      return NextResponse.json({ error: 'Faltando contactIds (array) ou flowId.' }, { status: 400 });
    }

    const flow = await prisma.flow.findUnique({
      where: { id: flowId }
    });

    if (!flow) {
      return NextResponse.json({ error: 'Fluxo não encontrado.' }, { status: 404 });
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } }
    });

    if (!contacts.length) {
      return NextResponse.json({ error: 'Nenhum contato encontrado.' }, { status: 404 });
    }

    // Process all contacts in background to avoid long blocking
    const processBulk = async () => {
      let successCount = 0;
      let errorCount = 0;
      
      for (const contact of contacts) {
        try {
          // Force contact status to AUTO so the chatbot can respond to subsequent messages
          await prisma.contact.update({
            where: { id: contact.id },
            data: { status: 'AUTO' }
          });
          
          await startFlowForContact(contact, flow, null);
          successCount++;
        } catch (err) {
          console.error(`Erro ao disparar fluxo para o contato ${contact.id}:`, err);
          errorCount++;
        }
      }
      
      await logToDb('INFO', 'FLOW', `Disparo em massa do fluxo '${flow.name}' concluído. Sucesso: ${successCount}, Erros: ${errorCount}`);
    };

    // Fire and forget so we don't hold the request for hundreds of leads
    processBulk().catch(console.error);

    return NextResponse.json({ success: true, message: 'Disparos em massa enfileirados com sucesso.' });
  } catch (error) {
    console.error('Error in bulk trigger flow route:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar disparo em lote.' }, { status: 500 });
  }
}
