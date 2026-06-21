import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const upsells = await prisma.upsell.findMany({
      include: {
        product: true,
        targetProduct: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(upsells);
  } catch (error) {
    console.error('Error fetching upsells:', error);
    return NextResponse.json({ error: 'Erro ao carregar upsells.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { productId, targetProductId, title, description, price } = await request.json();

    if (!productId || !targetProductId || !title || price === undefined) {
      return NextResponse.json({ error: 'Produto principal, Produto upsell, Título e Preço são obrigatórios.' }, { status: 400 });
    }

    if (productId === targetProductId) {
      return NextResponse.json({ error: 'O produto principal e o produto upsell não podem ser o mesmo.' }, { status: 400 });
    }

    const upsell = await prisma.upsell.create({
      data: {
        productId,
        targetProductId,
        title,
        description: description || '',
        price: parseFloat(price)
      },
      include: {
        product: true,
        targetProduct: true
      }
    });

    return NextResponse.json(upsell);
  } catch (error) {
    console.error('Error creating upsell:', error);
    return NextResponse.json({ error: 'Erro ao criar upsell.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.upsell.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting upsell:', error);
    return NextResponse.json({ error: 'Erro ao excluir upsell.' }, { status: 500 });
  }
}
