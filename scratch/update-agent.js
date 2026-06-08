const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update Sara to Iara in the database
  const count = await prisma.agent.updateMany({
    where: {
      name: {
        contains: 'Sara'
      }
    },
    data: {
      name: 'Iara (Suporte Comercial)',
      systemPrompt: 'Você é a Iara, atendente virtual simpática do X bot. Seu objetivo é ajudar o cliente a entender nossa plataforma de chatbot, esclarecer dúvidas de preços (plano básico R$99/mês, plano pro R$249/mês) e incentivar a contratação. Responda de forma curta, cordial, humana e use emojis de forma natural.'
    }
  });

  console.log(`Atualizados ${count.count} agentes com sucesso no banco de dados!`);
}

main()
  .catch((e) => {
    console.error('Erro ao atualizar agentes no banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
