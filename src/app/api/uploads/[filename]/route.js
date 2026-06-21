import { prisma } from '@/lib/prisma';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // Look up in database
    const upload = await prisma.upload.findUnique({
      where: { filename }
    });

    if (!upload) {
      console.warn(`File not found in database: ${filename}`);
      return new Response('File not found', { status: 404 });
    }

    // Determine content type based on database mimeType or file extension
    let contentType = upload.mimeType;
    if (!contentType || contentType === 'application/octet-stream') {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.ogg') contentType = 'audio/ogg';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.pdf') contentType = 'application/pdf';
    }

    // Retrieve original filename if it has separator
    let originalFilename = filename;
    if (filename.includes('___')) {
      const parts = filename.split('___');
      const originalPart = parts[0];
      const ext = path.extname(filename);
      originalFilename = originalPart.endsWith(ext) ? originalPart : `${originalPart}${ext}`;
    }

    return new Response(upload.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${encodeURIComponent(originalFilename)}"`
      },
    });
  } catch (error) {
    console.error('Error serving file from database:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

