import { prisma } from './prisma';
import { generateAIResponse } from './gemini';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo, sendButtons } from './whatsapp';
import { textToSpeech } from './tts';
import { logToDb } from './log';
import { sendPushNotification } from './push';

// Removida a fila de debounce em memória que causava timeouts e instabilidade na Vercel

export async function enqueueMessage(contactId, messageData) {
  try {
    await logToDb('INFO', 'SYSTEM', `Mensagem recebida do contato ${contactId}. Tipo: ${messageData.type}`, { content: messageData.content });

    // 1. Garante que o contato existe no banco de dados
    let contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      await logToDb('INFO', 'DATABASE', `Criando novo contato para o número: ${contactId}`);
      contact = await prisma.contact.create({
        data: {
          id: contactId,
          name: messageData.name || messageData.profileName || 'Cliente WhatsApp',
          profileName: messageData.profileName || '',
          status: 'AUTO'
        }
      });
    } else if (messageData.profileName && contact.profileName !== messageData.profileName) {
      await logToDb('INFO', 'DATABASE', `Atualizando nome de perfil do contato ${contactId}: ${messageData.profileName}`);
      contact = await prisma.contact.update({
        where: { id: contactId },
        data: { profileName: messageData.profileName }
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
        timestamp: new Date(messageData.timestamp)
      }
    });

    // Atualiza a última interação do contato
    contact = await prisma.contact.update({
      where: { id: contactId },
      data: { lastInteraction: new Date() }
    });

    // 3. Verifica se o contato está em modo MANUAL (atendimento humano)
    if (contact.status === 'MANUAL') {
      await logToDb('INFO', 'SYSTEM', `Contato ${contactId} está em modo MANUAL. Resposta automática pausada.`);
      
      // Envia notificação push para os administradores/operadores
      const contactName = contact.name || contact.profileName || contactId;
      const messageSnippet = messageData.content 
        ? (messageData.content.length > 60 ? messageData.content.substring(0, 60) + '...' : messageData.content) 
        : 'Mídia recebida';

      await sendPushNotification(
        `Atendimento Manual: ${contactName} 💬`,
        messageSnippet,
        `/chat?contactId=${contactId}`
      );
      return;
    }

    // 4. Processa a mensagem de forma síncrona e imediata
    await processSingleMessage(contact, messageData);

  } catch (err) {
    await logToDb('ERROR', 'SYSTEM', `Erro ao enfileirar mensagem para o contato ${contactId}: ${err.message}`, {
      error: err.message,
      stack: err.stack
    });
  }
}

async function processSingleMessage(contact, messageData) {
  const contactId = contact.id;
  await logToDb('INFO', 'FLOW', `Iniciando processamento síncrono para o contato ${contactId}`);

  try {
    // Busca o estado mais atual do contato no banco
    const freshContact = await prisma.contact.findUnique({ where: { id: contactId } });
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

    // 2. Carrega os fluxos ativos
    const activeFlows = await prisma.flow.findMany({ where: { isActive: true } });

    // 3. Verifica se o usuário digitou uma palavra-chave para iniciar um NOVO fluxo
    let triggeredFlow = null;
    if (!clickedButtonId && normalizedInput) {
      triggeredFlow = activeFlows.find(f => {
        if (f.trigger !== 'keyword') return false;
        const keywordsArray = f.keywords.split(',').map(k => k.trim().toLowerCase());
        return keywordsArray.includes(normalizedInput);
      });
    }

    if (triggeredFlow) {
      await logToDb('INFO', 'FLOW', `Fluxo '${triggeredFlow.name}' disparado por palavra-chave para o contato ${contactId}`);
      await startFlowForContact(freshContact, triggeredFlow);
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
          const options = currentStep.buttons || [];
          let matchedOption = null;

          if (clickedButtonId) {
            matchedOption = options.find(opt => opt.id === clickedButtonId);
          } else {
            matchedOption = options.find(opt => opt.title.trim().toLowerCase() === normalizedInput);
          }

          if (matchedOption) {
            await logToDb('INFO', 'FLOW', `Opção de botão correspondente encontrada: '${matchedOption.title}'. Executando ação: ${matchedOption.action}`);
            await executeFlowOption(freshContact, currentFlow, steps, matchedOption, text, mediaUrl, mimeType);
            return;
          } else {
            // Entrada livre de texto no fluxo. Fallback para IA se configurado, senão repete a etapa.
            const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });
            if (activeAgent) {
              await logToDb('INFO', 'AI', `Entrada de texto livre no fluxo. Acionando fallback híbrido com Gemini AI.`);
              const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType);
              
              // Envia resposta da IA
              await sendText(contactId, aiTextResponse);
              await saveOutgoingMessage(`bot_${Date.now()}_ai_hybrid`, contactId, 'text', '', aiTextResponse);

              // Repete o menu de opções
              await logToDb('INFO', 'FLOW', `Reenviando opções da etapa '${currentStep.id}' após resposta da IA.`);
              await sendStepResponse(contactId, currentStep);
              return;
            } else {
              await logToDb('WARN', 'FLOW', `Entrada inválida. Nenhuma opção selecionada e nenhuma IA configurada. Repetindo etapa.`);
              await sendText(contactId, "Desculpe, opção inválida. Por favor, escolha uma das opções abaixo:");
              await sendStepResponse(contactId, currentStep);
              return;
            }
          }
        }
      }
    }

    // 5. Modo IA Puro
    const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });
    if (freshContact.botMode === 'IA' && activeAgent) {
      await logToDb('INFO', 'AI', `Contato está em modo IA puro. Chamando Gemini...`);
      const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType);
      await sendBotResponse(contactId, aiTextResponse);
      return;
    }

    // 6. Verifica se existe um fluxo de "boas-vindas" padrão
    const welcomeFlow = activeFlows.find(f => f.trigger === 'welcome');
    if (welcomeFlow) {
      await logToDb('INFO', 'FLOW', `Disparando fluxo de boas-vindas padrão (Welcome Flow) para o contato ${contactId}`);
      await startFlowForContact(freshContact, welcomeFlow);
      return;
    }

    // 7. Último Fallback: roteia para o Agente de IA
    if (activeAgent) {
      await logToDb('INFO', 'AI', `Sem fluxo ativo. Definindo contato ${contactId} para modo IA e chamando Gemini.`);
      await prisma.contact.update({
        where: { id: contactId },
        data: { botMode: 'IA' }
      });
      const aiTextResponse = await generateAIResponse(contactId, text, mediaUrl, mimeType);
      await sendBotResponse(contactId, aiTextResponse);
    } else {
      await logToDb('WARN', 'SYSTEM', 'Nenhuma persona de IA ativa ou fluxo de chatbot encontrado para responder à mensagem.');
    }

  } catch (error) {
    await logToDb('ERROR', 'SYSTEM', `Erro crítico ao processar mensagem do contato ${contactId}: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }
}

async function startFlowForContact(contact, flow) {
  const steps = JSON.parse(flow.steps || '[]');
  if (steps.length === 0) return;

  const startStep = steps[0];
  await logToDb('INFO', 'FLOW', `Iniciando fluxo '${flow.name}' para o contato ${contact.id}. Etapa inicial: '${startStep.id}'`);

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      botMode: 'FLOW',
      activeFlowId: flow.id,
      currentStepId: startStep.id
    }
  });

  await sendStepResponse(contact.id, startStep);
}

async function sendStepResponse(contactId, step) {
  const text = step.text || '';
  const options = step.buttons || [];
  const media = step.media || null;

  // Send media first if present
  if (media && media.type && media.url) {
    try {
      await logToDb('INFO', 'API', `Enviando mídia do tipo '${media.type}' para ${contactId} na etapa '${step.id}'`);
      const caption = media.caption || '';

      if (media.type === 'image') {
        await sendImage(contactId, media.url, caption);
        await saveOutgoingMessage(`bot_${Date.now()}_media_img`, contactId, 'image', media.url, caption);
      } else if (media.type === 'video') {
        await sendVideo(contactId, media.url, caption);
        await saveOutgoingMessage(`bot_${Date.now()}_media_vid`, contactId, 'video', media.url, caption);
      } else if (media.type === 'audio') {
        await sendAudio(contactId, media.url);
        await saveOutgoingMessage(`bot_${Date.now()}_media_aud`, contactId, 'audio', media.url, 'Áudio do fluxo');
      } else if (media.type === 'document') {
        await sendDocument(contactId, media.url, 'documento', caption);
        await saveOutgoingMessage(`bot_${Date.now()}_media_doc`, contactId, 'document', media.url, caption);
      } else if (media.type === 'link') {
        // For links, prepend to the text message
        const linkText = media.url;
        const fullText = text ? `${linkText}\n\n${text}` : linkText;
        // Will be sent below with buttons or as plain text
        // Skip sending separately, instead modify text below
      }
    } catch (err) {
      await logToDb('WARN', 'API', `Falha ao enviar mídia na etapa '${step.id}': ${err.message}`);
    }
  }

  // Build text content, optionally prepending link
  let finalText = text;
  if (media && media.type === 'link' && media.url) {
    finalText = text ? `🔗 ${media.url}\n\n${text}` : `🔗 ${media.url}`;
  }

  if (options.length > 0) {
    const formattedButtons = options.slice(0, 3).map(opt => ({
      id: opt.id,
      title: opt.title
    }));

    try {
      await logToDb('INFO', 'API', `Enviando botões interativos para ${contactId} na etapa '${step.id}'`);
      await sendButtons(contactId, finalText, formattedButtons);
      await saveOutgoingMessage(`bot_${Date.now()}_buttons`, contactId, 'text', '', `${finalText} [Botões: ${formattedButtons.map(b => b.title).join(', ')}]`);
    } catch (err) {
      console.error('Failed to send WhatsApp buttons, falling back to text options', err);
      let fallbackText = finalText + '\n\n';
      formattedButtons.forEach((btn, idx) => {
        fallbackText += `*${idx + 1}*. ${btn.title}\n`;
      });
      await sendText(contactId, fallbackText);
      await saveOutgoingMessage(`bot_${Date.now()}_text_fallback`, contactId, 'text', '', fallbackText);
    }
  } else if (finalText) {
    await logToDb('INFO', 'API', `Enviando texto simples para ${contactId} na etapa '${step.id}'`);
    await sendText(contactId, finalText);
    await saveOutgoingMessage(`bot_${Date.now()}_text`, contactId, 'text', '', finalText);
  }
}

async function executeFlowOption(contact, flow, steps, option, groupedText, latestMediaUrl, latestMimeType) {
  if (option.action === 'go_to_step') {
    const nextStep = steps.find(s => s.id === option.targetStepId);
    if (nextStep) {
      await logToDb('INFO', 'FLOW', `Avançando contato ${contact.id} para a etapa '${nextStep.id}'`);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { currentStepId: nextStep.id }
      });
      await sendStepResponse(contact.id, nextStep);
    } else {
      await logToDb('WARN', 'FLOW', `A etapa de destino '${option.targetStepId}' não foi encontrada. Finalizando fluxo.`);
      await sendText(contact.id, "Fluxo finalizado.");
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

    const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });
    if (activeAgent) {
      const aiTextResponse = await generateAIResponse(contact.id, groupedText, latestMediaUrl, latestMimeType);
      await sendBotResponse(contact.id, aiTextResponse);
    } else {
      await sendText(contact.id, "Nossa assistente virtual está offline no momento. Como posso te ajudar?");
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
    await sendText(contact.id, transferMessage);
    await saveOutgoingMessage(`bot_${Date.now()}_human_transfer`, contact.id, 'text', '', transferMessage);

    // Envia notificação push para os operadores indicando o transbordo
    const contactName = contact.name || contact.profileName || contact.id;
    await sendPushNotification(
      `Solicitação de Atendimento: ${contactName} 👤`,
      `Cliente solicitou atendimento humano no fluxo.`,
      `/chat?contactId=${contact.id}`
    );
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

async function sendBotResponse(contactId, aiTextResponse) {
  let textToSend = aiTextResponse;
  let audioUrlToSend = null;
  let imageUrlToSend = null;
  let docUrlToSend = null;

  const audioRegex = /\[ENVIAR\s+AUDIO:\s*([^\]]+)\]/i;
  const audioMatch = textToSend.match(audioRegex);
  if (audioMatch) {
    const audioScript = audioMatch[1].trim();
    audioUrlToSend = await textToSpeech(audioScript);
    textToSend = textToSend.replace(audioRegex, '').trim();
    if (!audioUrlToSend) {
      textToSend = (textToSend ? textToSend + '\n\n' : '') + audioScript;
    }
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://domain.com';
    const absoluteAudioUrl = `${baseUrl}${audioUrlToSend}`;
    try {
      await sendAudio(contactId, absoluteAudioUrl);
      await saveOutgoingMessage(botMessageId, contactId, 'audio', audioUrlToSend, 'Mensagem de voz');
    } catch (err) {
      console.error('Failed to send audio to WhatsApp:', err);
      textToSend = textToSend || 'Mensagem de voz';
    }
  }

  if (imageUrlToSend) {
    try {
      await sendImage(contactId, imageUrlToSend, textToSend);
      await saveOutgoingMessage(botMessageId + '_img', contactId, 'image', imageUrlToSend, textToSend);
      textToSend = '';
    } catch (err) {
      console.error('Failed to send image to WhatsApp:', err);
    }
  }

  if (docUrlToSend) {
    try {
      await sendDocument(contactId, docUrlToSend, 'documento', textToSend);
      await saveOutgoingMessage(botMessageId + '_doc', contactId, 'document', docUrlToSend, textToSend);
      textToSend = '';
    } catch (err) {
      console.error('Failed to send document to WhatsApp:', err);
    }
  }

  if (textToSend) {
    try {
      await sendText(contactId, textToSend);
      await saveOutgoingMessage(botMessageId, contactId, 'text', '', textToSend);
    } catch (err) {
      console.error('Failed to send text to WhatsApp:', err);
    }
  }
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
      mediaUrl
    }
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: { lastInteraction: new Date() }
  });
}
