import { prisma } from '@/lib/prisma';
import path from 'path';
import sharp from 'sharp';

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    const supabaseUrl = process.env.SUPABASE_URL;
    const bucket = process.env.SUPABASE_BUCKET || 'media';
    let publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

    // Redirect non-webp files directly to Supabase public URL if they exist (bypasses 4.5MB Vercel response payload limit)
    const ext = path.extname(filename).toLowerCase();
    if (ext !== '.webp') {
      const checkRes = await fetch(publicUrl, { method: 'HEAD' });
      if (checkRes.ok) {
        return new Response(null, {
          status: 307,
          headers: { Location: publicUrl }
        });
      }
    }

    // Fetch binary content from Supabase Storage
    let storageRes = await fetch(publicUrl);
    let buffer;
    let actualFilename = filename;
    let wasWebpConverted = false;

    if (!storageRes.ok) {
      // Fallback: If requested a PNG or JPG but file is not found, check if it was originally uploaded as a WebP
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        const webpFilename = filename.slice(0, -ext.length) + '.webp';
        console.log(`File not found for ${filename}. Trying fallback to WebP: ${webpFilename}`);
        const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${webpFilename}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          storageRes = fallbackRes;
          actualFilename = webpFilename;
          wasWebpConverted = true;
        }
      }
    }

    if (!storageRes.ok) {
      console.warn(`File not found in Supabase Storage: ${filename}`);
      return new Response('File not found', { status: 404 });
    }

    buffer = Buffer.from(await storageRes.arrayBuffer());

    // Look up in database for metadata (optional fallback) using the actual filename
    const upload = await prisma.upload.findUnique({
      where: { filename: actualFilename }
    });

    // Determine content type based on database mimeType or file extension
    let contentType = upload?.mimeType;
    if (wasWebpConverted) {
      contentType = 'image/webp';
    }

    if (!contentType || contentType === 'application/octet-stream') {
      const ext = path.extname(actualFilename).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.ogg') contentType = 'audio/ogg';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.pdf') contentType = 'application/pdf';
    }

    // Retrieve original filename if it has separator
    let originalFilename = actualFilename;
    if (actualFilename.includes('___')) {
      const parts = actualFilename.split('___');
      const originalPart = parts[0];
      const ext = path.extname(actualFilename);
      originalFilename = originalPart.endsWith(ext) ? originalPart : `${originalPart}${ext}`;
    }

    let dataToSend = buffer;

    // Dynamically convert WebP to PNG for WhatsApp compatibility
    if (contentType === 'image/webp' || wasWebpConverted) {
      try {
        dataToSend = await sharp(buffer)
          .png({ compressionLevel: 9, quality: 80 })
          .toBuffer();
        contentType = 'image/png';
        if (originalFilename.toLowerCase().endsWith('.webp')) {
          originalFilename = originalFilename.slice(0, -5) + '.png';
        }
      } catch (sharpError) {
        console.error('Error converting WebP to PNG dynamically, serving original:', sharpError);
      }
    }

    return new Response(dataToSend, {
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

