import { NextResponse } from 'next/server';
import fs from 'fs';
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

    // Create unique filename
    const extension = path.extname(file.name) || '.ogg';
    const filename = `manual_upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`;
    const filePath = path.join('/tmp', filename);

    // Save file locally
    fs.writeFileSync(filePath, buffer);
    console.log(`Manual upload saved to: ${filePath}`);

    const fileUrl = `/api/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl, filename: file.name });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json({ error: 'Falha ao processar upload.' }, { status: 500 });
  }
}
