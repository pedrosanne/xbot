import { prisma } from './prisma';
import { generateAIResponse, extractAmountFromText } from './gemini';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo, sendButtons, sendCTAUrlButton, sendTypingIndicator, markWhatsAppMessageAsRead, sendPixPaymentRequest } from './whatsapp';
import { textToSpeech } from './tts';
import { logToDb } from './log';
import { sendPushNotification } from './push';
import { redis } from './redis';
import { getCachedSettings, getCachedActiveFlows } from './cache';

const contactLocks = new Map();

async function serializeProcessing(contactId, fn) {
  while (contactLocks.has(contactId)) {
    const previous = contactLocks.get(contactId);
    try {
      await previous;
    } catch (err) {
      // ignore
    }
  }

  let resolve;
  const current = new Promise(r => { resolve = r; });
  contactLocks.set(contactId, current);

  try {
    return await fn();
  } finally {
    resolve();
    if (contactLocks.get(contactId) === current) {
      contactLocks.delete(contactId);
    }
  }
}

function getFilenameFromUrl(urlPath, defaultName = 'documento') {
  if (!urlPath) return defaultName;
  try {
    const cleanUrl = urlPath.split('?')[0];
    const decodedUrl = decodeURIComponent(cleanUrl);
    const base = decodedUrl.substring(decodedUrl.lastIndexOf('/') + 1);
    
    // Check if the filename contains our unique separator ___
    if (base.includes('___')) {
      const parts = base.split('___');
      const originalPart = parts[0];
      const ext = base.substring(base.lastIndexOf('.'));
      if (originalPart.endsWith(ext)) {
        return originalPart;
      }
      return `${originalPart}${ext}`;
    }
    
    return base || defaultName;
  } catch (err) {
    return defaultName;
  }
}

// Removida a fila de debounce em memória que causava timeouts e instabilidade na Vercel

export async function processSingleMessageWrapper(contactId, messageData) {
  try {
    await logToDb('INFO', 'SYSTEM', `Processando mensagem recebida do contato ${contactId}. Tipo: ${messageData.type}`, { content: messageData.content });

    const isMultiNumber = contactId.includes(':');
    const [phoneId, clientPhone] = isMultiNumber ? contactId.split(':') : [null, contactId];

    // Find corresponding connection
    let connection = null;
    if (phoneId && phoneId !== 'system') {
      connection = await prisma.whatsAppConnection.findUnique({
        where: { whatsappPhoneId: phoneId }
      });
    }

    // 1. Garante que o contato existe no banco de dados
    let contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { connection: true }
    });

    if (!contact) {
      await logToDb('INFO', 'DATABASE', `Criando novo contato para o número: ${contactId}`);
      contact = await prisma.contact.create({
        data: {
          id: contactId,
          name: messageData.name || messageData.profileName || 'Cliente WhatsApp',
          profileName: messageData.profileName || '',
          status: 'AUTO',
          phoneNumberId: phoneId || '',
          clientPhone: clientPhone || contactId,
          connectionId: connection?.id || null
        },
        include: { connection: true }
      });
    } else if (messageData.profileName && contact.profileName !== messageData.profileName) {
      await logToDb('INFO', 'DATABASE', `Atualizando nome de perfil do contato ${contactId}: ${messageData.profileName}`);
      contact = await prisma.contact.update({
        where: { id: contactId },
        data: { profileName: messageData.profileName },
        include: { connection: true }
      });
    }

    // 2. Salva a mensagem recebida no banco de dados
    await prisma.message.create({
      data: {
        id: messageData.id,
        contactId,
        direction: 'INCOMING',
        senderType: 'CLIENT',
        type: messageData.type,
        content: messageData.content || '',
        mediaUrl: messageData.mediaUrl || '',
        status: 'received',
        timestamp: new Date(messageData.timestamp),
        replyToId: messageData.replyToId || '',
        replyToContent: messageData.replyToContent || ''
      }
    });

    // Atualiza a última interação do contato
    contact = await prisma.contact.update({
      where: { id: contactId },
      data: { lastInteraction: new Date() },
      include: { connection: true }
    });

    // 3. Verifica se o contato está em modo MANUAL (atendimento humano)
    if (contact.status === 'MANUAL') {
      // Check if message is a flow keyword trigger to release from MANUAL
      const allActiveFlows = await getCachedActiveFlows();
      const activeFlows = allActiveFlows.filter(f => 
        f.connectionId === null || f.connectionId === contact.connectionId
      );
      const normalizedInput = (messageData.content || '').trim().toLowerCase();
      let triggeredFlow = null;
      if (messageData.type === 'text' && normalizedInput) {
        triggeredFlow = activeFlows.find(f => {
          if (f.trigger !== 'keyword') return false;
          if (f.keywords.trim().toLowerCase() === normalizedInput) return true;
          const keywordsArray = f.keywords.split(',').map(k => k.trim().toLowerCase());
          return keywordsArray.includes(normalizedInput);
        });
      }

      if (triggeredFlow && !contact.passedFlows) {
        await logToDb('INFO', 'FLOW', `Contato ${contactId} estava em MANUAL mas enviou a palavra-chave do fluxo '${triggeredFlow.name}'. Retornando para AUTO.`);
        contact = await prisma.contact.update({
          where: { id: contactId },
          data: { status: 'AUTO' },
          include: { connection: true }
        });
      } else {
        await logToDb('INFO', 'SYSTEM', `Contato ${contactId} está em modo MANUAL. Resposta automática pausada.`);
        
        // Busca os colaboradores vinculados a esta conexão de WhatsApp para segmentar
        let targetUserIds = null;
        if (contact.connectionId) {
          try {
            const connWithUsers = await prisma.whatsAppConnection.findUnique({
              where: { id: contact.connectionId },
              include: { users: { select: { id: true } } }
            });
            if (connWithUsers && connWithUsers.users.length > 0) {
              targetUserIds = connWithUsers.users.map(u => u.id);
            }
          } catch (err) {
            console.error('Error fetching connection users for manual override push:', err);
          }
        }

        const contactName = contact.name || contact.profileName || contactId;
        const messageSnippet = messageData.content 
          ? (messageData.content.length > 60 ? messageData.content.substring(0, 60) + '...' : messageData.content) 
          : 'Mídia recebida';

        await sendPushNotification(
          `Atendimento Manual: ${contactName} 💬`,
          messageSnippet,
          `/chat?contactId=${contactId}`,
          targetUserIds
        );
        return;
      }
    }

    // 4. Processa a mensagem de forma síncrona e imediata
    await processSingleMessage(contact, messageData);

  } catch (err) {
    await logToDb('ERROR', 'SYSTEM', `Erro ao processar mensagem para o contato ${contactId}: ${err.message}`, {
      error: err.message,
      stack: err.stack
    });
  }
}

export async function enqueueMessage(contactId, messageData) {
  if (!redis) {
    // Fallback to in-memory processing serialization when Redis is not available
    return serializeProcessing(contactId, async () => {
      await processSingleMessageWrapper(contactId, messageData);
    });
  }

  try {
    const queueKey = `queue:contact:${contactId}`;
    const lockKey = `lock:contact:${contactId}`;
    const lockTtlMs = 45000; // 45 seconds lock expiry to prevent deadlocks on slow LLM/TTS actions

    // Push the new message onto the Redis queue
    await redis.rpush(queueKey, JSON.stringify(messageData));
    await logToDb('INFO', 'SYSTEM', `[Redis Queue] Mensagem adicionada à fila Redis para o contato ${contactId}`);

    // Try to acquire the processing lock for this contact
    const acquired = await redis.set(lockKey, '1', 'NX', 'PX', lockTtlMs);

    if (acquired === 'OK') {
      try {
        while (true) {
          const rawMessage = await redis.lpop(queueKey);
          if (!rawMessage) break;

          const currentMessage = JSON.parse(rawMessage);
          await logToDb('INFO', 'SYSTEM', `[Redis Queue] Iniciando processamento de mensagem para o contato ${contactId}`);
          await processSingleMessageWrapper(contactId, currentMessage);
        }
      } finally {
        // Always delete the lock once the queue has been drained
        await redis.del(lockKey);
      }
    } else {
      await logToDb('INFO', 'SYSTEM', `[Redis Queue] Outra instância está processando mensagens para o contato ${contactId}. Enfileirada com sucesso.`);
    }
  } catch (err) {
    await logToDb('ERROR', 'SYSTEM', `Falha crítica no tratamento de fila Redis para o contato ${contactId}: ${err.message}`, {
      error: err.message,
      stack: err.stack
    });
    // Fallback direct execution to prevent message drop in case of Redis failure
    await processSingleMessageWrapper(contactId, messageData);
  }
}

async function processSingleMessage(contact, messageData) {
  const contactId = contact.id;
  await logToDb('INFO', 'FLOW', `Iniciando processamento síncrono para o contato ${contactId}`);

  try {
    // Busca o estado mais atual do contato no banco
    const freshContact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { connection: true }
    });
    if (!freshContact || freshContact.status === 'MANUAL') {
      await logToDb('WARN', 'FLOW', `Contato ${contactId} mudou para MANUAL ou não existe. Cancelando resposta.`);
      return;
    }

    // 1. Extrai detalhes da mensagem única
    let text = '';
    let mediaUrl = '';
    let mimeType = '';
    let clickedButtonId = '';

    if (messageData.buttonId) {
      clickedButtonId = messageData.buttonId;
    }

    if (messageData.type === 'text' && messageData.content) {
      text = messageData.content;
    } else if (messageData.type === 'interactive' && messageData.content) {
      text = messageData.content;
    } else if (messageData.type === 'audio') {
      text = `[Áudio recebido]`;
      mediaUrl = messageData.mediaUrl;
      mimeType = 'audio/ogg';
    } else if (messageData.mediaUrl) {
      text = `[Mídia enviada (${messageData.type}): ${messageData.content || ''}]`;
      mediaUrl = messageData.mediaUrl;
      if (messageData.type === 'image') mimeType = 'image/jpeg';
      else if (messageData.type === 'video') mimeType = 'video/mp4';
      else if (messageData.type === 'document') mimeType = 'application/pdf';
    }

    await logToDb('INFO', 'FLOW', `Entrada consolidada - Texto: "${text}", Botão ID: "${clickedButtonId}"`);

    const normalizedInput = text.trim().toLowerCase();

    // INTERCEPT RECURRING CLIENT WHO ALREADY COMPLETED A FLOW
    if (freshContact.passedFlows && !freshContact.activeFlowId) {
      await logToDb('INFO', 'AI', `Contato recorrente detectado. Fluxos anteriores: ${freshContact.passedFlows}. Encaminhando para humano.`);

      if (messageData.id) {
        await markWhatsAppMessageAsRead(messageData.id, freshContact.connection);
      }

      await sendTypingIndicator(contactId, freshContact.connection);
      try {
        await prisma.contact.update({
          where: { id: contactId },
          data: { typingState: 'TYPING' }
        });
      } catch (e) {}

      // Get agent to use
      const agentIdToUse = freshContact.designatedAgentId;
      let agent = null;
      if (agentIdToUse) {
        agent = await prisma.agent.findUnique({ where: { id: agentIdToUse } });
      }
      if (!agent) {
        agent = await prisma.agent.findFirst({
          where: { isActive: true, connectionId: freshContact.connectionId || null }
        });
        if (!agent) {
          agent = await prisma.agent.findFirst({
            where: { isActive: true, connectionId: null }
          });
        }
      }

      const aiTextResponse = await generateAIResponse(
        contactId,
        text,
        mediaUrl,
        mimeType,
        agent?.id || null,
        freshContact.passedFlows
      );

      // Clean the response just in case to remove any flow triggers
      const flowTriggerRegex = /\[DISPARAR_FLUXO:\s*([^\]]+)\]/i;
      const cleanedResponse = aiTextResponse.replace(flowTriggerRegex, '').trim();

      await sendBotResponse(contactId, cleanedResponse, messageData.id, freshContact.connection);

      // Auto-switch contact status to MANUAL
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          status: 'MANUAL',
          botMode: 'FLOW',
          currentStepId: '',
          activeFlowId: ''
        }
      });

      // Send push notification to users
      let targetUserIds = null;
      if (freshContact.connectionId) {
        try {
          const connWithUsers = await prisma.whatsAppConnection.findUnique({
            where: { id: freshContact.connectionId },
            include: { users: { select: { id: true } } }
          });
          if (connWithUsers && connWithUsers.users.length > 0) {
            targetUserIds = connWithUsers.users.map(u => u.id);
          }
        } catch (err) {
          console.error('Error fetching connection users for recurrent customer push:', err);
        }
      }

      const contactName = freshContact.name || freshContact.profileName || contactId;
      const flowNames = freshContact.passedFlows.split(',').map(f => {
        const parts = f.split(':');
        return parts.length > 1 ? parts[1] : parts[0];
      }).join(', ');

      await sendPushNotification(
        `Cliente Recorrente: ${contactName} 👤`,
        `Já passou por: ${flowNames} e retornou contato.`,
        `/chat?contactId=${contactId}`,
        targetUserIds
      );

      return;
    }

    // 2. Carrega os fluxos ativos (escopados por conexão do WhatsApp ou globais)
    const allActiveFlows = await getCachedActiveFlows();
    const activeFlows = allActiveFlows.filter(f => 
      f.connectionId === null || f.connectionId === freshContact.connectionId
    );

    // 3. Verifica se o usuário digitou uma palavra-chave para iniciar um NOVO fluxo
    let triggeredFlow = null;
    if (!clickedButtonId && normalizedInput) {
      triggeredFlow = activeFlows.find(f => {
        if (f.trigger !== 'keyword') return false;
        if (f.keywords.trim().toLowerCase() === normalizedInput) return true;
        const keywordsArray = f.keywords.split(',').map(k => k.trim().toLowerCase());
        return keywordsArray.includes(normalizedInput);
      });
    }

    if (triggeredFlow) {
      await logToDb('INFO', 'FLOW', `Fluxo '${triggeredFlow.name}' disparado por palavra-chave para o contato ${contactId}`);
      await startFlowForContact(freshContact, triggeredFlow, messageData.id);
      return;
    }

    // 4. Se o contato já estiver em execução de um fluxo
    if (freshContact.botMode === 'FLOW' && freshContact.activeFlowId) {
      const currentFlow = activeFlows.find(f => f.id === freshContact.activeFlowId);
      if (currentFlow) {
        const steps = JSON.parse(currentFlow.steps || '[]');
        let currentStep = steps.find(s => s.id === freshContact.currentStepId);
        
        // Se currentStepId estiver vazio, começa da primeira etapa do fluxo
        if (!currentStep && steps.length > 0) {
          currentStep = steps[0];
        }

        if (currentStep) {
          await logToDb('INFO', 'FLOW', `Contato está no fluxo '${currentFlow.name}', etapa atual: '${currentStep.id}'`);
          
          // Check if this is a dynamic Pix amount collection step (IA)
          if (currentStep.pixEnabled && currentStep.pixDynamicAmount) {
            await logToDb('INFO', 'FLOW', `Contato ${contactId} na etapa de Pix Dinâmico '${currentStep.id}'. Tentando extrair valor do texto: "${text}"`);
            const parsedAmount = await extractAmountFromText(text, freshContact.designatedAgentId);
            
            if (parsedAmount && parsedAmount > 0) {
              await logToDb('INFO', 'FLOW', `Valor extraído pela IA: R$ ${parsedAmount.toFixed(2)}. Gerando e enviando cobrança Pix.`);
              const tempStep = {
                ...currentStep,
                pixDynamicAmount: false,
                pixAmount: parsedAmount
              };
              await sendStepResponse(contactId, tempStep, steps, messageData.id, freshContact.connection, false);
              return;
            } else {
              await logToDb('WARN', 'FLOW', `Não foi possível extrair um valor de Pix válido do texto: "${text}". Solicitando nova digitação.`);
              const promptMsg = "Desculpe, não entendi o valor. Por favor, digite o valor que gostaria de pagar (exemplo: R$ 50 ou 150 reais):";
              await sendText(contactId, promptMsg, messageData.id, freshContact.connection);
              await saveOutgoingMessage(`bot_${Date.now()}_pix_retry`, contactId, 'text', '', promptMsg);
              return;
            }
          }

          const options = currentStep.buttons || [];
          let matchedOption = null;

          if (clickedButtonId) {
            matchedOption = options.find(opt => opt.id === clickedButtonId);
          } else {
            matchedOption = options.find(opt => opt.title.trim().toLowerCase() === normalizedInput);
          }

          if (matchedOption) {
            await logToDb('INFO', 'FLOW', `Opção de botão correspondente encontrada: '${matchedOption.title}'. Executando ação: ${matchedOption.action}`);
            await executeFlowOption(freshContact, currentFlow, steps, matchedOption, text, mediaUrl, mimeType, messageData.id);
            return;
          } else {
            // Se a etapa atual tem botões, ignoramos qualquer entrada de texto livre irrelevante
            if (options.length > 0) {
              await logToDb('INFO', 'FLOW', `Entrada irrelevante ("${text}") ignorada para a etapa com botões '${currentStep.id}'. Mantendo o contato na etapa atual.`);
              return;
            }

            // Se houver transição direta configurada para entrada livre / fallback
            if (currentStep.nextStepId) {
              const nextStep = steps.find(s => s.id === currentStep.nextStepId);
              if (nextStep) {
                await logToDb('INFO', 'FLOW', `Entrada de texto livre. Avançando contato para a próxima etapa configurada '${nextStep.id}'`);
                await prisma.contact.update({
                  where: { id: contactId },
                  data: { currentStepId: nextStep.id }
                });
                await sendStepResponse(contactId, nextStep, steps, messageData.id, freshContact.connection);
                return;
              }
            }

            // Entrada livre de texto no fluxo (sem nextStepId). Fallback para IA se o fluxo tiver um agente de IA designado.
            if (freshContact.designatedAgentId) {
              await logToDb('INFO', 'AI', `Entrada de texto livre no fluxo. Acionando fallback híbrido com Gemini AI usando agente designado.`);
              if (messageData.id) {
                await markWhatsAppMessageAsRead(messageData.id, freshContact.connection);
              }
              await sendTypingIndicator(contactId, freshContact.connection);
              try {
                await prisma.contact.update({
                  where: { id: contactId },
                  data: { typingState: 'TYPING' }
                });
              } catch (e) {}
              const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType, freshContact.designatedAgentId);
              
              const flowTriggerRegex = /\[DISPARAR_FLUXO:\s*([^\]]+)\]/i;
              const flowTriggerMatch = aiTextResponse.match(flowTriggerRegex);
              
              if (flowTriggerMatch) {
                const flowId = flowTriggerMatch[1].trim();
                let cleanedResponse = aiTextResponse.replace(flowTriggerRegex, '').trim();
                
                await logToDb('INFO', 'FLOW', `IA Híbrida solicitou disparo/troca automática de fluxo para ID: ${flowId} para ${contactId}`);
                
                const targetFlow = await prisma.flow.findUnique({
                  where: { id: flowId }
                });
                
                if (targetFlow) {
                  if (cleanedResponse) {
                    await sendText(contactId, cleanedResponse, messageData.id, freshContact.connection);
                    await saveOutgoingMessage(`bot_${Date.now()}_ai_guide`, contactId, 'text', '', cleanedResponse);
                  }
                  await startFlowForContact(freshContact, targetFlow, messageData.id);
                  return;
                }
              }

              // Envia resposta da IA
              await sendText(contactId, aiTextResponse, messageData.id, freshContact.connection);
              await saveOutgoingMessage(`bot_${Date.now()}_ai_hybrid`, contactId, 'text', '', aiTextResponse);

              // Repete o menu de opções
              await logToDb('INFO', 'FLOW', `Reenviando opções da etapa '${currentStep.id}' após resposta da IA.`);
              await sendStepResponse(contactId, currentStep, steps, messageData.id, freshContact.connection, true);
              return;
            } else {
              await logToDb('WARN', 'FLOW', `Entrada inválida. Nenhuma opção selecionada e nenhum Agente IA designado para este fluxo. Repetindo etapa.`);
              await sendText(contactId, "Desculpe, não entendi. Por favor, escolha uma das opções abaixo:", messageData.id, freshContact.connection);
              await sendStepResponse(contactId, currentStep, steps, messageData.id, freshContact.connection, true);
              return;
            }
          }
        }
      }
    }

    // 5. Modo IA Puro
    if (freshContact.botMode === 'IA') {
      const agentIdToUse = freshContact.designatedAgentId;
      let agent = null;
      if (agentIdToUse) {
        agent = await prisma.agent.findUnique({ where: { id: agentIdToUse } });
      }
      if (!agent) {
        // Prioritize active agent linked to this connection
        agent = await prisma.agent.findFirst({
          where: { isActive: true, connectionId: freshContact.connectionId || null }
        });
        // Fallback to global active agent
        if (!agent) {
          agent = await prisma.agent.findFirst({
            where: { isActive: true, connectionId: null }
          });
        }
      }

      if (agent) {
        await logToDb('INFO', 'AI', `Contato está em modo IA puro com o agente '${agent.name}'. Chamando Gemini...`);
        if (messageData.id) {
          await markWhatsAppMessageAsRead(messageData.id, freshContact.connection);
        }
        await sendTypingIndicator(contactId, freshContact.connection);
        try {
          await prisma.contact.update({
            where: { id: contactId },
            data: { typingState: 'TYPING' }
          });
        } catch (e) {}
        const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType, agent.id);
        
        const flowTriggerRegex = /\[DISPARAR_FLUXO:\s*([^\]]+)\]/i;
        const flowTriggerMatch = aiTextResponse.match(flowTriggerRegex);
        
        if (flowTriggerMatch) {
          const flowId = flowTriggerMatch[1].trim();
          let cleanedResponse = aiTextResponse.replace(flowTriggerRegex, '').trim();
          
          await logToDb('INFO', 'FLOW', `IA em modo puro solicitou disparo de fluxo para ID: ${flowId} para ${contactId}`);
          
          const targetFlow = await prisma.flow.findUnique({
            where: { id: flowId }
          });
          
          if (targetFlow) {
            if (cleanedResponse) {
              await sendText(contactId, cleanedResponse, messageData.id, freshContact.connection);
              await saveOutgoingMessage(`bot_${Date.now()}_ai_guide`, contactId, 'text', '', cleanedResponse);
            }
            await startFlowForContact(freshContact, targetFlow, messageData.id);
            return;
          }
        }

        await sendBotResponse(contactId, aiTextResponse, messageData.id, freshContact.connection);
        return;
      }
    }

    // 6. Verifica se existe um fluxo de "boas-vindas" padrão
    const welcomeFlow = activeFlows.find(f => f.trigger === 'welcome');
    if (welcomeFlow) {
      await logToDb('INFO', 'FLOW', `Disparando fluxo de boas-vindas padrão (Welcome Flow) para o contato ${contactId}`);
      await startFlowForContact(freshContact, welcomeFlow, messageData.id);
      return;
    }

    // 6.5. Tenta acionar a IA de atendimento inicial/roteador
    let agent = null;
    // Prioriza o agente ativo vinculado a esta conexão
    agent = await prisma.agent.findFirst({
      where: { isActive: true, connectionId: freshContact.connectionId || null }
    });
    // Se não houver, busca o agente ativo global
    if (!agent) {
      agent = await prisma.agent.findFirst({
        where: { isActive: true, connectionId: null }
      });
    }

    if (agent) {
      await logToDb('INFO', 'AI', `Mensagem inicial sem palavra-chave. Acionando IA roteadora '${agent.name}' para guiar o contato ${contactId}`);
      if (messageData.id) {
        await markWhatsAppMessageAsRead(messageData.id, freshContact.connection);
      }
      await sendTypingIndicator(contactId, freshContact.connection);
      try {
        await prisma.contact.update({
          where: { id: contactId },
          data: { typingState: 'TYPING' }
        });
      } catch (e) {}
      
      const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType, agent.id);
      
      const flowTriggerRegex = /\[DISPARAR_FLUXO:\s*([^\]]+)\]/i;
      const flowTriggerMatch = aiTextResponse.match(flowTriggerRegex);
      
      if (flowTriggerMatch) {
        const flowId = flowTriggerMatch[1].trim();
        let cleanedResponse = aiTextResponse.replace(flowTriggerRegex, '').trim();
        
        await logToDb('INFO', 'FLOW', `IA Roteadora solicitou disparo automático do fluxo ID: ${flowId} para ${contactId}`);
        
        const targetFlow = await prisma.flow.findUnique({
          where: { id: flowId }
        });
        
        if (targetFlow) {
          if (cleanedResponse) {
            await sendText(contactId, cleanedResponse, messageData.id, freshContact.connection);
            await saveOutgoingMessage(`bot_${Date.now()}_ai_guide`, contactId, 'text', '', cleanedResponse);
          }
          await startFlowForContact(freshContact, targetFlow, messageData.id);
          return;
        }
      }
      
      // Se não disparou fluxo, envia a resposta normal da IA
      await sendBotResponse(contactId, aiTextResponse, messageData.id, freshContact.connection);
      return;
    }

    // 7. Último Fallback: roteia o contato diretamente para o atendimento MANUAL (transbordo humano)
    // ao invés de usar IA ou retornar erros, conforme solicitado pelo usuário.
    await logToDb('INFO', 'SYSTEM', `Nenhuma palavra-chave ou fluxo ativo para o contato ${contactId}. Realizando transbordo automático para MANUAL.`);
    
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        status: 'MANUAL',
        botMode: 'FLOW',
        currentStepId: '',
        activeFlowId: ''
      }
    });

    // Busca os colaboradores vinculados a esta conexão de WhatsApp
    let targetUserIds = null;
    if (freshContact.connectionId) {
      const connWithUsers = await prisma.whatsAppConnection.findUnique({
        where: { id: freshContact.connectionId },
        include: { users: { select: { id: true } } }
      });
      if (connWithUsers && connWithUsers.users.length > 0) {
        targetUserIds = connWithUsers.users.map(u => u.id);
      }
    }

    // Dispara a notificação push para a equipe de atendimento (segmentada por quem gerencia o número)
    const contactName = freshContact.name || freshContact.profileName || contactId;
    const messageSnippet = text 
      ? (text.length > 60 ? text.substring(0, 60) + '...' : text) 
      : 'Mídia recebida';

    await sendPushNotification(
      `Novo Atendimento: ${contactName} 👤`,
      messageSnippet,
      `/chat?contactId=${contactId}`,
      targetUserIds
    );

  } catch (error) {
    await logToDb('ERROR', 'SYSTEM', `Erro crítico ao processar mensagem do contato ${contactId}: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }
}

async function startFlowForContact(contact, flow, incomingMessageId = null) {
  const steps = JSON.parse(flow.steps || '[]');
  if (steps.length === 0) return;

  const startStep = steps[0];
  await logToDb('INFO', 'FLOW', `Iniciando fluxo '${flow.name}' para o contato ${contact.id}. Etapa inicial: '${startStep.id}'`);

  let updatedPassedFlows = contact.passedFlows || '';
  const flowIdentifier = `${flow.id}:${flow.name}`;
  if (!updatedPassedFlows.includes(flow.id)) {
    updatedPassedFlows = updatedPassedFlows ? `${updatedPassedFlows},${flowIdentifier}` : flowIdentifier;
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      botMode: 'FLOW',
      activeFlowId: flow.id,
      currentStepId: startStep.id,
      designatedAgentId: flow.agentId || null,
      passedFlows: updatedPassedFlows
    }
  });

  await sendStepResponse(contact.id, startStep, steps, incomingMessageId, contact.connection);
}

function getCRC16(data) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < data.length; i++) {
    let b = data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      let bit = ((b >> (7 - j) & 1) === 1);
      let c15 = ((crc >> 15 & 1) === 1);
      crc <<= 1;
      if (c15 ^ bit) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xFFFF;
  let hex = crc.toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function generateStaticPixCode({ key, amount, merchantName, merchantCity, description, txId = '***' }) {
  function formatEMV(id, value) {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  let parts = formatEMV('00', '01');

  let merchantInfo = formatEMV('00', 'br.gov.bcb.pix');
  merchantInfo += formatEMV('01', key.trim());
  if (description) {
    const cleanDesc = description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
    merchantInfo += formatEMV('02', cleanDesc);
  }
  parts += formatEMV('26', merchantInfo);

  parts += formatEMV('52', '0000');
  parts += formatEMV('53', '986');

  if (amount) {
    const amountStr = Number(amount).toFixed(2);
    parts += formatEMV('54', amountStr);
  }

  parts += formatEMV('58', 'BR');

  const cleanName = merchantName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 25).trim();
  parts += formatEMV('59', cleanName || 'Beneficiario');

  const cleanCity = merchantCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 15).trim();
  parts += formatEMV('60', cleanCity || 'SAO PAULO');

  const cleanTxId = txId.replace(/\s+/g, '').slice(0, 25) || '***';
  const additionalData = formatEMV('05', cleanTxId);
  parts += formatEMV('62', additionalData);

  const baseString = parts + '6304';
  const crc = getCRC16(baseString);
  
  return baseString + crc;
}

async function generateGatewayPixCode({ gatewayId, amount, contact, stepId, productId }) {
  const gateway = await prisma.paymentGateway.findUnique({
    where: { id: gatewayId }
  });

  if (!gateway) {
    throw new Error(`Gateway de pagamento não encontrado ID: ${gatewayId}`);
  }

  if (!gateway.isActive) {
    throw new Error(`Gateway de pagamento ${gateway.name} está inativo.`);
  }

  if (gateway.type === 'mercadopago') {
    if (!gateway.apiKey) {
      throw new Error(`Mercado Pago não possui credencial API Key configurada.`);
    }

    const payerName = contact.name || contact.profileName || 'Cliente';
    const nameParts = payerName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'WhatsApp';
    const email = contact.email || `${contact.id.replace(/\D/g, '') || 'cliente'}@xbot-payer.com`;

    const payload = {
      transaction_amount: Number(amount),
      description: `Pagamento Pix - Xbot`,
      payment_method_id: 'pix',
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: '19100000000' // Default testing CPF for transparency checkout
        }
      },
      external_reference: contact.id,
      metadata: {
        contact_id: contact.id,
        flow_id: contact.activeFlowId || '',
        node_id: stepId,
        product_id: productId || ''
      }
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `idem_flow_${Date.now()}_${contact.id}`
      },
      body: JSON.stringify(payload)
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      throw new Error(`Erro Mercado Pago API (${mpRes.status}): ${errText}`);
    }

    const mpPayment = await mpRes.json();
    const pixCode = mpPayment.point_of_interaction?.transaction_data?.qr_code;
    const externalId = String(mpPayment.id);

    if (!pixCode) {
      throw new Error('Código Pix não retornado pela API do Mercado Pago.');
    }

    // Create initial Payment record in DB
    await prisma.payment.create({
      data: {
        gatewayId: gateway.id,
        contactId: contact.id,
        externalId,
        amount: Number(amount),
        status: 'PENDING',
        paymentMethod: 'pix',
        description: `Cobrança Pix via ${gateway.name}`,
        productId: productId || null
      }
    });

    return { pixCode, externalId };
  } else {
    throw new Error(`Integração automática de Pix ainda não implementada para o gateway do tipo '${gateway.type}'.`);
  }
}

export async function sendStepResponse(contactId, step, steps, incomingMessageId = null, connection = null, skipPix = false) {
  let contact = null;
  try {
    contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { connection: true }
    });
  } catch (err) {
    console.error('Error fetching contact in sendStepResponse:', err);
  }

  if (!connection && contact?.connection) {
    connection = contact.connection;
  }

  const extractRealName = (name) => {
    if (!name) return null;
    const normalized = name.trim();
    if (normalized.toLowerCase() === 'cliente whatsapp' || normalized.toLowerCase() === 'cliente' || normalized.toLowerCase() === 'lead') {
      return null;
    }
    // Keeps only alphanumeric characters / standard name letters
    const onlyLetters = normalized.replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]/g, '').trim();
    const words = onlyLetters.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return null;
    const firstName = words[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  const replacePlaceholders = (val) => {
    if (!val || !contact) return val || '';
    let rawName = contact.name || contact.profileName || '';
    if (rawName.toLowerCase() === 'cliente whatsapp' && contact.profileName) {
      rawName = contact.profileName;
    }
    let firstName = rawName.trim().split(/\s+/)[0] || '';
    if (firstName.toLowerCase() === 'cliente' || firstName.toLowerCase() === 'lead') {
      firstName = '';
    }
    const nomeReplacement = firstName || 'cliente';
    const realName = extractRealName(rawName);

    let result = val.replace(/\{nome\}/g, nomeReplacement);
    if (realName) {
      result = result.replace(/\{nome_real\}/g, realName);
    } else {
      // Clean up dynamic commas and spaces if name is rejected
      result = result.replace(/,\s*\{nome_real\}/gi, '');
      result = result.replace(/\{nome_real\}\s*,/g, '');
      result = result.replace(/\{nome_real\}/g, '');
      result = result.replace(/\s+/g, ' ');
      result = result.replace(/\s+([.,!?])/g, '$1');
    }
    return result.trim();
  };

  const text = replacePlaceholders(step.text || '');
  const options = (step.buttons || []).map(opt => ({
    ...opt,
    title: opt.title ? replacePlaceholders(opt.title) : '',
    url: opt.url ? replacePlaceholders(opt.url) : ''
  }));
  const media = step.media ? {
    ...step.media,
    caption: replacePlaceholders(step.media.caption || ''),
    url: step.media.type === 'link' ? replacePlaceholders(step.media.url || '') : step.media.url
  } : null;

  // Mark message as read and start typing indicator
  if (incomingMessageId) {
    await markWhatsAppMessageAsRead(incomingMessageId, connection);
  }
  await sendTypingIndicator(contactId, connection);

  // Typing delay simulation
  const isAudioStep = media && media.type === 'audio';
  let delay = step.delaySeconds || 0;
  if (isAudioStep && delay === 0) {
    // If it's an audio step and no delay is set, use a natural default delay of 4 seconds to simulate recording
    delay = 4;
  }

  if (delay > 0) {
    try {
      await logToDb('INFO', 'FLOW', `Simulando atraso de digitação/gravação de ${delay}s para o contato ${contactId} na etapa '${step.id}'`);
      try {
        await prisma.contact.update({
          where: { id: contactId },
          data: { typingState: isAudioStep ? 'RECORDING' : 'TYPING' }
        });
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    } catch (err) {
      console.error('Error simulating typing delay:', err);
    }
  }

  let quoteMessageId = incomingMessageId;

  // Send media first if present
  if (media && media.type && media.url) {
    try {
      const absoluteMediaUrl = await getAbsoluteUrl(media.url);
      await logToDb('INFO', 'API', `Enviando mídia do tipo '${media.type}' para ${contactId} na etapa '${step.id}': ${absoluteMediaUrl}`);
      const caption = media.caption || '';

      if (media.type === 'image') {
        await sendImage(contactId, absoluteMediaUrl, caption, quoteMessageId, connection);
        await saveOutgoingMessage(`bot_${Date.now()}_media_img`, contactId, 'image', media.url, caption);
      } else if (media.type === 'video') {
        await sendVideo(contactId, absoluteMediaUrl, caption, quoteMessageId, connection);
        await saveOutgoingMessage(`bot_${Date.now()}_media_vid`, contactId, 'video', media.url, caption);
      } else if (media.type === 'audio') {
        await sendAudio(contactId, absoluteMediaUrl, quoteMessageId, connection);
        await saveOutgoingMessage(`bot_${Date.now()}_media_aud`, contactId, 'audio', media.url, 'Áudio do fluxo');
      } else if (media.type === 'document') {
        const originalFilename = getFilenameFromUrl(media.url, 'documento');
        await sendDocument(contactId, absoluteMediaUrl, originalFilename, caption, quoteMessageId, connection);
        await saveOutgoingMessage(`bot_${Date.now()}_media_doc`, contactId, 'document', media.url, caption);
      } else if (media.type === 'link') {
        // For links, prepend to the text message
        const linkText = media.url;
        const fullText = text ? `${linkText}\n\n${text}` : linkText;
        // Will be sent below with buttons or as plain text
        // Skip sending separately, instead modify text below
      }
      quoteMessageId = null;
    } catch (err) {
      await logToDb('WARN', 'API', `Falha ao enviar mídia na etapa '${step.id}': ${err.message}`);
    }
  }

  // Build text content, optionally prepending link
  let finalText = text;
  if (media && media.type === 'link' && media.url) {
    finalText = text ? `🔗 ${media.url}\n\n${text}` : `🔗 ${media.url}`;
  }

  // WhatsApp Cloud API interactive messages require a non-empty body text.
  if (options.length > 0 && !finalText) {
    finalText = 'Escolha uma opção:';
  }

  const urlButton = options.find(opt => opt.action === 'open_url');

  if (urlButton) {
    try {
      await logToDb('INFO', 'API', `Enviando botão de link para ${contactId} na etapa '${step.id}'`);
      await sendCTAUrlButton(contactId, finalText, urlButton.title, urlButton.url || '', quoteMessageId, connection);
      await saveOutgoingMessage(`bot_${Date.now()}_cta`, contactId, 'text', '', `${finalText} [Link: ${urlButton.title} - ${urlButton.url}]`);
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send WhatsApp buttons, falling back to text options', err);
      const fallbackText = `${finalText}\n\n🔗 *${urlButton.title}*: ${urlButton.url}`;
      await sendText(contactId, fallbackText, quoteMessageId, connection);
      await saveOutgoingMessage(`bot_${Date.now()}_text_fallback`, contactId, 'text', '', fallbackText);
      quoteMessageId = null;
    }
  } else if (options.length > 0) {
    const formattedButtons = options.slice(0, 3).map(opt => ({
      id: opt.id,
      title: opt.title
    }));

    try {
      await logToDb('INFO', 'API', `Enviando botões interativos para ${contactId} na etapa '${step.id}'`);
      await sendButtons(contactId, finalText, formattedButtons, quoteMessageId, connection);
      await saveOutgoingMessage(`bot_${Date.now()}_buttons`, contactId, 'text', '', `${finalText} [Botões: ${formattedButtons.map(b => b.title).join(', ')}]`);
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send WhatsApp buttons, falling back to text options', err);
      let fallbackText = finalText + '\n\n';
      formattedButtons.forEach((btn, idx) => {
        fallbackText += `*${idx + 1}*. ${btn.title}\n`;
      });
      await sendText(contactId, fallbackText, quoteMessageId, connection);
      await saveOutgoingMessage(`bot_${Date.now()}_text_fallback`, contactId, 'text', '', fallbackText);
      quoteMessageId = null;
    }
  } else if (finalText) {
    await logToDb('INFO', 'API', `Enviando texto simples para ${contactId} na etapa '${step.id}'`);
    await sendText(contactId, finalText, quoteMessageId, connection);
    await saveOutgoingMessage(`bot_${Date.now()}_text`, contactId, 'text', '', finalText);
    quoteMessageId = null;
  }

  // Send Pix billing request if enabled
  const isGatewayPix = !skipPix && step.pixEnabled && !step.pixDynamicAmount && step.pixGatewayEnabled && step.pixGatewayId && step.pixAmount > 0;
  const isStaticPix = !skipPix && step.pixEnabled && !step.pixDynamicAmount && !step.pixGatewayEnabled && step.pixKey && step.pixAmount > 0;

  if (isGatewayPix || isStaticPix) {
    try {
      const amount = parseFloat(step.pixAmount);
      let pixCode = '';
      let referenceId = `pix_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      let gatewayName = 'Pix';

      if (isGatewayPix) {
        await logToDb('INFO', 'FLOW', `Gerando cobrança Pix dinâmica via Gateway ID '${step.pixGatewayId}' de R$ ${amount.toFixed(2)} para ${contactId}`);
        const result = await generateGatewayPixCode({
          gatewayId: step.pixGatewayId,
          amount: amount,
          contact: contact,
          stepId: step.id,
          productId: step.pixProductId || null
        });
        pixCode = result.pixCode;
        referenceId = result.externalId;
        gatewayName = 'Gateway';
      } else {
        await logToDb('INFO', 'FLOW', `Gerando cobrança Pix estática de R$ ${amount.toFixed(2)} para ${contactId}`);
        pixCode = generateStaticPixCode({
          key: step.pixKey,
          amount: amount,
          merchantName: step.pixMerchantName || 'Beneficiario',
          merchantCity: step.pixMerchantCity || 'SAO PAULO',
          description: step.pixDescription || 'Pagamento'
        });
      }

      const pixMerchantName = step.pixMerchantName || connection?.name || 'Beneficiario';
      let pixKey = isGatewayPix ? '123e4567-e89b-12d3-a456-426614174000' : (step.pixKey || '');
      let pixKeyType = (isGatewayPix ? 'EVP' : (step.pixKeyType || 'EVP')).toUpperCase();

      if (pixKeyType === 'CNPJ' || pixKeyType === 'CPF') {
        pixKey = pixKey.replace(/\D/g, '');
      } else if (pixKeyType === 'PHONE') {
        if (!pixKey.startsWith('+')) {
          pixKey = '+' + pixKey.replace(/\D/g, '');
        }
      }

      const amountInCents = Math.round(amount * 100);
      const bodyText = `${pixMerchantName} solicitou um pagamento.`;

      let sentInteractive = false;
      try {
        await logToDb('INFO', 'API', `Enviando solicitação interativa de Pix para ${contactId}`);
        const response = await sendPixPaymentRequest(
          contactId,
          amountInCents,
          pixCode,
          pixMerchantName,
          pixKey,
          pixKeyType,
          referenceId,
          bodyText,
          connection
        );
        if (response && response.messages && response.messages.length > 0) {
          await saveOutgoingMessage(`bot_${Date.now()}_pix_req`, contactId, 'interactive', '', `Cobrança Pix R$ ${amount.toFixed(2)} [Código Pix Copia e Cola gerado]`);
          sentInteractive = true;
        }
      } catch (err) {
        await logToDb('WARN', 'API', `Falha ao enviar a solicitação interativa de pagamento Pix do WhatsApp: ${err.message}. Enviando apenas texto de fallback.`);
      }

      if (!sentInteractive) {
        const pixMsgText = `*Código Pix Copia e Cola* (Toque para copiar):\n\n\`\`\`${pixCode}\`\`\``;
        await sendText(contactId, pixMsgText, quoteMessageId, connection);
        await saveOutgoingMessage(`bot_${Date.now()}_pix_code`, contactId, 'text', '', `Copia e Cola: ${pixCode}`);
      }
      quoteMessageId = null;

    } catch (pixErr) {
      await logToDb('ERROR', 'FLOW', `Erro ao gerar/enviar cobrança Pix na etapa '${step.id}': ${pixErr.message}`, {
        error: pixErr.message,
        stack: pixErr.stack
      });
      // Fallback message to notify client about billing failure
      await sendText(contactId, `Desculpe, ocorreu um erro ao gerar a sua cobrança Pix. Por favor, tente novamente mais tarde.`, quoteMessageId, connection);
    }
  }

  // Auto-advance if this step has no buttons, nextStepId is set, and Pix is NOT enabled (or not waiting for payment)
  if (options.length === 0 && step.nextStepId && steps && !step.pixEnabled) {
    const nextStep = steps.find(s => s.id === step.nextStepId);
    if (nextStep && nextStep.id !== step.id) {
      await logToDb('INFO', 'FLOW', `Auto-avançando etapa sem botões de '${step.id}' para '${nextStep.id}'`);
      await prisma.contact.update({
        where: { id: contactId },
        data: { currentStepId: nextStep.id }
      });
      await sendStepResponse(contactId, nextStep, steps, quoteMessageId, connection);
    }
  }

  // Reset typing state to IDLE after step response completes
  try {
    await prisma.contact.update({
      where: { id: contactId },
      data: { typingState: 'IDLE' }
    });
  } catch (e) {}
}

async function executeFlowOption(contact, flow, steps, option, groupedText, latestMediaUrl, latestMimeType, incomingMessageId = null) {
  if (option.action === 'go_to_step') {
    const nextStep = steps.find(s => s.id === option.targetStepId);
    if (nextStep) {
      await logToDb('INFO', 'FLOW', `Avançando contato ${contact.id} para a etapa '${nextStep.id}'`);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { currentStepId: nextStep.id }
      });
      await sendStepResponse(contact.id, nextStep, steps, incomingMessageId, contact.connection);
    } else {
      await logToDb('WARN', 'FLOW', `A etapa de destino '${option.targetStepId}' não foi encontrada. Finalizando fluxo.`);
      await sendText(contact.id, "Fluxo finalizado.", incomingMessageId, contact.connection);
      await resetContactFlow(contact.id);
    }
  } else if (option.action === 'transfer_to_ia') {
    await logToDb('INFO', 'SYSTEM', `Transferindo contato ${contact.id} para modo IA.`);
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        botMode: 'IA',
        currentStepId: '',
        activeFlowId: ''
      }
    });

    const agentIdToUse = contact.designatedAgentId;
    let agent = null;
    if (agentIdToUse) {
      agent = await prisma.agent.findUnique({ where: { id: agentIdToUse } });
    }
    if (!agent) {
      agent = await prisma.agent.findFirst({ where: { isActive: true } });
    }

    if (agent) {
      if (incomingMessageId) {
        await markWhatsAppMessageAsRead(incomingMessageId, contact.connection);
      }
      await sendTypingIndicator(contact.id, contact.connection);
      try {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { typingState: 'TYPING' }
        });
      } catch (e) {}
      const aiTextResponse = await generateAIResponse(contact.id, groupedText, latestMediaUrl, latestMimeType, agent.id);
      await sendBotResponse(contact.id, aiTextResponse, incomingMessageId, contact.connection);
    } else {
      await sendText(contact.id, "Nossa assistente virtual está offline no momento. Como posso te ajudar?", incomingMessageId, contact.connection);
    }
  } else if (option.action === 'transfer_to_human') {
    await logToDb('INFO', 'SYSTEM', `Efetuando transbordo do contato ${contact.id} para modo HUMAN (atendimento humano manual).`);
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        status: 'MANUAL',
        botMode: 'FLOW',
        currentStepId: '',
        activeFlowId: ''
      }
    });

    const transferMessage = option.text || "Entendido. Estou transferindo sua conversa para um atendente humano. Aguarde um instante.";
    await sendText(contact.id, transferMessage, incomingMessageId, contact.connection);
    await saveOutgoingMessage(`bot_${Date.now()}_human_transfer`, contact.id, 'text', '', transferMessage);

    // Envia notificação push para os operadores indicando o transbordo
    const contactName = contact.name || contact.profileName || contact.id;
    await sendPushNotification(
      `Solicitação de Atendimento: ${contactName} 👤`,
      `Cliente solicitou atendimento humano no fluxo.`,
      `/chat?contactId=${contact.id}`
    );
  } else if (option.action === 'end_flow') {
    await logToDb('INFO', 'SYSTEM', `Finalizando fluxo para o contato ${contact.id}`);
    const endMessage = option.text || "Atendimento finalizado. Obrigado!";
    await sendText(contact.id, endMessage, incomingMessageId, contact.connection);
    await saveOutgoingMessage(`bot_${Date.now()}_end_flow`, contact.id, 'text', '', endMessage);
    await resetContactFlow(contact.id);
  }
}

async function resetContactFlow(contactId) {
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      botMode: 'FLOW',
      currentStepId: '',
      activeFlowId: ''
    }
  });
}

async function sendBotResponse(contactId, aiTextResponse, incomingMessageId = null, connection = null) {
  let textToSend = aiTextResponse;
  let audioUrlToSend = null;
  let imageUrlToSend = null;
  let docUrlToSend = null;
  let quoteMessageId = incomingMessageId;

  const audioRegex = /\[ENVIAR\s+AUDIO:\s*([^\]]+)\]/i;
  const audioMatch = textToSend.match(audioRegex);
  if (audioMatch) {
    try {
      await prisma.contact.update({
        where: { id: contactId },
        data: { typingState: 'RECORDING' }
      });
    } catch (e) {}

    // Send typing indicator to the WhatsApp contact
    await sendTypingIndicator(contactId, connection);

    const audioScript = audioMatch[1].trim();
    // Resolve designated agent to use specific TTS credentials
    const contactObj = await prisma.contact.findUnique({ where: { id: contactId } });
    const agentId = contactObj?.designatedAgentId || null;
    audioUrlToSend = await textToSpeech(audioScript, agentId);
    textToSend = textToSend.replace(audioRegex, '').trim();
    if (!audioUrlToSend) {
      textToSend = (textToSend ? textToSend + '\n\n' : '') + audioScript;
    }

    // Simulate natural recording delay based on script length
    const charCount = audioScript.length;
    const recordingDelay = Math.min(Math.max(Math.round(charCount / 15), 3), 8);
    await logToDb('INFO', 'AI', `Simulando atraso de gravação de áudio de ${recordingDelay}s para o contato ${contactId}`);
    await new Promise(resolve => setTimeout(resolve, recordingDelay * 1000));
  }

  const imageRegex = /\[ENVIAR\s+IMAGEM:\s*([^\]]+)\]/i;
  const imageMatch = textToSend.match(imageRegex);
  if (imageMatch) {
    imageUrlToSend = imageMatch[1].trim();
    textToSend = textToSend.replace(imageRegex, '').trim();
  }

  const docRegex = /\[ENVIAR\s+DOCUMENTO:\s*([^\]]+)\]/i;
  const docMatch = textToSend.match(docRegex);
  if (docMatch) {
    docUrlToSend = docMatch[1].trim();
    textToSend = textToSend.replace(docRegex, '').trim();
  }

  textToSend = textToSend.trim();
  const botMessageId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (audioUrlToSend) {
    const absoluteAudioUrl = await getAbsoluteUrl(audioUrlToSend);
    try {
      await sendAudio(contactId, absoluteAudioUrl, quoteMessageId, connection);
      await saveOutgoingMessage(botMessageId, contactId, 'audio', audioUrlToSend, 'Mensagem de voz');
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send audio to WhatsApp:', err);
      textToSend = textToSend || 'Mensagem de voz';
    }
  }

  if (imageUrlToSend) {
    try {
      const absoluteImgUrl = await getAbsoluteUrl(imageUrlToSend);
      await sendImage(contactId, absoluteImgUrl, textToSend, quoteMessageId, connection);
      await saveOutgoingMessage(botMessageId + '_img', contactId, 'image', imageUrlToSend, textToSend);
      textToSend = '';
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send image to WhatsApp:', err);
    }
  }

  if (docUrlToSend) {
    try {
      const absoluteDocUrl = await getAbsoluteUrl(docUrlToSend);
      const originalFilename = getFilenameFromUrl(docUrlToSend, 'documento');
      await sendDocument(contactId, absoluteDocUrl, originalFilename, textToSend, quoteMessageId, connection);
      await saveOutgoingMessage(botMessageId + '_doc', contactId, 'document', docUrlToSend, textToSend);
      textToSend = '';
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send document to WhatsApp:', err);
    }
  }

  if (textToSend) {
    try {
      await sendText(contactId, textToSend, quoteMessageId, connection);
      await saveOutgoingMessage(botMessageId, contactId, 'text', '', textToSend);
      quoteMessageId = null;
    } catch (err) {
      console.error('Failed to send text to WhatsApp:', err);
    }
  }

  // Reset typing state to IDLE after response completes
  try {
    await prisma.contact.update({
      where: { id: contactId },
      data: { typingState: 'IDLE' }
    });
  } catch (e) {}
}

async function saveOutgoingMessage(id, contactId, type, mediaUrl = '', content = '') {
  await prisma.message.create({
    data: {
      id,
      contactId,
      direction: 'OUTGOING',
      senderType: 'BOT',
      type,
      content,
      mediaUrl,
      status: 'sent'
    }
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastInteraction: new Date() }
  });
}

async function getAbsoluteUrl(urlPath) {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath;
  }
  
  // Try fetching publicBaseUrl from database Settings first
  try {
    const settings = await getCachedSettings();
    if (settings && settings.publicBaseUrl) {
      return `${settings.publicBaseUrl}${urlPath}`;
    }
  } catch (err) {
    console.error('Error fetching publicBaseUrl from Settings:', err);
  }

  // Try NEXT_PUBLIC_BASE_URL first, then Vercel project production URL, then Vercel deployment URL, then fallback to domain.com
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'https://domain.com';
  return `${baseUrl}${urlPath}`;
}
