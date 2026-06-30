import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const pixels = await prisma.pixel.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(pixels);
  } catch (error) {
    console.error('Error fetching pixels:', error);
    return NextResponse.json({ error: 'Erro ao carregar pixels.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { productId, platform, pixelId, token, testCode } = await request.json();

    if (!productId || !platform || !pixelId) {
      return NextResponse.json({ error: 'Produto, Plataforma e ID do Pixel são obrigatórios.' }, { status: 400 });
    }

    const pixel = await prisma.pixel.create({
      data: {
        productId,
        platform,
        pixelId,
        token: token || '',
        testCode: testCode || ''
      },
      include: { product: true }
    });

    return NextResponse.json(pixel);
  } catch (error) {
    console.error('Error creating pixel:', error);
    return NextResponse.json({ error: 'Erro ao criar pixel.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.pixel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pixel:', error);
    return NextResponse.json({ error: 'Erro ao excluir pixel.' }, { status: 500 });
  }
}
