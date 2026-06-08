import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';
import { getSystemSettings } from './settings';

export async function generateAIResponse(contactId, incomingText = '', mediaUrl = '', mimeType = '') {
  const settings = await getSystemSettings();
  const { geminiApiKey } = settings;

  if (!geminiApiKey) {
    console.error('Gemini API key is not configured.');
    return 'Desculpe, o sistema de IA não está configurado. Insira a chave da API nas configurações.';
  }

  // 1. Fetch active agent
  let agent = await prisma.agent.findFirst({
    where: { isActive: true }
  });

  if (!agent) {
    // Fallback agent if none is active
    agent = {
      name: 'Padrão',
      systemPrompt: 'Você é um atendente simpático. Responda de forma curta, prestativa e natural, simulando um contato humano.',
      model: 'gemini-1.5-flash',
      temperature: 0.7
    };
  }

  // 2. Initialize Gemini
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: agent.model || 'gemini-1.5-flash',
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

  // 4. Construct prompt and parts
  const promptParts = [];

  // System Prompt / Persona Instruction
  let systemPrompt = `INSTRUÇÕES DE PERSONA/SISTEMA:\n${agent.systemPrompt}\n\n`;
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
    let localFilePath;
    if (mediaUrl.startsWith('/api/uploads/')) {
      const filename = mediaUrl.replace('/api/uploads/', '');
      localFilePath = path.join('/tmp', filename);
    } else {
      localFilePath = path.join(process.cwd(), 'public', mediaUrl);
    }

    if (fs.existsSync(localFilePath)) {
      try {
        const fileBuffer = fs.readFileSync(localFilePath);
        const generativePart = {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType.split(';')[0].trim() // Clean mime type
          }
        };
        promptParts.push(generativePart);
        console.log(`Sending file part to Gemini: ${mediaUrl} (${mimeType})`);
      } catch (err) {
        console.error('Error loading media for Gemini:', err);
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
    console.error('Error generating AI response:', error);
    return 'Desculpe, tive um problema ao processar sua resposta. Por favor, tente novamente.';
  }
}
