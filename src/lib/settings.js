import { prisma } from './prisma';

let cachedSettings = null;
let cacheExpiry = 0;

export async function getSystemSettings() {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }

  let settings = await prisma.setting.findUnique({
    where: { id: 'system' }
  });
  
  if (!settings) {
    try {
      settings = await prisma.setting.create({
        data: {
          id: 'system',
          whatsappToken: '',
          whatsappPhoneId: '',
          whatsappVerifyToken: 'antigravity_token_123',
          geminiApiKey: '',
          elevenLabsApiKey: '',
          elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
          vapidPublicKey: '',
          vapidPrivateKey: '',
          vapiApiKey: '',
          vapiPhoneNumberId: '',
          vapiAssistantId: '',
          publicBaseUrl: '',
          pushTitleManual: 'Atendimento Manual: {nome} 💬',
          pushBodyManual: '{mensagem}',
          pushSoundManual: 'default',
          pushTitleSale: 'Venda Aprovada! 🎉',
          pushBodySale: 'R$ {valor} - {nome}',
          pushSoundSale: 'sale',
          pushTitleAlert: 'Alerta do Sistema ⚠️',
          pushBodyAlert: '{mensagem}',
          pushSoundAlert: 'default',
          pushTitleLead: 'Ação Necessária: {nome} 👤',
          pushBodyLead: '{mensagem}',
          pushSoundLead: 'message',
          globalPixelId: ''
        }
      });
    } catch (err) {
      // Handle concurrent inserts or other prisma errors
      settings = await prisma.setting.findUnique({
        where: { id: 'system' }
      });
    }
  }

  if (settings) {
    cachedSettings = settings;
    cacheExpiry = now + 15000; // 15 seconds
  }
  
  return settings;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheExpiry = 0;
}
