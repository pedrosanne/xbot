import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = params;
    const filePath = path.join('/tmp', filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found in /tmp: ${filePath}`);
      return new Response('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    const ext = path.extname(filename).toLowerCase();
    
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.pdf') contentType = 'application/pdf';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file from /tmp:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
