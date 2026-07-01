import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { deleteFromSupabaseStorage } from '@/lib/storage';

export async function POST(request) {
  try {
    const { action } = await request.json(); // 'clean_orphans' or 'deduplicate'
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || 'media';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch all files from Supabase Storage
    let allFiles = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list('', {
        limit,
        offset,
        sortBy: { column: 'created_at', order: 'asc' },
      });
      if (error || !data || data.length === 0) break;
      allFiles = allFiles.concat(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
      if (data.length < limit) break;
      offset += limit;
    }

    // 2. Fetch all active references from DB
    const activeRefs = new Set();
    const flows = await prisma.flow.findMany();
    flows.forEach(flow => {
      try {
        const steps = JSON.parse(flow.steps || '[]');
        steps.forEach(step => {
          if (step.media && step.media.url && step.media.url.startsWith('/api/uploads/')) {
            activeRefs.add(step.media.url.replace('/api/uploads/', ''));
          }
        });
      } catch (e) {}
    });

    const products = await prisma.product.findMany({ select: { imageUrl: true } });
    products.forEach(p => {
      if (p.imageUrl && p.imageUrl.startsWith('/api/uploads/')) {
        activeRefs.add(p.imageUrl.replace('/api/uploads/', ''));
      }
    });

    const contacts = await prisma.contact.findMany({ select: { avatarUrl: true } });
    contacts.forEach(c => {
      if (c.avatarUrl && c.avatarUrl.startsWith('/api/uploads/')) {
        activeRefs.add(c.avatarUrl.replace('/api/uploads/', ''));
      }
    });

    const messages = await prisma.message.findMany({
      where: { mediaUrl: { not: '' } },
      select: { mediaUrl: true }
    });
    messages.forEach(m => {
      if (m.mediaUrl && m.mediaUrl.startsWith('/api/uploads/')) {
        activeRefs.add(m.mediaUrl.replace('/api/uploads/', ''));
      }
    });

    const dbUploads = await prisma.upload.findMany({ select: { filename: true } });
    const dbUploadSet = new Set(dbUploads.map(u => u.filename));

    let deletedFiles = [];
    let updatedRecords = 0;

    if (action === 'clean_orphans') {
      const orphans = [];
      for (const f of allFiles) {
        if (!activeRefs.has(f.name) && !dbUploadSet.has(f.name)) {
          orphans.push(f.name);
        }
      }

      if (orphans.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < orphans.length; i += 100) {
          const batch = orphans.slice(i, i + 100);
          await deleteFromSupabaseStorage(batch);
        }
        deletedFiles = orphans;
      }
      return NextResponse.json({ success: true, action: 'clean_orphans', deletedCount: orphans.length });

    } else if (action === 'deduplicate') {
      const sizeGroups = {};
      for (const f of allFiles) {
        const size = f.metadata?.size || 0;
        const isReferencedInDb = activeRefs.has(f.name);
        const isInGallery = dbUploadSet.has(f.name);
        
        if (!isReferencedInDb && !isInGallery) continue; // Skip orphans

        if (size > 1024) { 
          const mime = f.metadata?.mimetype || 'unknown';
          const key = `${size}_${mime}`;
          if (!sizeGroups[key]) sizeGroups[key] = [];
          sizeGroups[key].push(f);
        }
      }

      const duplicatesToDelete = [];
      const renameMap = {}; // duplicate -> root

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
        // Update Message table
        for (const [dupName, rootName] of Object.entries(renameMap)) {
          const dupUrl = `/api/uploads/${dupName}`;
          const rootUrl = `/api/uploads/${rootName}`;
          
          const resultMsg = await prisma.message.updateMany({
            where: { mediaUrl: dupUrl },
            data: { mediaUrl: rootUrl }
          });
          updatedRecords += resultMsg.count;

          const resultContact = await prisma.contact.updateMany({
            where: { avatarUrl: dupUrl },
            data: { avatarUrl: rootUrl }
          });
          updatedRecords += resultContact.count;

          const resultProduct = await prisma.product.updateMany({
            where: { imageUrl: dupUrl },
            data: { imageUrl: rootUrl }
          });
          updatedRecords += resultProduct.count;
          
          // Flow is harder because steps is a JSON string. We can update it similarly to fix-media
          const flowsToFix = await prisma.flow.findMany({
            where: { steps: { contains: dupName } }
          });
          for (const flow of flowsToFix) {
            let stepsStr = flow.steps || '[]';
            if (stepsStr.includes(dupName)) {
              stepsStr = stepsStr.split(dupName).join(rootName);
              await prisma.flow.update({
                where: { id: flow.id },
                data: { steps: stepsStr }
              });
              updatedRecords++;
            }
          }
        }

        // Delete from Uploads table if they are in the gallery
        await prisma.upload.deleteMany({
          where: { filename: { in: duplicatesToDelete } }
        });

        // Finally delete the duplicate files from storage
        for (let i = 0; i < duplicatesToDelete.length; i += 100) {
          const batch = duplicatesToDelete.slice(i, i + 100);
          await deleteFromSupabaseStorage(batch);
        }
        deletedFiles = duplicatesToDelete;
      }

      return NextResponse.json({ success: true, action: 'deduplicate', deletedCount: duplicatesToDelete.length, updatedRecords });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });

  } catch (error) {
    console.error('Error in media cleanup:', error);
    return NextResponse.json({ error: 'Erro ao executar limpeza.' }, { status: 500 });
  }
}
