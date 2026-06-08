import { prisma } from './prisma';
import { generateAIResponse } from './gemini';
import { sendText, sendAudio, sendImage, sendDocument, sendVideo } from './whatsapp';
import { textToSpeech } from './tts';

// Global queue storage to survive Next.js dev server hot-reloads
const globalForQueue = global;
if (!globalForQueue.messageQueues) {
  globalForQueue.messageQueues = new Map(); // contactId -> { messages: [], timeout: null }
}

const queues = globalForQueue.messageQueues;
const DEBOUNCE_MS = 2500; // Wait 2.5 seconds to group consecutive messages

export async function enqueueMessage(contactId, messageData) {
  // messageData: { id, content, type, mediaUrl, timestamp, profileName, name }
  
  // 1. Ensure contact exists in database
  let contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        id: contactId,
        name: messageData.name || messageData.profileName || 'Cliente WhatsApp',
        profileName: messageData.profileName || '',
        status: 'AUTO'
      }
    });
  } else if (messageData.profileName && contact.profileName !== messageData.profileName) {
    // Update profile name if changed
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
    console.log(`Contact ${contactId} is in MANUAL mode. Bot response skipped.`);
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
}

async function processQueue(contactId) {
  const contactQueue = queues.get(contactId);
  if (!contactQueue || contactQueue.messages.length === 0) return;

  const messagesToProcess = [...contactQueue.messages];
  // Clear the queue for this contact
  queues.delete(contactId);

  console.log(`Processing ${messagesToProcess.length} grouped messages for ${contactId}`);

  try {
    // 1. Double check human status in case it changed during the debounce window
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.status === 'MANUAL') {
      console.log(`Contact ${contactId} switched to MANUAL mode. Skipping bot response.`);
      return;
    }

    // 2. Group text messages and find any media
    let groupedText = '';
    let latestMediaUrl = '';
    let latestMimeType = '';

    messagesToProcess.forEach((msg) => {
      if (msg.type === 'text' && msg.content) {
        groupedText += (groupedText ? '\n' : '') + msg.content;
      } else if (msg.type === 'audio') {
        groupedText += (groupedText ? '\n' : '') + `[Áudio recebido]`;
        latestMediaUrl = msg.mediaUrl;
        latestMimeType = 'audio/ogg'; // WhatsApp audios are ogg/opus
      } else if (msg.mediaUrl) {
        groupedText += (groupedText ? '\n' : '') + `[Mídia enviada (${msg.type}): ${msg.content || ''}]`;
        latestMediaUrl = msg.mediaUrl;
        // Approximation of mime type for image/video/doc
        if (msg.type === 'image') latestMimeType = 'image/jpeg';
        else if (msg.type === 'video') latestMimeType = 'video/mp4';
        else if (msg.type === 'document') latestMimeType = 'application/pdf';
      }
    });

    console.log(`Grouped inputs: "${groupedText}", Media: ${latestMediaUrl}`);

    // 3. Generate response using Gemini
    const aiTextResponse = await generateAIResponse(contactId, groupedText, latestMediaUrl, latestMimeType);
    console.log(`AI Raw Response: "${aiTextResponse}"`);

    // 4. Parse response tags ([ENVIAR AUDIO: ...], [ENVIAR IMAGEM: ...], etc.)
    await sendBotResponse(contactId, aiTextResponse);

  } catch (error) {
    console.error(`Error processing queue for ${contactId}:`, error);
  }
}

async function sendBotResponse(contactId, aiTextResponse) {
  let textToSend = aiTextResponse;
  let audioUrlToSend = null;
  let imageUrlToSend = null;
  let docUrlToSend = null;

  // Extract [ENVIAR AUDIO: text]
  const audioRegex = /\[ENVIAR\s+AUDIO:\s*([^\]]+)\]/i;
  const audioMatch = textToSend.match(audioRegex);
  if (audioMatch) {
    const audioScript = audioMatch[1].trim();
    // Try to generate TTS
    audioUrlToSend = await textToSpeech(audioScript);
    // Strip the tag from the text message (if any other text remains, we send it)
    textToSend = textToSend.replace(audioRegex, '').trim();
    
    // If no text remains, but ElevenLabs is not configured, we fallback to sending the script as text!
    if (!audioUrlToSend) {
      textToSend = (textToSend ? textToSend + '\n\n' : '') + audioScript;
    }
  }

  // Extract [ENVIAR IMAGEM: url]
  const imageRegex = /\[ENVIAR\s+IMAGEM:\s*([^\]]+)\]/i;
  const imageMatch = textToSend.match(imageRegex);
  if (imageMatch) {
    imageUrlToSend = imageMatch[1].trim();
    textToSend = textToSend.replace(imageRegex, '').trim();
  }

  // Extract [ENVIAR DOCUMENTO: url]
  const docRegex = /\[ENVIAR\s+DOCUMENTO:\s*([^\]]+)\]/i;
  const docMatch = textToSend.match(docRegex);
  if (docMatch) {
    docUrlToSend = docMatch[1].trim();
    textToSend = textToSend.replace(docRegex, '').trim();
  }

  // Clean trailing spaces or commas
  textToSend = textToSend.trim();

  // Create message ID for bot
  const botMessageId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 1. If we have an audio URL from TTS, send it
  if (audioUrlToSend) {
    // Form the absolute public URL of the audio file for Meta servers to download
    // NOTE: Meta requires an absolute URL. We must build this.
    // If deployed, it will use the domain. Locally we save it.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://domain.com';
    const absoluteAudioUrl = `${baseUrl}${audioUrlToSend}`;
    
    try {
      await sendAudio(contactId, absoluteAudioUrl);
      await saveOutgoingMessage(botMessageId, contactId, 'audio', audioUrlToSend, 'Mensagem de voz');
    } catch (err) {
      console.error('Failed to send audio message to WhatsApp:', err);
      // Fallback: send text if audio transmission fails
      textToSend = textToSend || 'Mensagem de voz';
    }
  }

  // 2. If we have image URL, send it
  if (imageUrlToSend) {
    try {
      await sendImage(contactId, imageUrlToSend, textToSend);
      await saveOutgoingMessage(botMessageId + '_img', contactId, 'image', imageUrlToSend, textToSend);
      textToSend = ''; // Clear text so it's not sent twice
    } catch (err) {
      console.error('Failed to send image to WhatsApp:', err);
    }
  }

  // 3. If we have document URL, send it
  if (docUrlToSend) {
    try {
      await sendDocument(contactId, docUrlToSend, 'documento', textToSend);
      await saveOutgoingMessage(botMessageId + '_doc', contactId, 'document', docUrlToSend, textToSend);
      textToSend = ''; // Clear text
    } catch (err) {
      console.error('Failed to send document to WhatsApp:', err);
    }
  }

  // 4. Send remaining text (if any)
  if (textToSend) {
    try {
      await sendText(contactId, textToSend);
      await saveOutgoingMessage(botMessageId, contactId, 'text', '', textToSend);
    } catch (err) {
      console.error('Failed to send text message to WhatsApp:', err);
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

  // Update contact's last interaction
  await prisma.contact.update({
    where: { id: contactId },
    data: { lastInteraction: new Date() }
  });
}
