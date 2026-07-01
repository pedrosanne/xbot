import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';
import { getSystemSettings } from './settings';
import { logToDb } from './log';

// Helper for AI Provider Rotation (Load Balancing & Contingency)
async function getNextAiProvider(preferredModel = null) {
  const providers = await prisma.aiProvider.findMany({
    where: { isActive: true },
    orderBy: { usageCount: 'asc' } // Round-robin based on usage
  });
  
  if (providers.length === 0) return null;
  return providers[0];
}

async function markProviderUsage(id, success) {
  if (!id) return;
  if (success) {
    await prisma.aiProvider.update({
      where: { id },
      data: { usageCount: { increment: 1 } }
    });
  } else {
    await prisma.aiProvider.update({
      where: { id },
      data: { usageCount: { increment: 1 }, errorCount: { increment: 1 } }
    });
  }
}


export async function generateAIResponse(contactId, incomingText = '', mediaUrl = '', mimeType = '', customAgentId = null, returningCustomerFlows = null) {
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

  if (returningCustomerFlows) {
    const flowNames = returningCustomerFlows.split(',').map(f => {
      const parts = f.split(':');
      return parts.length > 1 ? parts[1] : parts[0];
    }).join(', ');

    systemPrompt += `INSTRUÇÕES ESPECIAIS - CLIENTE RECORRENTE:\n`;
    systemPrompt += `- Este cliente já foi atendido anteriormente e já passou pelos seguintes fluxos: "${flowNames}".\n`;
    systemPrompt += `- Diga ao cliente, de forma muito breve (máximo de 2 frases), que identificou os atendimentos anteriores dele nesses fluxos, e que você o está transferindo imediatamente para um de nossos atendentes humanos para dar continuidade.\n`;
    systemPrompt += `- NÃO tente disparar nenhum novo fluxo de chatbot. NUNCA adicione marcadores do tipo [DISPARAR_FLUXO: ...].\n`;
    systemPrompt += `- Responda de forma curta e direta, prestando atenção no que o cliente enviou agora e fazendo a ponte para o atendimento humano.\n\n`;
  }

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
          const supabaseUrl = process.env.SUPABASE_URL;
          const bucket = process.env.SUPABASE_BUCKET || 'media';
          
          const decodedFilename = decodeURIComponent(filename);
          const encodedFilename = encodeURIComponent(decodedFilename).replace(/%2F/g, '/');
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedFilename}`;
          
          const res = await fetch(publicUrl);
          if (res.ok) {
            fileBuffer = Buffer.from(await res.arrayBuffer());
          } else {
            console.error(`Failed to fetch file from Supabase storage for Gemini attachment: ${publicUrl}`);
          }
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

    // Log AI Usage
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      const totalTokens = usageMetadata.totalTokenCount || 0;
      // Calculate estimated cost: Gemini 1.5/2.5 Flash is roughly $0.15 per 1M blended tokens
      const estimatedCost = (totalTokens / 1000000) * 0.15;
      
      try {
        await prisma.aiUsage.create({
          data: {
            provider: 'GEMINI',
            model: modelName,
            action: 'chat',
            tokens: totalTokens,
            cost: estimatedCost
          }
        });
      } catch (logErr) {
        console.error('Failed to log AI usage:', logErr);
      }
    }

    return textResponse;
  } catch (error) {
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

export async function extractAmountFromText(incomingText, customAgentId = null) {
  try {
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
    const settings = await getSystemSettings();
    let apiKeyToUse = agent?.geminiApiKey || settings.geminiApiKey;

    if (!apiKeyToUse) {
      console.error('Gemini API key is not configured for extractAmount.');
      return null;
    }

    let modelName = settings.geminiPixModel || 'gemini-2.5-flash';
    if (!agent?.model && agent) {
        // Fallback for retro-compatibility if needed, but primary is global setting
    }

    // AI Provider Contingency Pool
    const providers = await prisma.aiProvider.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'asc' }
    });

    let keysToTry = [];
    if (providers.length > 0) {
      keysToTry = providers.map(p => ({
        id: p.id,
        key: p.apiKey,
        model: p.model || modelName,
        name: p.name
      }));
    } else {
      // Fallback to global setting if no providers in pool
      keysToTry.push({ id: null, key: apiKeyToUse, model: modelName, name: 'System Default' });
    }

    let promptTemplate = settings.geminiPixPrompt || `Analise o seguinte texto enviado por um cliente que quer fazer um pagamento e extraia o valor numérico em reais (BRL).\nResponda APENAS com o número decimal puro (ex: 150.00 ou 30.50), usando ponto como separador decimal.\nSe o texto não contiver nenhuma menção de valor ou quantidade financeira, responda EXATAMENTE "null" (sem aspas).\n\nTexto do cliente: "{texto}"`;
    
    // Replace {texto} if present, or append it if the user forgot the placeholder
    let prompt = promptTemplate.includes('{texto}') 
        ? promptTemplate.replace('{texto}', incomingText) 
        : `${promptTemplate}\n\nTexto do cliente: "${incomingText}"`;

    const startTime = Date.now();
    let lastError = null;

    // Retry loop for Contingency
    for (let i = 0; i < keysToTry.length; i++) {
      const currentProvider = keysToTry[i];
      try {
        const genAI = new GoogleGenerativeAI(currentProvider.key);
        const model = genAI.getGenerativeModel({ model: currentProvider.model });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text().trim().toLowerCase();
        const durationMs = Date.now() - startTime;
        
        // Log AI Usage - Success
        const usageMetadata = response.usageMetadata;
        let totalTokens = usageMetadata?.totalTokenCount || 0;
        let estimatedCost = (totalTokens / 1000000) * 0.15;
        
        try {
          await prisma.aiUsage.create({
            data: {
              provider: 'GEMINI',
              model: currentProvider.model,
              action: 'extractAmount',
              tokens: totalTokens,
              cost: estimatedCost,
              status: 'SUCCESS',
              durationMs,
              providerId: currentProvider.id
            }
          });
          await markProviderUsage(currentProvider.id, true);
        } catch (logErr) {
          console.error('Failed to log AI usage for extractAmount:', logErr);
        }

        if (textResponse === 'null' || textResponse.includes('null')) {
          return null;
        }

        const cleanNumStr = textResponse.replace(/[^0-9.]/g, '');
        const amount = parseFloat(cleanNumStr);
        return isNaN(amount) ? null : amount;
      } catch (err) {
        console.error(`AI Provider [${currentProvider.name}] failed:`, err.message);
        lastError = err.message;
        await markProviderUsage(currentProvider.id, false);
        // Continue to next provider in the loop...
      }
    }

    // If we exhausted all keys
    const durationMs = Date.now() - startTime;
    try {
      await prisma.aiUsage.create({
        data: {
          provider: 'GEMINI',
          model: modelName,
          action: 'extractAmount',
          status: 'FAILED',
          durationMs,
          error: lastError || 'All providers failed'
        }
      });
    } catch (logErr) {}

    return null;
  } catch (err) {
    console.error('Error in extractAmountFromText:', err);
    return null;
  }
}

