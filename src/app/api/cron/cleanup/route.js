import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';
import { deleteFromSupabaseStorage } from '@/lib/storage';

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

    // 2.5. Collect media URLs from active chat messages (less than 30 days old)
    const messages = await prisma.message.findMany({
      where: {
        mediaUrl: { startsWith: '/api/uploads/' }
      },
      select: { mediaUrl: true }
    });
    messages.forEach(msg => {
      if (msg.mediaUrl) {
        const filename = msg.mediaUrl.replace('/api/uploads/', '');
        activeMediaFilenames.add(filename);
      }
    });

    // 3. Define age thresholds
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // 4. Ghost & Deduplication Deep Cleanup
    let deletedUploadsCount = 0;
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const bucket = process.env.SUPABASE_BUCKET || 'media';
      const supabase = import('@supabase/supabase-js').then(m => m.createClient(supabaseUrl, serviceKey));
      const client = await supabase;

      let allFiles = [];
      let offset = 0;
      while (true) {
        const { data, error } = await client.storage.from(bucket).list('', { limit: 1000, offset });
        if (error || !data || data.length === 0) break;
        allFiles = allFiles.concat(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
        if (data.length < 1000) break;
        offset += 1000;
      }

      const dbUploads = await prisma.upload.findMany({ select: { filename: true } });
      const dbUploadSet = new Set(dbUploads.map(u => u.filename));
      const sizeGroups = {};
      const orphans = [];

      for (const f of allFiles) {
        const size = f.metadata?.size || 0;
        const isReferencedInDb = activeMediaFilenames.has(f.name);
        const isInGallery = dbUploadSet.has(f.name);
        
        if (!isReferencedInDb && !isInGallery) {
          orphans.push(f.name);
          continue;
        }

        if (size > 1024 && (isReferencedInDb || isInGallery)) {
          const mime = f.metadata?.mimetype || 'unknown';
          const key = `${size}_${mime}`;
          if (!sizeGroups[key]) sizeGroups[key] = [];
          sizeGroups[key].push(f);
        }
      }

      // Delete orphans
      if (orphans.length > 0) {
        for (let i = 0; i < orphans.length; i += 100) {
          await deleteFromSupabaseStorage(orphans.slice(i, i + 100));
        }
        deletedUploadsCount += orphans.length;
      }

      // Deduplicate
      const duplicatesToDelete = [];
      const renameMap = {};
      for (const [key, files] of Object.entries(sizeGroups)) {
        if (files.length > 1) {
          files.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const root = files[0];
          const dups = files.slice(1);
          for (const dup of dups) {
            duplicatesToDelete.push(dup.name);
            renameMap[dup.name] = root.name;
          }
        }
      }

      if (duplicatesToDelete.length > 0) {
        for (const [dupName, rootName] of Object.entries(renameMap)) {
          const dupUrl = `/api/uploads/${dupName}`;
          const rootUrl = `/api/uploads/${rootName}`;
          await prisma.message.updateMany({ where: { mediaUrl: dupUrl }, data: { mediaUrl: rootUrl } });
          await prisma.contact.updateMany({ where: { avatarUrl: dupUrl }, data: { avatarUrl: rootUrl } });
          await prisma.product.updateMany({ where: { imageUrl: dupUrl }, data: { imageUrl: rootUrl } });
        }
        await prisma.upload.deleteMany({ where: { filename: { in: duplicatesToDelete } } });
        for (let i = 0; i < duplicatesToDelete.length; i += 100) {
          await deleteFromSupabaseStorage(duplicatesToDelete.slice(i, i + 100));
        }
        deletedUploadsCount += duplicatesToDelete.length;
      }
    } catch (cleanErr) {
      console.error('Error during deep cleanup in cron:', cleanErr);
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

    // 7. Reset daily lead counts for WhatsApp connections
    await prisma.whatsAppConnection.updateMany({
      data: { currentDayLeads: 0 }
    });

    const msg = `Limpeza concluída. Mídias excluídas: ${deletedUploadsCount}, Logs antigos limpos: ${deletedLogs.count}, Mensagens >30 dias limpas: ${deletedMessages.count}, Contadores de Leads resetados.`;
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
