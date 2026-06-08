const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Create a default Agent if none exists
  const agentCount = await prisma.agent.count();
  if (agentCount === 0) {
    await prisma.agent.create({
      data: {
        name: 'Iara (Suporte Comercial)',
        description: 'Agente focada em vendas e informações institucionais',
        systemPrompt: 'Você é a Iara, atendente virtual simpática do X bot. Seu objetivo é ajudar o cliente a entender nossa plataforma de chatbot, esclarecer dúvidas de preços (plano básico R$99/mês, plano pro R$249/mês) e incentivar a contratação. Responda de forma curta, cordial, humana e use emojis de forma natural.',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        isActive: true
      }
    });
    console.log('Agente padrão "Sara" criado e ativado com sucesso!');
  } else {
    console.log('Agente(s) já cadastrado(s).');
  }

  // 2. Initialize system settings if none exists
  const settings = await prisma.setting.findUnique({
    where: { id: 'system' }
  });
  if (!settings) {
    await prisma.setting.create({
      data: {
        id: 'system',
        whatsappToken: '',
        whatsappPhoneId: '',
        whatsappVerifyToken: 'antigravity_token_123',
        geminiApiKey: '',
        elevenLabsApiKey: '',
        elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM' // Rachel
      }
    });
    console.log('Configurações de sistema inicializadas no banco de dados!');
  } else {
    console.log('Configurações de sistema já existentes.');
  }
}

main()
  .catch((e) => {
    console.error('Erro ao rodar seed do banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
