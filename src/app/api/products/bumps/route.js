import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const bumps = await prisma.orderBump.findMany({
      include: {
        product: true,
        targetProduct: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(bumps);
  } catch (error) {
    console.error('Error fetching order bumps:', error);
    return NextResponse.json({ error: 'Erro ao carregar order bumps.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { productId, targetProductId, title, description, price } = await request.json();

    if (!productId || !targetProductId || !title || price === undefined) {
      return NextResponse.json({ error: 'Produto principal, Produto bump, Título e Preço são obrigatórios.' }, { status: 400 });
    }

    if (productId === targetProductId) {
      return NextResponse.json({ error: 'O produto principal e o produto bump não podem ser o mesmo.' }, { status: 400 });
    }

    const bump = await prisma.orderBump.create({
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

    return NextResponse.json(bump);
  } catch (error) {
    console.error('Error creating order bump:', error);
    return NextResponse.json({ error: 'Erro ao criar order bump.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.orderBump.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order bump:', error);
    return NextResponse.json({ error: 'Erro ao excluir order bump.' }, { status: 500 });
  }
}
