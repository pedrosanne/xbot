import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
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
    
    // - Flows
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

    // - Products
    const products = await prisma.product.findMany({ select: { imageUrl: true } });
    products.forEach(p => {
      if (p.imageUrl && p.imageUrl.startsWith('/api/uploads/')) {
        activeRefs.add(p.imageUrl.replace('/api/uploads/', ''));
      }
    });

    // - Contacts (Avatars)
    const contacts = await prisma.contact.findMany({ select: { avatarUrl: true } });
    contacts.forEach(c => {
      if (c.avatarUrl && c.avatarUrl.startsWith('/api/uploads/')) {
        activeRefs.add(c.avatarUrl.replace('/api/uploads/', ''));
      }
    });

    // - Messages (Chat History)
    const messages = await prisma.message.findMany({
      where: { mediaUrl: { not: '' } },
      select: { mediaUrl: true }
    });
    messages.forEach(m => {
      if (m.mediaUrl && m.mediaUrl.startsWith('/api/uploads/')) {
        activeRefs.add(m.mediaUrl.replace('/api/uploads/', ''));
      }
    });

    // 3. Categorize files
    let totalSize = 0;
    let rootSize = 0;
    let orphanSize = 0;
    let duplicateSize = 0;

    let totalCount = allFiles.length;
    let rootCount = 0;
    let orphanCount = 0;
    let duplicateCount = 0;

    const sizeGroups = {};
    const orphans = [];
    const dbUploads = await prisma.upload.findMany({ select: { filename: true } });
    const dbUploadSet = new Set(dbUploads.map(u => u.filename));

    for (const f of allFiles) {
      const size = f.metadata?.size || 0;
      totalSize += size;

      const isReferencedInDb = activeRefs.has(f.name);
      const isInGallery = dbUploadSet.has(f.name);
      
      if (!isReferencedInDb && !isInGallery) {
        orphanSize += size;
        orphanCount++;
        orphans.push(f);
        continue;
      }

      rootSize += size; 
      rootCount++;

      // Group by size and mimetype for deduplication
      if (size > 1024) { 
        const mime = f.metadata?.mimetype || 'unknown';
        const key = `${size}_${mime}`;
        if (!sizeGroups[key]) sizeGroups[key] = [];
        sizeGroups[key].push(f);
      }
    }

    // 4. Calculate Duplicates
    for (const [key, files] of Object.entries(sizeGroups)) {
      if (files.length > 1) {
        files.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const dups = files.slice(1);
        for (const dup of dups) {
          duplicateSize += (dup.metadata?.size || 0);
          duplicateCount++;
          rootSize -= (dup.metadata?.size || 0);
          rootCount--;
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalSize,
        rootSize,
        orphanSize,
        duplicateSize,
        totalCount,
        rootCount,
        orphanCount,
        duplicateCount
      }
    });

  } catch (error) {
    console.error('Error in media health:', error);
    return NextResponse.json({ error: 'Erro ao calcular saúde do banco.' }, { status: 500 });
  }
}
