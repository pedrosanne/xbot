import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { logToDb } from '@/lib/log';
import { sendText } from '@/lib/whatsapp';
import { sendPushNotification } from '@/lib/push';

function normalizePhone(phone) {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;
  return clean;
}

export async function POST(request, { params }) {
  const { gatewayId } = await params;

  try {
    const gateway = await prisma.paymentGateway.findUnique({
      where: { id: gatewayId }
    });

    if (!gateway) {
      await logToDb('WARN', 'WEBHOOK', `Tentativa de webhook em gateway inexistente ID: ${gatewayId}`);
      return NextResponse.json({ error: 'Gateway não encontrado.' }, { status: 404 });
    }

    if (!gateway.isActive) {
      await logToDb('WARN', 'WEBHOOK', `Webhook recebido para gateway inativo: ${gateway.name}`);
      return NextResponse.json({ error: 'Gateway inativo.' }, { status: 400 });
    }

    const rawBody = await request.text();
    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      await logToDb('WARN', 'WEBHOOK', `Erro ao parsear body do webhook do gateway ${gateway.name}. Não é um JSON válido.`, { rawBody });
      return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
    }

    // Log raw payload
    await logToDb('INFO', 'WEBHOOK', `Webhook recebido do gateway ${gateway.name} (${gateway.type})`, body);

    let externalId = '';
    let amount = 0;
    let status = 'PENDING';
    let paymentMethod = 'pix';
    let description = '';
    let email = '';
    let phone = '';
    let contactId = '';
    let productId = null;
    let sellerId = null;

    // 1. Parse fields based on provider type
    if (gateway.type === 'stripe') {
      // Signature verification
      const sig = request.headers.get('stripe-signature');
      if (gateway.webhookSecret && sig) {
        const parts = sig.split(',');
        const timestampPart = parts.find(p => p.trim().startsWith('t='));
        const signaturePart = parts.find(p => p.trim().startsWith('v1='));
        if (timestampPart && signaturePart) {
          const timestamp = timestampPart.split('=')[1];
          const signature = signaturePart.split('=')[1];
          const expectedPayload = `${timestamp}.${rawBody}`;
          const expected = crypto.createHmac('sha256', gateway.webhookSecret).update(expectedPayload).digest('hex');
          let isValid = false;
          try {
            isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
          } catch (e) {
            isValid = false;
          }
          if (!isValid) {
            await logToDb('WARN', 'WEBHOOK', `Assinatura de webhook inválida para gateway Stripe: ${gateway.name}`);
            return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
          }
        } else {
          await logToDb('WARN', 'WEBHOOK', `Assinatura de webhook Stripe malformada para: ${gateway.name}`);
          return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
        }
      }

      const stripeEvent = body.type;
      const stripeObj = body.data?.object;

      if (!stripeObj) {
        return NextResponse.json({ success: true, message: 'Ignorado: payload sem objeto Stripe' });
      }

      if (stripeEvent === 'checkout.session.completed' || stripeEvent === 'payment_intent.succeeded' || stripeEvent === 'charge.succeeded') {
        externalId = stripeObj.id;
        amount = (stripeObj.amount_total || stripeObj.amount || 0) / 100;
        status = 'PAID';
        paymentMethod = stripeObj.payment_method_types?.[0] || 'card';
        description = stripeObj.description || 'Stripe Payment';
        email = stripeObj.customer_details?.email || stripeObj.billing_details?.email || '';
        phone = stripeObj.customer_details?.phone || stripeObj.billing_details?.phone || '';
        contactId = stripeObj.metadata?.contactId || stripeObj.metadata?.contact_id || stripeObj.client_reference_id || '';
        if (stripeObj.metadata?.phone) {
          phone = stripeObj.metadata.phone;
        }
        productId = stripeObj.metadata?.productId || stripeObj.metadata?.product_id || null;
        sellerId = stripeObj.metadata?.sellerId || stripeObj.metadata?.seller_id || stripeObj.metadata?.assignedUserId || null;
      } else {
        return NextResponse.json({ success: true, message: `Evento Stripe ignorado: ${stripeEvent}` });
      }
    } 
    else if (gateway.type === 'mercadopago') {
      // Mercado Pago webhook format can be:
      // { action: "payment.created", type: "payment", data: { id: "payment_id" } }
      const type = body.type || body.topic;
      const paymentId = body.data?.id || body.id;

      if (type === 'payment' && paymentId) {
        if (!gateway.apiKey) {
          await logToDb('ERROR', 'WEBHOOK', `Erro no webhook do Mercado Pago: gateway ${gateway.name} não possui Access Token (API Key) configurado.`);
          return NextResponse.json({ error: 'Gateway sem token de API.' }, { status: 400 });
        }

        // Fetch payment details from Mercado Pago
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              'Authorization': `Bearer ${gateway.apiKey}`
            }
          });
          if (!mpRes.ok) {
            throw new Error(`Código HTTP ${mpRes.status} ao consultar detalhes do pagamento ${paymentId}`);
          }
          const mpPayment = await mpRes.json();
          externalId = String(mpPayment.id);
          amount = mpPayment.transaction_amount || 0;
          
          if (mpPayment.status === 'approved') {
            status = 'PAID';
          } else if (['pending', 'in_process'].includes(mpPayment.status)) {
            status = 'PENDING';
          } else {
            status = 'FAILED';
          }

          paymentMethod = mpPayment.payment_method_id || 'pix';
          description = mpPayment.description || 'Mercado Pago Payment';
          email = mpPayment.payer?.email || '';
          phone = mpPayment.payer?.phone?.number || '';
          contactId = mpPayment.metadata?.contact_id || mpPayment.metadata?.contactId || mpPayment.external_reference || '';
          productId = mpPayment.metadata?.productId || mpPayment.metadata?.product_id || null;
          sellerId = mpPayment.metadata?.sellerId || mpPayment.metadata?.seller_id || null;

          if (mpPayment.payer?.phone?.area_code && mpPayment.payer?.phone?.number) {
            phone = `${mpPayment.payer.phone.area_code}${mpPayment.payer.phone.number}`;
          }
        } catch (mpError) {
          await logToDb('ERROR', 'WEBHOOK', `Falha ao consultar pagamento no Mercado Pago: ${mpError.message}`);
          return NextResponse.json({ error: 'Erro ao buscar pagamento no provedor.' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ success: true, message: `Webhook Mercado Pago ignorado: tipo ou id ausente` });
      }
    } 
    else if (gateway.type === 'asaas') {
      const asaasToken = request.headers.get('asaas-access-token');
      if (gateway.webhookSecret && asaasToken !== gateway.webhookSecret) {
        await logToDb('WARN', 'WEBHOOK', `Token de webhook Asaas inválido ou ausente para: ${gateway.name}`);
        return NextResponse.json({ error: 'Token de webhook inválido.' }, { status: 401 });
      }

      const event = body.event;
      const paymentObj = body.payment;

      if (!paymentObj) {
        return NextResponse.json({ success: true, message: 'Ignorado: payload sem objeto Asaas' });
      }

      externalId = paymentObj.id;
      amount = paymentObj.value || 0;
      
      const isPaid = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event) || 
                     ['RECEIVED', 'CONFIRMED'].includes(paymentObj.status);
      
      status = isPaid ? 'PAID' : 'PENDING';
      paymentMethod = paymentObj.billingType?.toLowerCase() || 'pix';
      description = paymentObj.description || 'Asaas Payment';
      contactId = paymentObj.externalReference || '';
      
      // Asaas sometimes returns customer details or metadata
      email = paymentObj.email || '';
      phone = paymentObj.phone || '';
      productId = body.productId || body.product_id || null;
      sellerId = body.sellerId || body.seller_id || null;
    } 
    else if (gateway.type === 'naut') {
      // Signature verification
      const signature = request.headers.get('x-webhook-signature');
      if (gateway.webhookSecret && signature) {
        const expected = crypto.createHmac('sha256', gateway.webhookSecret).update(rawBody).digest('hex');
        let isValid = false;
        try {
          isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
        } catch (e) {
          isValid = false;
        }
        if (!isValid) {
          await logToDb('WARN', 'WEBHOOK', `Assinatura de webhook inválida para gateway Naut: ${gateway.name}`);
          return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
        }
      }

      const event = body.event;
      const eventData = body.data || {};
      let metadata = eventData.metadata || {};
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {}
      }

      const isPaid = ['transaction.paid', 'transaction.completed', 'subscription.renewed'].includes(event) ||
                     (event === 'purchase' && ['completed', 'approved', 'paid'].includes(String(eventData.transactionStatus || eventData.status).toLowerCase()));

      if (isPaid) {
        status = 'PAID';
        externalId = eventData.transactionId || eventData.paymentId || eventData.id || `naut_${Date.now()}`;
        amount = Number(eventData.grossAmount || eventData.amount || 0) / 100;
        paymentMethod = eventData.paymentMethod || 'pix';
        description = eventData.description || `Naut Payment ${externalId}`;
        productId = eventData.productId || metadata.productId || metadata.product_id || null;
        sellerId = metadata.sellerId || metadata.seller_id || null;
        contactId = metadata.contactId || metadata.contact_id || '';
        email = metadata.email || '';
        phone = metadata.phone || '';
      } else if (event === 'transaction.failed') {
        status = 'FAILED';
        externalId = eventData.transactionId || eventData.paymentId || eventData.id || `naut_${Date.now()}`;
        amount = Number(eventData.grossAmount || eventData.amount || 0) / 100;
        paymentMethod = eventData.paymentMethod || 'pix';
        description = `Naut Payment Failed`;
        productId = eventData.productId || metadata.productId || metadata.product_id || null;
        sellerId = metadata.sellerId || metadata.seller_id || null;
        contactId = metadata.contactId || metadata.contact_id || '';
      } else if (event === 'transaction.refunded' || event === 'transaction.partially_refunded') {
        status = 'REFUNDED';
        externalId = eventData.transactionId || eventData.paymentId || eventData.id || `naut_${Date.now()}`;
        amount = Number(eventData.grossAmount || eventData.amount || 0) / 100;
        paymentMethod = eventData.paymentMethod || 'pix';
        description = `Naut Payment Refunded`;
        productId = eventData.productId || metadata.productId || metadata.product_id || null;
        sellerId = metadata.sellerId || metadata.seller_id || null;
        contactId = metadata.contactId || metadata.contact_id || '';
      } else {
        return NextResponse.json({ success: true, message: `Evento Naut ignorado: ${event}` });
      }
    }
    else if (gateway.type === 'custom') {
      externalId = body.externalId || body.id || `custom_${Date.now()}`;
      amount = Number(body.amount || body.value || 0);
      
      const isPaid = ['paid', 'approved', 'success', 'RECEIVED', 'CONFIRMED', 'PAID'].includes(String(body.status).toUpperCase()) ||
                     body.status === true || 
                     body.isPaid === true;

      status = isPaid ? 'PAID' : 'PENDING';
      paymentMethod = body.paymentMethod || body.method || 'pix';
      description = body.description || 'Custom Gateway Transaction';
      contactId = body.contactId || '';
      phone = body.phone || body.phoneNumber || '';
      email = body.email || '';
      productId = body.productId || body.product_id || null;
      sellerId = body.sellerId || body.seller_id || null;
    }

    if (!externalId) {
      return NextResponse.json({ success: true, message: 'Ignorado: não foi possível identificar ID do pagamento' });
    }

    // 2. Match with Contact
    let contact = null;
    if (contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { connection: true }
      });
    }

    if (!contact && phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { id: normalized },
              { clientPhone: normalized },
              { id: { endsWith: normalized.slice(-8) } },
              { clientPhone: { endsWith: normalized.slice(-8) } }
            ]
          },
          include: { connection: true }
        });
      }
    }

    if (!contact && email) {
      contact = await prisma.contact.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { connection: true }
      });
    }

    // Deduce product and seller from contact if not supplied in metadata
    if (contact) {
      if (!productId) {
        if (contact.activeFlowId) {
          const flow = await prisma.flow.findUnique({ where: { id: contact.activeFlowId } });
          if (flow && flow.productId) {
            productId = flow.productId;
          }
        }
        if (!productId && contact.designatedAgentId) {
          const agent = await prisma.agent.findUnique({ where: { id: contact.designatedAgentId } });
          if (agent && agent.productId) {
            productId = agent.productId;
          }
        }
      }
      if (!sellerId && contact.assignedUserId) {
        sellerId = contact.assignedUserId;
      }
    }

    // 3. Upsert Payment Record
    let existingPayment = await prisma.payment.findFirst({
      where: {
        gatewayId,
        externalId
      }
    });

    let runAutomation = false;
    let paymentRecord = null;

    if (existingPayment) {
      if (status === 'PAID' && existingPayment.status !== 'PAID') {
        runAutomation = true;
      }
      paymentRecord = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status,
          contactId: contact ? contact.id : undefined,
          amount: amount || existingPayment.amount,
          paymentMethod: paymentMethod || existingPayment.paymentMethod,
          description: description || existingPayment.description,
          productId: productId || undefined,
          sellerId: sellerId || undefined
        }
      });
    } else {
      if (status === 'PAID') {
        runAutomation = true;
      }
      paymentRecord = await prisma.payment.create({
        data: {
          gatewayId,
          contactId: contact ? contact.id : null,
          externalId,
          amount,
          status,
          paymentMethod,
          description,
          productId: productId || null,
          sellerId: sellerId || null
        }
      });
    }

    // 4. Run Automations if status is PAID and it's a new transitions
    if (runAutomation && contact) {
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

      // c. Send confirmation WhatsApp message
      const connectionToUse = contact.connection;
      if (connectionToUse) {
        try {
          const messageText = `Confirmamos seu pagamento de R$ ${amount.toFixed(2).replace('.', ',')} com sucesso! Obrigado! 🎉`;
          await sendText(contact.id, messageText, null, connectionToUse);
          
          await prisma.message.create({
            data: {
              id: `bot_${Date.now()}_payment_confirm`,
              contactId: contact.id,
              direction: 'OUTGOING',
              senderType: 'BOT',
              type: 'text',
              content: messageText,
              status: 'sent'
            }
          });
        } catch (waError) {
          console.error('Error sending WhatsApp payment confirmation:', waError);
        }
      }

      // d. Dispatch push notifications to assigned collaborator or all
      try {
        const contactName = contact.name || contact.profileName || contact.id;
        const title = `Pagamento Confirmado! 💰`;
        const body = `O lead ${contactName} realizou um pagamento de R$ ${amount.toFixed(2).replace('.', ',')} via ${gateway.name}.`;
        const url = `/chat?contactId=${contact.id}`;
        const targetUserIds = contact.assignedUserId ? [contact.assignedUserId] : null;
        
        await sendPushNotification(title, body, url, targetUserIds);
      } catch (pushError) {
        console.error('Error sending payment push notification:', pushError);
      }

      // e. Log event
      await logToDb('INFO', 'WEBHOOK', `Pagamento de R$ ${amount} confirmado no gateway ${gateway.name} para o contato ${contact.id}.`);

      // e.2. Send Meta Conversions API Event
      try {
        const { sendMetaCapiPurchase } = await import('@/lib/capi');
        await sendMetaCapiPurchase({ contact, payment: paymentRecord });
      } catch (capiError) {
        console.error('Error triggering Meta CAPI:', capiError);
      }

      // f. Continue Chatbot Flow if waiting on a Pix node
      if (contact.activeFlowId && contact.currentStepId) {
        try {
          const flow = await prisma.flow.findUnique({ where: { id: contact.activeFlowId } });
          if (flow) {
            const steps = JSON.parse(flow.steps || '[]');
            const currentStep = steps.find(s => s.id === contact.currentStepId);
            if (currentStep && currentStep.pixEnabled && currentStep.nextStepId) {
              const nextStep = steps.find(s => s.id === currentStep.nextStepId);
              if (nextStep) {
                await logToDb('INFO', 'FLOW', `Pagamento recebido. Avançando contato ${contact.id} para a próxima etapa do fluxo: '${nextStep.id}'`);
                
                await prisma.contact.update({
                  where: { id: contact.id },
                  data: { currentStepId: nextStep.id }
                });
                
                // Import dynamic execution from queue.js
                const { sendStepResponse } = await import('@/lib/queue');
                await sendStepResponse(contact.id, nextStep, steps, null, contact.connection);
              }
            }
          }
        } catch (flowError) {
          console.error('Error auto-advancing flow on payment confirmation:', flowError);
          await logToDb('ERROR', 'FLOW', `Erro ao auto-avançar fluxo do contato ${contact.id} após pagamento: ${flowError.message}`);
        }
      }

      // g. Trigger post-payment flows (Upsell / Chatbot Flow)
      try {
        let triggeredFlow = null;

        // 1. Check if the product has a specific post-sale flow set
        if (productId) {
          const product = await prisma.product.findUnique({
            where: { id: productId }
          });
          if (product && product.postSaleFlowId) {
            const flow = await prisma.flow.findUnique({
              where: { id: product.postSaleFlowId }
            });
            if (flow && flow.isActive) {
              triggeredFlow = flow;
              await logToDb('INFO', 'FLOW', `Disparando fluxo pós-venda direto do produto '${flow.name}' para o contato ${contact.id}`);
            }
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
            await logToDb('INFO', 'FLOW', `Disparando fluxo pós-pagamento '${triggeredFlow.name}' (Upsell) para o contato ${contact.id}`);
          }
        }

        if (triggeredFlow) {
          const { startFlowForContact } = await import('@/lib/queue');
          await startFlowForContact(contact, triggeredFlow, null);
        }
      } catch (upsellError) {
        console.error('Error triggering post-payment flow:', upsellError);
        await logToDb('ERROR', 'FLOW', `Erro ao disparar fluxo pós-pagamento para o contato ${contact.id}: ${upsellError.message}`);
      }
    }

    return NextResponse.json({ success: true, paymentId: paymentRecord.id });
  } catch (error) {
    console.error('Webhook execution failure:', error);
    await logToDb('ERROR', 'WEBHOOK', `Erro ao processar webhook do gateway ID ${gatewayId}: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
