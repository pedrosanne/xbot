import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

export async function GET(request) {
  // Authentication header recommended by Vercel
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await logToDb('INFO', 'SYSTEM', 'Iniciando rotina diária de limpeza e otimização do banco de dados.');

    // 1. Collect all active media URLs used in Chatbot Flows
    const flows = await prisma.flow.findMany();
    const activeMediaFilenames = new Set();

    flows.forEach(flow => {
      try {
        const steps = JSON.parse(flow.steps || '[]');
        steps.forEach(step => {
          if (step.media && step.media.url) {
            const url = step.media.url;
            if (url.startsWith('/api/uploads/')) {
              const filename = url.replace('/api/uploads/', '');
              activeMediaFilenames.add(filename);
            }
          }
        });
      } catch (e) {
        console.error(`Erro ao analisar steps do fluxo ${flow.id}:`, e);
      }
    });

    // 2. Collect image URLs from products
    const products = await prisma.product.findMany({
      select: { imageUrl: true }
    });
    products.forEach(p => {
      if (p.imageUrl && p.imageUrl.startsWith('/api/uploads/')) {
        const filename = p.imageUrl.replace('/api/uploads/', '');
        activeMediaFilenames.add(filename);
      }
    });

    // 3. Define age thresholds
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // 4. Delete old uploads not associated with active flows/products
    const oldUploads = await prisma.upload.findMany({
      where: {
        createdAt: { lt: oneDayAgo }
      },
      select: { filename: true }
    });

    const filenamesToDelete = oldUploads
      .map(u => u.filename)
      .filter(filename => !activeMediaFilenames.has(filename));

    let deletedUploadsCount = 0;
    if (filenamesToDelete.length > 0) {
      const deleteRes = await prisma.upload.deleteMany({
        where: {
          filename: { in: filenamesToDelete }
        }
      });
      deletedUploadsCount = deleteRes.count;
    }

    // 5. Clean logs older than 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const deletedLogs = await prisma.log.deleteMany({
      where: {
        timestamp: { lt: fifteenDaysAgo }
      }
    });

    // 6. Clean messages older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo }
      }
    });

    const msg = `Limpeza concluída. Mídias excluídas: ${deletedUploadsCount}, Logs antigos limpos: ${deletedLogs.count}, Mensagens >30 dias limpas: ${deletedMessages.count}`;
    await logToDb('INFO', 'SYSTEM', msg);

    return NextResponse.json({
      success: true,
      deletedUploads: deletedUploadsCount,
      deletedLogs: deletedLogs.count,
      deletedMessages: deletedMessages.count
    });

  } catch (error) {
    try {
      await logToDb('ERROR', 'SYSTEM', `Erro na rotina de limpeza do banco de dados: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
    } catch (e) {
      console.error('Critical database logger failure in cron:', e);
    }
    return NextResponse.json({ error: 'Erro interno ao processar limpeza.' }, { status: 500 });
  }
}
