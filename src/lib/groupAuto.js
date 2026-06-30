import { prisma } from './prisma';
import { sendText } from './whatsapp';
import { logToDb } from './log';

/**
 * Replaces variables in message templates
 */
function replaceVariables(text, { contact, payment, link }) {
  if (!text) return '';
  const nome = contact.name || contact.profileName || 'Cliente';
  const primeiroNome = nome.trim().split(/\s+/)[0] || 'Cliente';
  const email = contact.email || '';
  const whatsapp = contact.clientPhone || contact.id.split(':').pop() || '';
  const valor = payment ? `R$ ${payment.amount.toFixed(2).replace('.', ',')}` : '';

  return text
    .replace(/{nome}/g, nome)
    .replace(/{primeiro_nome}/g, primeiroNome)
    .replace(/{email}/g, email)
    .replace(/{whatsapp}/g, whatsapp)
    .replace(/{valor}/g, valor)
    .replace(/{link}/g, link || '');
}

/**
 * Triggers group, community, and channel automations for a given event
 */
export async function triggerGroupAutomations(event, { contact, payment, productId }) {
  try {
    // 1. Fetch active group automations for this event
    const automations = await prisma.groupAutomation.findMany({
      where: {
        event,
        isActive: true,
        OR: [
          { productId: productId || undefined },
          { productId: null }
        ]
      }
    });

    if (automations.length === 0) {
      return;
    }

    await logToDb('INFO', 'SYSTEM', `Disparando ${automations.length} automações de grupo para o evento '${event}'...`);

    for (const auto of automations) {
      // If automation is product-specific, make sure it matches
      if (auto.productId && auto.productId !== productId) {
        continue;
      }

      const messageText = replaceVariables(auto.message, {
        contact,
        payment,
        link: auto.apiType === 'official' ? auto.target : ''
      });

      if (auto.apiType === 'official') {
        // Official API: Send the invite link/message to the client
        const connection = contact.connection || null;
        await logToDb('INFO', 'SYSTEM', `Enviando convite de grupo oficial para o contato ${contact.id}`);
        await sendText(contact.id, messageText || `Olá! Entre no nosso grupo por este link: ${auto.target}`, null, connection);
      } else if (auto.apiType === 'evolution') {
        // Evolution API: Post message directly to group/channel JID
        try {
          const cleanUrl = auto.apiUrl.replace(/\/$/, '');
          await logToDb('INFO', 'SYSTEM', `Postando mensagem no grupo via Evolution API: ${auto.target}`);
          
          const response = await fetch(`${cleanUrl}/message/sendText`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': auto.apiToken
            },
            body: JSON.stringify({
              number: auto.target,
              options: { delay: 1000, presence: 'composing' },
              text: messageText
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Evolution API HTTP ${response.status}: ${errText}`);
          }
          await logToDb('INFO', 'SYSTEM', `Mensagem enviada com sucesso ao grupo ${auto.target} via Evolution API.`);
        } catch (evoErr) {
          await logToDb('ERROR', 'SYSTEM', `Falha ao postar no grupo via Evolution API: ${evoErr.message}`);
        }
      } else if (auto.apiType === 'zapi') {
        // Z-API: Post message directly to group/channel JID
        try {
          const cleanUrl = auto.apiUrl.replace(/\/$/, '');
          await logToDb('INFO', 'SYSTEM', `Postando mensagem no grupo via Z-API: ${auto.target}`);
          
          const response = await fetch(`${cleanUrl}/send-text`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Client-Token': auto.apiToken,
              'Authorization': `Bearer ${auto.apiToken}`
            },
            body: JSON.stringify({
              phone: auto.target,
              message: messageText
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Z-API HTTP ${response.status}: ${errText}`);
          }
          await logToDb('INFO', 'SYSTEM', `Mensagem enviada com sucesso ao grupo ${auto.target} via Z-API.`);
        } catch (zapiErr) {
          await logToDb('ERROR', 'SYSTEM', `Falha ao postar no grupo via Z-API: ${zapiErr.message}`);
        }
      }
    }
  } catch (err) {
    console.error('Error triggering group automations:', err);
    await logToDb('ERROR', 'SYSTEM', `Erro ao processar automações de grupo: ${err.message}`);
  }
}
