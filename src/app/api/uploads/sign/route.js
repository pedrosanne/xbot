import { NextResponse } from 'next/server';
import { getSignedUploadUrl } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import path from 'path';

export async function POST(request) {
  try {
    const { filename, mimeType } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'O nome do arquivo é obrigatório.' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const bucket = process.env.SUPABASE_BUCKET || 'media';

    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Serviço de armazenamento não configurado.' }, { status: 500 });
    }

    // Sanitize base filename and make a unique identifier
    const extension = path.extname(filename) || '';
    const baseName = path.basename(filename, extension);
    const sanitizedBase = baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .trim() || 'manual_upload';
    
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const uniqueFilename = `${sanitizedBase}___${uniqueId}${extension}`;

    // Request signed upload URL from Supabase
    const { signedUrl } = await getSignedUploadUrl(uniqueFilename);

    // Save metadata record in DB for cron cleanups tracking
    await prisma.upload.create({
      data: {
        filename: uniqueFilename,
        mimeType: mimeType || 'application/octet-stream'
      }
    });

    // Proxied URL format and direct public URL format
    const localUrl = `/api/uploads/${uniqueFilename}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      signedUrl,
      publicUrl,
      localUrl,
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Erro ao gerar URL de upload.' }, { status: 500 });
  }
}
