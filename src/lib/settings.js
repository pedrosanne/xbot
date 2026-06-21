import { prisma } from './prisma';

export async function getSystemSettings() {
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
          publicBaseUrl: ''
        }
      });
    } catch (err) {
      // Handle concurrent inserts or other prisma errors
      settings = await prisma.setting.findUnique({
        where: { id: 'system' }
      });
    }
  }
  
  return settings;
}
