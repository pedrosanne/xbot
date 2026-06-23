import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';
import { getSystemSettings } from './settings';
import { logToDb } from './log';

export async function generateAIResponse(contactId, incomingText = '', mediaUrl = '', mimeType = '', customAgentId = null) {
  // 1. Fetch designated agent or globally active agent
  let agent = null;
  if (customAgentId) {
    agent = await prisma.agent.findUnique({
      where: { id: customAgentId }
    });
  }

  if (!agent) {
    agent = await prisma.agent.findFirst({
      where: { isActive: true }
    });
  }

  if (!agent) {
    // Fallback agent if none is active
    agent = {
      name: 'Padrão',
      systemPrompt: 'Você é um atendente simpático. Responda de forma curta, prestativa e natural, simulando um contato humano.',
      model: 'gemini-2.5-flash',
      temperature: 0.7
    };
  }

  const settings = await getSystemSettings();
  let apiKeyToUse = agent?.geminiApiKey;
  if (!apiKeyToUse || apiKeyToUse.trim().length < 20) {
    apiKeyToUse = settings.geminiApiKey;
  }

  if (!apiKeyToUse) {
    console.error('Gemini API key is not configured.');
    return 'Desculpe, o sistema de IA não está configurado. Insira a chave da API nas configurações.';
  }

  // Mapeia modelos legados/indisponíveis para equivalentes modernos válidos na API
  let modelName = agent.model || 'gemini-2.5-flash';
  if (modelName === 'gemini-1.5-flash') {
    modelName = 'gemini-2.5-flash';
  } else if (modelName === 'gemini-1.5-pro') {
    modelName = 'gemini-2.5-pro';
  }

  // 2. Initialize Gemini
  const genAI = new GoogleGenerativeAI(apiKeyToUse);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: agent.temperature || 0.7,
    }
  });

  // 3. Fetch conversation history (last 15 messages)
  const history = await prisma.message.findMany({
    where: { contactId },
    orderBy: { timestamp: 'asc' },
    take: 15
  });

  // Fetch active flows for context routing
  let activeFlows = [];
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    const connectionId = contact?.connectionId || null;
    activeFlows = await prisma.flow.findMany({
      where: {
        isActive: true,
        OR: [
          { connectionId: null },
          { connectionId: connectionId }
        ]
      }
    });
  } catch (err) {
    console.error('Error fetching active flows for Gemini context:', err);
  }

  // 4. Construct prompt and parts
  const promptParts = [];

  // System Prompt / Persona Instruction
  let systemPrompt = `INSTRUÇÕES DE PERSONA/SISTEMA:\n${agent.systemPrompt}\n\n`;

  if (activeFlows.length > 0) {
    systemPrompt += `FLUXOS DE ATENDIMENTO/CONTEÚDOS DISPONÍVEIS NO SISTEMA:\n`;
    activeFlows.forEach(f => {
      systemPrompt += `- Nome do Fluxo: "${f.name}" | ID do Fluxo: "${f.id}" | Palavras-chave de ativação: "${f.keywords}"\n`;
    });
    systemPrompt += `\nINSTRUÇÕES DE DIRECIONAMENTO INTELIGENTE DE FLUXO:\n`;
    systemPrompt += `- Como atendente, seu papel inicial é acolher o cliente e entender o que ele precisa.\n`;
    systemPrompt += `- Se o cliente demonstrar interesse óbvio ou confirmar que deseja receber o conteúdo, livro, produto ou atendimento de algum dos fluxos acima, você deve confirmar simpaticamente que vai direcioná-lo e adicionar EXATAMENTE ao final de sua resposta o marcador [DISPARAR_FLUXO: id_do_fluxo].\n`;
    systemPrompt += `- Exemplo de uso: se o cliente disser "quero o livro", responda algo como "Perfeito! Vou iniciar o envio do livro Segredos do Trade agora mesmo. [DISPARAR_FLUXO: ${activeFlows[0]?.id}]"\n`;
    systemPrompt += `- ATENÇÃO: NUNCA mostre a estrutura do marcador ou mencione o ID do fluxo para o cliente. Use o marcador de forma silenciosa e invisível para o cliente final, apenas anexando a tag no fim do texto.\n`;
    systemPrompt += `- IMPORTANTE: Se o cliente estiver apenas tirando dúvidas gerais ou saudando ("bom dia", "olá"), responda amigavelmente ajudando e guiando-o a escolher um dos serviços/fluxos oferecidos, SEM incluir o marcador [DISPARAR_FLUXO: ...]. Só inclua o marcador quando ele de fato desejar o fluxo ou o conteúdo correspondente.\n\n`;
  }

  systemPrompt += `INSTRUÇÕES IMPORTANTES DE RESPOSTA:\n`;
  systemPrompt += `- Você é um agente humano. Seja natural, simpático e informal quando apropriado.\n`;
  systemPrompt += `- Nunca admita que é um robô ou inteligência artificial.\n`;
  systemPrompt += `- Se o cliente te enviar um áudio, você receberá a transcrição dele ou analisará o áudio diretamente. Responda normalmente.\n`;
  systemPrompt += `- Se quiser enviar uma mensagem de VOZ (áudio), comece sua resposta exatamente com o marcador [ENVIAR AUDIO: texto do áudio]. O sistema converterá seu texto em voz e enviará ao cliente.\n`;
  systemPrompt += `- Se quiser enviar uma imagem junto, insira no final da resposta: [ENVIAR IMAGEM: url_da_imagem]\n`;
  systemPrompt += `- Se quiser enviar um link de documento, use: [ENVIAR DOCUMENTO: url_do_documento]\n\n`;

  systemPrompt += `HISTÓRICO DA CONVERSA:\n`;
  
  for (const msg of history) {
    const sender = msg.direction === 'INCOMING' ? 'Cliente' : 'Atendente';
    if (msg.type === 'text') {
      systemPrompt += `${sender}: ${msg.content}\n`;
    } else if (msg.type === 'audio') {
      systemPrompt += `${sender} enviou um Áudio [Transcrição/Nota]: ${msg.content || 'Mensagem de voz'}\n`;
    } else {
      systemPrompt += `${sender} enviou um arquivo de ${msg.type} [${msg.content || 'Arquivo'}]\n`;
    }
  }

  // Current client prompt message
  systemPrompt += `Cliente: ${incomingText || '(Mídia enviada)'}\n`;
  systemPrompt += `Atendente: `;

  promptParts.push(systemPrompt);

  // Se houver anexo de mídia ativo
  if (mediaUrl && mimeType) {
    let fileBuffer = null;
    
    if (mediaUrl.startsWith('/api/uploads/')) {
      const filename = mediaUrl.replace('/api/uploads/', '');
      try {
        const upload = await prisma.upload.findUnique({
          where: { filename }
        });
        if (upload) {
          fileBuffer = Buffer.from(upload.data);
        } else {
          console.warn(`Attachment not found in database: ${filename}`);
        }
      } catch (err) {
        console.error('Error fetching upload media from DB for Gemini:', err);
      }
    } else {
      const localFilePath = path.join(process.cwd(), 'public', mediaUrl);
      if (fs.existsSync(localFilePath)) {
        try {
          fileBuffer = fs.readFileSync(localFilePath);
        } catch (err) {
          console.error('Error reading local file for Gemini:', err);
        }
      }
    }

    if (fileBuffer) {
      try {
        const generativePart = {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType.split(';')[0].trim() // Clean mime type
          }
        };
        promptParts.push(generativePart);
        console.log(`Sending file part to Gemini from DB/Local: ${mediaUrl} (${mimeType})`);
      } catch (err) {
        console.error('Error constructing generative part for Gemini:', err);
      }
    }
  }

  try {
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    let textResponse = response.text().trim();
    
    // Safety check: remove double Atendente: prefixes if the model outputted them
    if (textResponse.startsWith('Atendente:')) {
      textResponse = textResponse.replace(/^Atendente:\s*/, '');
    }

    return textResponse;
  } catch (error) {
    // If it is a transient error on gemini-2.5 models, try calling stable gemini-1.5-flash as fallback
    if (modelName !== 'gemini-1.5-flash' && (error.message.includes('503') || error.message.includes('demand') || error.message.includes('Unavailable'))) {
      console.warn(`Transient error on model ${modelName}. Retrying with stable gemini-1.5-flash...`);
      try {
        const fallbackModel = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: agent.temperature || 0.7,
          }
        });
        const result = await fallbackModel.generateContent(promptParts);
        const response = await result.response;
        let textResponse = response.text().trim();
        if (textResponse.startsWith('Atendente:')) {
          textResponse = textResponse.replace(/^Atendente:\s*/, '');
        }
        await logToDb('WARN', 'AI', `Recuperado com sucesso usando fallback para gemini-1.5-flash após erro 503 no modelo principal ${modelName}`);
        return textResponse;
      } catch (fallbackError) {
        console.error('Fallback model gemini-1.5-flash also failed:', fallbackError);
      }
    }

    console.error('Error generating AI response:', error);
    await logToDb('ERROR', 'AI', `Erro ao gerar resposta do Gemini para o agente ${agent.name}: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      model: modelName,
      apiKeyUsed: apiKeyToUse ? (apiKeyToUse.substring(0, 8) + '...') : 'none'
    });
    return 'Desculpe, tive um problema ao processar sua resposta. Por favor, tente novamente.';
  }
}
