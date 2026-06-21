import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename preserving original name
    const extension = path.extname(file.name) || '';
    const baseName = path.basename(file.name, extension);
    const sanitizedBase = baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ._-]/g, '')
      .trim() || 'manual_upload';
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${sanitizedBase}___${uniqueId}${extension}`;

    // Save to database
    await prisma.upload.create({
      data: {
        filename,
        mimeType: file.type || 'application/octet-stream',
        data: buffer
      }
    });
    console.log(`Manual upload saved to database: ${filename}`);

    const fileUrl = `/api/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl, filename: file.name });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json({ error: 'Falha ao processar upload.' }, { status: 500 });
  }
}

