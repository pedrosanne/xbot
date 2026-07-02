import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { prisma } from './prisma';
import { getSystemSettings } from './settings';
import { logToDb } from './log';
import { sendText } from './whatsapp';
import { sendPushNotification } from './push';
import { sendMetaCapiPurchase } from './capi';

/**
 * Extracts Pix receipt data from an image using Gemini Vision
 */
export async function analyzePixReceipt(mediaUrl, mimeType) {
  try {
    const settings = await getSystemSettings();
    const startTime = Date.now();
    let lastError = null;

    let keysToTry = [];
    try {
      const dbProviders = await prisma.aiProvider.findMany({
        where: { isActive: true },
        orderBy: { usageCount: 'asc' }
      });
      if (dbProviders && dbProviders.length > 0) {
        keysToTry = dbProviders;
      }
    } catch (err) {}

    // Fallback se não houver Contingência configurada, usa a chave do agente
    if (keysToTry.length === 0) {
      const agent = await prisma.agent.findFirst({
        where: { isActive: true }
      });
      const apiKeyToUse = agent?.geminiApiKey || settings.geminiApiKey;
      if (apiKeyToUse) {
        keysToTry.push({
          id: 'legacy',
          name: 'Legacy Key',
          provider: 'GEMINI',
          key: apiKeyToUse,
          model: agent?.model || 'gemini-2.5-flash'
        });
      }
    }

    if (keysToTry.length === 0) {
      console.error('No AI keys configured for Pix receipt analysis.');
      return null;
    }

    let fileBuffer = null;
    if (mediaUrl.startsWith('/api/uploads/')) {
      const filename = mediaUrl.replace('/api/uploads/', '');
      const supabaseUrl = process.env.SUPABASE_URL;
      const bucket = process.env.SUPABASE_BUCKET || 'media';
      
      const decodedFilename = decodeURIComponent(filename);
      const encodedFilename = encodeURIComponent(decodedFilename).replace(/%2F/g, '/');
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedFilename}`;
      
      const res = await fetch(publicUrl);
      if (res.ok) {
        fileBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        console.error(`Failed to fetch file from Supabase storage for receipt analysis: ${publicUrl}`);
      }
    }

    if (!fileBuffer) {
      console.error(`Could not load file buffer for Pix receipt analysis: ${mediaUrl}`);
      return null;
    }

    const base64Data = fileBuffer.toString('base64');
    const cleanMimeType = mimeType.split(';')[0].trim();
    const isPdf = cleanMimeType === 'application/pdf';

    const prompt = `Analise o documento ou imagem em anexo. Ele é um comprovante de transferência, pagamento ou agendamento de Pix?
Retorne um objeto JSON com o seguinte formato:
{
  "isPixReceipt": true ou false,
  "isScheduled": true se for apenas um AGENDAMENTO e não um pagamento confirmado, caso contrário false,
  "transactionId": "o código de transação, ID da transação ou ID Fim a Fim / End-to-End ID (geralmente começa com E e tem letras e números)",
  "amount": o valor numérico em reais (ex: 97.00),
  "date": "a data e hora do pagamento no formato ISO (YYYY-MM-DDTHH:mm:ss) ou aproximado",
  "payerName": "o nome da pessoa que realizou o pagamento"
}`;

    for (let i = 0; i < keysToTry.length; i++) {
      const currentProvider = keysToTry[i];
      const providerType = currentProvider.provider || 'GEMINI';

      // Pula OpenAI se for PDF, pois a OpenAI Vision via API direta não suporta PDF nativamente em mensagens base64.
      if (isPdf && providerType !== 'GEMINI') continue;
      
      // Pula DeepSeek pois não suporta visão ainda.
      if (providerType === 'DEEPSEEK') continue;

      try {
        let textResponse = '';
        let totalTokens = 0;
        let estimatedCost = 0;

        if (providerType === 'GEMINI') {
           const genAI = new GoogleGenerativeAI(currentProvider.key);
           const model = genAI.getGenerativeModel({
             model: currentProvider.model || 'gemini-2.5-flash',
             generationConfig: { responseMimeType: 'application/json' }
           });
           
           const generativePart = {
             inlineData: { data: base64Data, mimeType: cleanMimeType }
           };
           
           const result = await model.generateContent([prompt, generativePart]);
           const response = await result.response;
           textResponse = response.text().trim();
           
           totalTokens = response.usageMetadata?.totalTokenCount || 0;
           estimatedCost = (totalTokens / 1000000) * 0.15;
           
        } else if (providerType === 'OPENAI') {
           const openai = new OpenAI({ apiKey: currentProvider.key });
           const completion = await openai.chat.completions.create({
             model: currentProvider.model || 'gpt-4o-mini',
             response_format: { type: 'json_object' },
             messages: [
               {
                 role: 'user',
                 content: [
                   { type: 'text', text: prompt },
                   { type: 'image_url', image_url: { url: `data:${cleanMimeType};base64,${base64Data}` } }
                 ]
               }
             ]
           });
           textResponse = completion.choices[0].message.content.trim();
           totalTokens = completion.usage?.total_tokens || 0;
           estimatedCost = (totalTokens / 1000000) * 0.15;
        }

        const durationMs = Date.now() - startTime;
        
        // Log Success & increment usage
        if (currentProvider.id !== 'legacy') {
          await prisma.aiProvider.update({
             where: { id: currentProvider.id },
             data: { usageCount: { increment: 1 } }
          });
          try {
             await prisma.aiUsage.create({
                data: {
                  provider: providerType,
                  model: currentProvider.model || 'unknown',
                  action: 'analyzePixReceipt',
                  tokens: totalTokens,
                  cost: estimatedCost,
                  status: 'SUCCESS',
                  durationMs,
                  providerId: currentProvider.id
                }
             });
          } catch(e){}
        }

        const data = JSON.parse(textResponse);
        await logToDb('INFO', 'AI', `Análise de comprovante concluída por ${providerType}. É Pix: ${data.isPixReceipt}, Valor: ${data.amount}, ID: ${data.transactionId}`);
        return data;
      } catch (err) {
        console.error(`AI Provider [${currentProvider.name || 'Legacy'}] failed on analyzePixReceipt:`, err.message);
        lastError = err.message;
        if (currentProvider.id !== 'legacy') {
           await prisma.aiProvider.update({
             where: { id: currentProvider.id },
             data: { usageCount: { increment: 1 }, errorCount: { increment: 1 } }
           });
        }
        // Tentará o próximo provedor no loop (Contingência)
      }
    }

    // Se todos falharam
    await logToDb('ERROR', 'AI', `Erro ao analisar comprovante Pix: Todos os provedores do Pool falharam. Último erro: ${lastError}`);
    return null;
  } catch (err) {
    console.error('Error analyzing Pix receipt:', err);
    return null;
  }
}

/**
 * Searches Mercado Pago for a payment matching the receipt data and processes it
 */
export async function processPixReceiptPayment(contact, receiptData, mockMode = false) {
  try {
    const { amount, transactionId, payerName } = receiptData;

    let gateway = null;
    let finalAmount = parseFloat(amount) || 0.0;
    let externalId = '';

    if (mockMode) {
      // Fetch any active gateway or just any gateway as a placeholder
      gateway = await prisma.paymentGateway.findFirst({
        where: { isActive: true }
      });
      if (!gateway) {
        gateway = await prisma.paymentGateway.findFirst();
      }
      
      externalId = transactionId || `mock_${Date.now()}`;
      await logToDb('INFO', 'FLOW', `Modo Simulação / Sem Mercado Pago ativo. Validando comprovante ID ${externalId} no valor de R$ ${finalAmount}`);
    } else {
      // 1. Fetch active Mercado Pago gateway
      gateway = await prisma.paymentGateway.findFirst({
        where: { type: 'mercadopago', isActive: true }
      });

      if (!gateway || !gateway.apiKey) {
        await logToDb('WARN', 'FLOW', `Comprovante Pix recebido de ${contact.id}, mas nenhum gateway Mercado Pago ativo com API Key foi encontrado.`);
        return { success: false, reason: 'no_gateway' };
      }
    }

    // 2. Identify Product from the Contact's active chatbot flow
    let productId = null;
    if (contact.activeFlowId) {
      try {
        const activeFlow = await prisma.flow.findUnique({
          where: { id: contact.activeFlowId }
        });
        if (activeFlow && activeFlow.productId) {
          productId = activeFlow.productId;
          await logToDb('INFO', 'FLOW', `Identificado produto '${productId}' através do fluxo ativo '${activeFlow.name}' do contato ${contact.id}`);
        }
      } catch (flowErr) {
        console.error('Error fetching active flow for product identification:', flowErr);
      }
    }

    if (!mockMode) {
      await logToDb('INFO', 'FLOW', `Buscando transação de R$ ${amount} no Mercado Pago para o contato ${contact.id}...`);

      // 3. Search recent payments in Mercado Pago (last 50 payments)
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50`, {
        headers: {
          'Authorization': `Bearer ${gateway.apiKey}`
        }
      });

      if (!mpRes.ok) {
        throw new Error(`Erro API Mercado Pago: ${mpRes.statusText}`);
      }

      const mpData = await mpRes.json();
      const mpPayments = mpData.results || [];

      // 4. Look for a matching approved payment (matching the real amount from the receipt)
      let matchedMpPayment = null;

      for (const mpPay of mpPayments) {
        if (mpPay.status !== 'approved') continue;
        
        // Compare amount (tolerance of 0.02 to allow small rounding)
        const amountDiff = Math.abs(mpPay.transaction_amount - amount);
        if (amountDiff > 0.02) continue;

        // Compare End-to-End ID if available in both
        const mpE2eId = mpPay.point_of_interaction?.transaction_data?.transaction_id || 
                        mpPay.transaction_details?.transaction_id || '';
        
        if (transactionId && mpE2eId) {
          if (mpE2eId.toLowerCase().includes(transactionId.toLowerCase()) || 
              transactionId.toLowerCase().includes(mpE2eId.toLowerCase())) {
            matchedMpPayment = mpPay;
            break;
          }
        }

        // Fallback: If no E2E ID matches but the amount is identical and the payment was created recently (last 4 hours)
        const timeDiffHours = (Date.now() - new Date(mpPay.date_created).getTime()) / (1000 * 60 * 60);
        if (timeDiffHours <= 4 && !transactionId) {
          // Match by amount + name similarity if available
          const mpPayerName = mpPay.payer?.first_name || '';
          if (payerName && mpPayerName) {
            const firstWordReceipt = payerName.split(' ')[0].toLowerCase();
            const firstWordMp = mpPayerName.split(' ')[0].toLowerCase();
            if (firstWordReceipt === firstWordMp) {
              matchedMpPayment = mpPay;
              break;
            }
          } else {
            // If no payer name to compare, match by amount alone (since it's within 4 hours)
            matchedMpPayment = mpPay;
            break;
          }
        }
      }

      if (!matchedMpPayment) {
        await logToDb('WARN', 'FLOW', `Nenhum pagamento de R$ ${amount} correspondente ao comprovante do contato ${contact.id} foi encontrado no Mercado Pago.`);
        return { success: false, reason: 'not_found' };
      }

      externalId = String(matchedMpPayment.id);
      finalAmount = matchedMpPayment.transaction_amount;
    }

    // 5. Check if this payment ID has already been registered in our database
    const existingPayment = await prisma.payment.findFirst({
      where: { externalId }
    });

    if (existingPayment) {
      await logToDb('WARN', 'FLOW', `Transação/Comprovante ID ${externalId} já foi utilizado no sistema anteriormente. Abortando atribuição duplicada.`);
      return { success: false, reason: 'already_used' };
    }

    // 6. Create Payment record in DB
    const payment = await prisma.payment.create({
      data: {
        gatewayId: gateway ? gateway.id : 'manual',
        contactId: contact.id,
        externalId: externalId,
        amount: finalAmount,
        status: 'PAID',
        paymentMethod: mockMode ? 'pix_simulado' : 'pix',
        description: mockMode 
          ? `Pix Direto (IA Sem Verificação MP) - Benef: ${payerName || 'Cliente'} - Ref: ${transactionId || 'N/A'}`
          : `Pix Direto CNPJ Detectado via IA - Ref: ${transactionId || 'N/A'}`,
        productId: productId
      }
    });

    await logToDb('INFO', 'FLOW', `Pagamento Pix direto de R$ ${payment.amount} atribuído com sucesso ao contato ${contact.id} via IA.`);

    // Trigger Group Automations for payment_approved
    try {
      const { triggerGroupAutomations } = await import('./groupAuto');
      await triggerGroupAutomations('payment_approved', { contact, payment, productId });
    } catch (groupAutoErr) {
      console.error('Error triggering group automations in receipt.js:', groupAutoErr);
    }

    // =========================================================================
    // AUTOMATIONS
    // =========================================================================
    
    // a. Set Contact status to AUTO and add tag "pago"
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: 'AUTO' }
    });

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

    // b. Send Meta Conversions API Event
    try {
      await sendMetaCapiPurchase({ contact, payment });
    } catch (capiError) {
      console.error('Error sending Meta CAPI for IA Pix:', capiError);
    }

    // c. Dispatch push notification
    try {
      const contactName = contact.name || contact.profileName || contact.id;
      const settings = await getSystemSettings();
      const titleFormat = settings.pushTitleSale || 'Venda Aprovada! 🎉';
      const bodyFormat = settings.pushBodySale || 'R$ {valor} - {nome}';
      const soundFormat = settings.pushSoundSale || 'sale';
      
      const finalTitle = titleFormat.replace('{nome}', contactName);
      const finalBody = bodyFormat
        .replace('{nome}', contactName)
        .replace('{valor}', payment.amount.toFixed(2).replace('.', ','));
        
      const pushUrl = `/chat?contactId=${contact.id}`;
      await sendPushNotification(finalTitle, finalBody, pushUrl, null, soundFormat);
    } catch (pushError) {
      console.error('Error sending push for IA Pix:', pushError);
    }

    // d. Trigger post-payment flows (Product Post-Sale Flow or Upsell)
    let triggeredFlow = null;
    try {
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
          await logToDb('INFO', 'FLOW', `Disparando fluxo pós-pagamento '${triggeredFlow.name}' (Upsell) para o contato ${contact.id} após validação por IA`);
        }
      }

    } catch (upsellError) {
      console.error('Error triggering post-payment flow for IA Pix:', upsellError);
    }

    return { success: true, payment, triggeredFlow };
  } catch (error) {
    console.error('Error processing Pix receipt payment:', error);
    return { success: false, error: error.message };
  }
}
