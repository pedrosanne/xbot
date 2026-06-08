import { prisma } from './prisma';
import { generateAIResponse } from './gemini';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo, sendButtons } from './whatsapp';
import { textToSpeech } from './tts';
import { logToDb } from './log';

// Global queue storage to survive Next.js dev server hot-reloads
const globalForQueue = global;
if (!globalForQueue.messageQueues) {
  globalForQueue.messageQueues = new Map(); // contactId -> { messages: [], timeout: null }
}

const queues = globalForQueue.messageQueues;
const DEBOUNCE_MS = 2500; // Wait 2.5 seconds to group consecutive messages

export async function enqueueMessage(contactId, messageData) {
  try {
    await logToDb('INFO', 'SYSTEM', `Mensagem recebida do contato ${contactId}. Tipo: ${messageData.type}`, { content: messageData.content });

    // 1. Ensure contact exists in database
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
      await prisma.contact.update({
        where: { id: contactId },
        data: { profileName: messageData.profileName }
      });
    }

    // 2. Save incoming message to DB
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

    // Update contact's last interaction
    await prisma.contact.update({
      where: { id: contactId },
      data: { lastInteraction: new Date() }
    });

    // 3. Check if contact is in MANUAL mode (human takeover)
    if (contact.status === 'MANUAL') {
      await logToDb('INFO', 'SYSTEM', `Contato ${contactId} está em modo MANUAL. Resposta automática pausada.`);
      return;
    }

    // 4. Enqueue for processing
    if (!queues.has(contactId)) {
      queues.set(contactId, { messages: [], timeout: null });
    }

    const contactQueue = queues.get(contactId);
    contactQueue.messages.push(messageData);

    // Clear previous timeout and set a new one (debounce)
    if (contactQueue.timeout) {
      clearTimeout(contactQueue.timeout);
    }

    contactQueue.timeout = setTimeout(() => {
      processQueue(contactId);
    }, DEBOUNCE_MS);

  } catch (err) {
    await logToDb('ERROR', 'SYSTEM', `Erro ao enfileirar mensagem para o contato ${contactId}: ${err.message}`, {
      error: err.message,
      stack: err.stack
    });
  }
}

async function processQueue(contactId) {
  const contactQueue = queues.get(contactId);
  if (!contactQueue || contactQueue.messages.length === 0) return;

  const messagesToProcess = [...contactQueue.messages];
  queues.delete(contactId);

  await logToDb('INFO', 'FLOW', `Iniciando processamento de ${messagesToProcess.length} mensagens agrupadas do contato ${contactId}`);

  try {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.status === 'MANUAL') {
      await logToDb('WARN', 'FLOW', `Contato ${contactId} mudou para MANUAL durante o tempo de espera. Cancelando resposta.`);
      return;
    }

    // 1. Group text messages and find media or clicked buttons
    let groupedText = '';
    let latestMediaUrl = '';
    let latestMimeType = '';
    let clickedButtonId = '';

    messagesToProcess.forEach((msg) => {
      if (msg.buttonId) {
        clickedButtonId = msg.buttonId;
      }

      if (msg.type === 'text' && msg.content) {
        groupedText += (groupedText ? '\n' : '') + msg.content;
      } else if (msg.type === 'interactive' && msg.content) {
        groupedText += (groupedText ? '\n' : '') + msg.content;
      } else if (msg.type === 'audio') {
        groupedText += (groupedText ? '\n' : '') + `[Áudio recebido]`;
        latestMediaUrl = msg.mediaUrl;
        latestMimeType = 'audio/ogg';
      } else if (msg.mediaUrl) {
        groupedText += (groupedText ? '\n' : '') + `[Mídia enviada (${msg.type}): ${msg.content || ''}]`;
        latestMediaUrl = msg.mediaUrl;
        if (msg.type === 'image') latestMimeType = 'image/jpeg';
        else if (msg.type === 'video') latestMimeType = 'video/mp4';
        else if (msg.type === 'document') latestMimeType = 'application/pdf';
      }
    });

    await logToDb('INFO', 'FLOW', `Entrada consolidada - Texto: "${groupedText}", Botão ID: "${clickedButtonId}"`);

    const normalizedInput = groupedText.trim().toLowerCase();

    // 2. Load active flows
    const activeFlows = await prisma.flow.findMany({ where: { isActive: true } });

    // 3. Check if user typed a keyword to trigger a NEW flow
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
      await startFlowForContact(contact, triggeredFlow);
      return;
    }

    // 4. Handle ongoing Flow execution
    if (contact.botMode === 'FLOW' && contact.activeFlowId) {
      const currentFlow = activeFlows.find(f => f.id === contact.activeFlowId);
      if (currentFlow) {
        const steps = JSON.parse(currentFlow.steps || '[]');
        let currentStep = steps.find(s => s.id === contact.currentStepId);
        
        // If currentStepId is empty, start from the first step in the flow
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
            await executeFlowOption(contact, currentFlow, steps, matchedOption, groupedText, latestMediaUrl, latestMimeType);
            return;
          } else {
            // User typed something else. Fallback to AI if configured, otherwise repeat current step.
            const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });
            if (activeAgent) {
              await logToDb('INFO', 'AI', `Entrada de texto livre no fluxo. Acionando fallback híbrido com Gemini AI.`);
              const aiTextResponse = await generateAIResponse(contactId, groupedText, latestMediaUrl, latestMimeType);
              
              // Send AI reply
              await sendText(contactId, aiTextResponse);
              await saveOutgoingMessage(`bot_${Date.now()}_ai_hybrid`, contactId, 'text', '', aiTextResponse);

              // Repeat menu
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

    // 5. Handle AI Mode
    const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });
    if (contact.botMode === 'IA' && activeAgent) {
      await logToDb('INFO', 'AI', `Contato está em modo IA puro. Chamando Gemini...`);
      const aiTextResponse = await generateAIResponse(contactId, groupedText, latestMediaUrl, latestMimeType);
      await sendBotResponse(contactId, aiTextResponse);
      return;
    }

    // 6. Check for a "welcome" flow if no other flows or active modes are running
    const welcomeFlow = activeFlows.find(f => f.trigger === 'welcome');
    if (welcomeFlow) {
      await logToDb('INFO', 'FLOW', `Disparando fluxo de boas-vindas padrão (Welcome Flow) para o contato ${contactId}`);
      await startFlowForContact(contact, welcomeFlow);
      return;
    }

    // 7. Last Fallback: route to AI Agent
    if (activeAgent) {
      await logToDb('INFO', 'AI', `Sem fluxo ativo. Definindo contato ${contactId} para modo IA e chamando Gemini.`);
      await prisma.contact.update({
        where: { id: contactId },
        data: { botMode: 'IA' }
      });
      const aiTextResponse = await generateAIResponse(contactId, groupedText, latestMediaUrl, latestMimeType);
      await sendBotResponse(contactId, aiTextResponse);
    } else {
      await logToDb('WARN', 'SYSTEM', 'Nenhuma persona de IA ativa ou fluxo de chatbot encontrado para responder à mensagem.');
    }

  } catch (error) {
    await logToDb('ERROR', 'SYSTEM', `Erro crítico ao processar fila do contato ${contactId}: ${error.message}`, {
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

  if (options.length > 0) {
    const formattedButtons = options.slice(0, 3).map(opt => ({
      id: opt.id,
      title: opt.title
    }));

    try {
      await logToDb('INFO', 'API', `Enviando botões interativos para ${contactId} na etapa '${step.id}'`);
      await sendButtons(contactId, text, formattedButtons);
      await saveOutgoingMessage(`bot_${Date.now()}_buttons`, contactId, 'text', '', `${text} [Botões: ${formattedButtons.map(b => b.title).join(', ')}]`);
    } catch (err) {
      console.error('Failed to send WhatsApp buttons, falling back to text options', err);
      let fallbackText = text + '\n\n';
      formattedButtons.forEach((btn, idx) => {
        fallbackText += `*${idx + 1}*. ${btn.title}\n`;
      });
      await sendText(contactId, fallbackText);
      await saveOutgoingMessage(`bot_${Date.now()}_text_fallback`, contactId, 'text', '', fallbackText);
    }
  } else {
    await logToDb('INFO', 'API', `Enviando texto simples para ${contactId} na etapa '${step.id}'`);
    await sendText(contactId, text);
    await saveOutgoingMessage(`bot_${Date.now()}_text`, contactId, 'text', '', text);
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
