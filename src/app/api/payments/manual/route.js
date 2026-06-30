import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';
import { sendText } from '@/lib/whatsapp';
import { sendPushNotification } from '@/lib/push';
import { sendMetaCapiPurchase } from '@/lib/capi';
import { startFlowForContact, tagContactForPayment } from '@/lib/queue';

export async function POST(request) {
  try {
    const { contactId, productId, amount, silent } = await request.json();

    if (!contactId || !amount) {
      return NextResponse.json({ error: 'Contato e valor são obrigatórios.' }, { status: 400 });
    }

    // 1. Fetch Contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { connection: true }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    // 2. Fetch Product (optional)
    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({
        where: { id: productId }
      });
    }

    // 3. Find an active payment gateway to link
    let gateway = await prisma.paymentGateway.findFirst({
      where: { isActive: true }
    });

    if (!gateway) {
      // Create a default manual gateway if none exists
      gateway = await prisma.paymentGateway.findFirst();
      if (!gateway) {
        // If still none, create a temporary one
        gateway = await prisma.paymentGateway.create({
          data: {
            name: 'Manual / Pix Direto',
            type: 'custom',
            isActive: true
          }
        });
      }
    }

    // 4. Create Payment Record (Mark as PAID)
    const payment = await prisma.payment.create({
      data: {
        gatewayId: gateway.id,
        contactId: contact.id,
        externalId: `manual_${Date.now()}`,
        amount: parseFloat(amount),
        status: 'PAID',
        paymentMethod: 'pix_manual',
        description: `Pix Direto CNPJ - ${product ? product.name : 'Venda Manual'}`,
        productId: productId || null
      }
    });

    await logToDb('INFO', 'API', `Venda manual/Pix direto de R$ ${amount} registrada para o contato ${contact.id}. Silencioso: ${!!silent}`);

    // =========================================================================
    // AUTOMATIONS (Same as Webhook)
    // =========================================================================
    
    // a. Set Contact status to AUTO
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: 'AUTO' }
    });

    // b. Append "pago" tag
    let newTags = contact.tags || '';
    const tagsList = newTags.split(',').map(t => t.trim()).filter(Boolean);
    if (!tagsList.includes('pago')) {
      tagsList.push('pago');
      newTags = tagsList.join(', ');
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tags: newTags }
      });
    }

    // c. Send confirmation WhatsApp message (only if NOT silent)
    const connectionToUse = contact.connection;
    if (!silent && connectionToUse) {
      try {
        const messageText = `Confirmamos seu pagamento de R$ ${parseFloat(amount).toFixed(2).replace('.', ',')} com sucesso! Obrigado! 🎉`;
        await sendText(contact.id, messageText, null, connectionToUse);
        
        await prisma.message.create({
          data: {
            id: `bot_${Date.now()}_payment_confirm_manual`,
            contactId: contact.id,
            direction: 'OUTGOING',
            senderType: 'BOT',
            type: 'text',
            content: messageText,
            status: 'sent'
          }
        });
      } catch (waError) {
        console.error('Error sending WhatsApp manual payment confirmation:', waError);
      }
    }

    // d. Dispatch push notifications to collaborators
    try {
      const contactName = contact.name || contact.profileName || contact.id;
      const title = `Venda Manual Confirmada! 💰`;
      const body = `O lead ${contactName} realizou um Pix Direto CNPJ de R$ ${parseFloat(amount).toFixed(2).replace('.', ',')}.`;
      const url = `/chat?contactId=${contact.id}`;
      const targetUserIds = contact.assignedUserId ? [contact.assignedUserId] : null;
      
      await sendPushNotification(title, body, url, targetUserIds);
    } catch (pushError) {
      console.error('Error sending manual payment push notification:', pushError);
    }

    // e. Send Meta Conversions API Event
    try {
      await sendMetaCapiPurchase({ contact, payment });
    } catch (capiError) {
      console.error('Error sending Meta CAPI for manual payment:', capiError);
    }

    // e.2. Tag contact as Aprovado and add product tag
    try {
      await tagContactForPayment(contact.id, productId);
    } catch (tagError) {
      console.error('Error auto-tagging contact on manual payment:', tagError);
    }

    // f. Trigger post-payment flows (Upsell / Chatbot Flow) (only if NOT silent)
    if (!silent) {
      try {
        let triggeredFlow = null;

        // 1. Check if the product has a specific post-sale flow set
        if (product && product.postSaleFlowId) {
          const flow = await prisma.flow.findUnique({
            where: { id: product.postSaleFlowId }
          });
          if (flow && flow.isActive) {
            triggeredFlow = flow;
            await logToDb('INFO', 'FLOW', `Disparando fluxo pós-venda direto do produto '${flow.name}' para o contato ${contact.id}`);
          }
        }

        // 2. Fallback: Find flows matching trigger 'payment_confirmed'
        if (!triggeredFlow) {
          const postPaymentFlows = await prisma.flow.findMany({
            where: {
              isActive: true,
              trigger: 'payment_confirmed',
              OR: [
                { productId: productId || undefined },
                { productId: null }
              ]
            }
          });

          if (postPaymentFlows.length > 0) {
            triggeredFlow = postPaymentFlows.find(f => f.productId === productId) || postPaymentFlows[0];
            await logToDb('INFO', 'FLOW', `Disparando fluxo pós-pagamento '${triggeredFlow.name}' (Upsell) para o contato ${contact.id} após venda manual`);
          }
        }

        if (triggeredFlow) {
          await startFlowForContact(contact, triggeredFlow, null);
        }
      } catch (upsellError) {
        console.error('Error triggering post-payment flow for manual sale:', upsellError);
      }
    }

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (error) {
    console.error('Error registering manual payment:', error);
    return NextResponse.json({ error: 'Failed to register manual payment' }, { status: 500 });
  }
}
