import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { logToDb } from '@/lib/log';
import { uploadToSupabaseStorage, deleteFromSupabaseStorage } from '@/lib/storage';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'image', 'video', 'audio', 'document'
    const search = searchParams.get('search');

    const where = {};

    if (category) {
      if (category === 'image') {
        where.mimeType = { startsWith: 'image/' };
      } else if (category === 'video') {
        where.mimeType = { startsWith: 'video/' };
      } else if (category === 'audio') {
        where.mimeType = { startsWith: 'audio/' };
      } else if (category === 'document') {
        where.NOT = [
          { mimeType: { startsWith: 'image/' } },
          { mimeType: { startsWith: 'video/' } },
          { mimeType: { startsWith: 'audio/' } }
        ];
      }
    }

    if (search) {
      where.filename = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const uploads = await prisma.upload.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, uploads });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return NextResponse.json({ error: 'Erro ao listar mídias da galeria.' }, { status: 500 });
  }
}

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
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .trim() || 'manual_upload';
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${sanitizedBase}___${uniqueId}${extension}`;

    // Save to Supabase Storage
    await uploadToSupabaseStorage(filename, file.type || 'application/octet-stream', buffer);

    // Save metadata to database
    await prisma.upload.create({
      data: {
        filename,
        mimeType: file.type || 'application/octet-stream'
      }
    });
    console.log(`Manual upload saved to Supabase Storage: ${filename}`);

    const fileUrl = `/api/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl, filename: file.name });
  } catch (error) {
    console.error('Error handling upload:', error);
    try {
      await logToDb('ERROR', 'API', `Erro no upload manual do arquivo: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
    } catch (logErr) {
      console.error('Failed to write upload error to DB logs:', logErr);
    }
    return NextResponse.json({ error: 'Falha ao processar upload.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do arquivo é obrigatório.' }, { status: 400 });
    }

    if (id === 'all') {
      const allUploads = await prisma.upload.findMany();
      if (allUploads.length > 0) {
        const filenames = allUploads.map(u => u.filename);
        try {
          await deleteFromSupabaseStorage(filenames);
        } catch (storageErr) {
          console.warn('Alguns ou todos os arquivos não puderam ser deletados do storage:', storageErr);
        }
        await prisma.upload.deleteMany();
      }
      return NextResponse.json({ success: true, message: 'Todos os arquivos foram excluídos com sucesso.' });
    }

    const upload = await prisma.upload.findUnique({
      where: { id }
    });

    if (!upload) {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    // 1. Delete physical file from Supabase Storage
    try {
      await deleteFromSupabaseStorage([upload.filename]);
    } catch (storageErr) {
      console.warn(`Could not delete file ${upload.filename} from storage:`, storageErr);
      // Proceed to delete DB record anyway to avoid orphan records in DB
    }

    // 2. Delete database record
    await prisma.upload.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Arquivo excluído com sucesso.' });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json({ error: 'Erro ao excluir mídia.' }, { status: 500 });
  }
}
