import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const offers = await prisma.offer.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Erro ao carregar ofertas.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { productId, name, price, description, code } = await request.json();

    if (!productId || !name || price === undefined) {
      return NextResponse.json({ error: 'Produto, Nome e Preço são obrigatórios.' }, { status: 400 });
    }

    const offer = await prisma.offer.create({
      data: {
        productId,
        name,
        price: parseFloat(price),
        description: description || '',
        code: code || ''
      },
      include: { product: true }
    });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'Erro ao criar oferta.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, productId, name, price, description, code } = await request.json();

    if (!id || !productId || !name || price === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const offer = await prisma.offer.update({
      where: { id },
      data: {
        productId,
        name,
        price: parseFloat(price),
        description: description ?? '',
        code: code ?? ''
      },
      include: { product: true }
    });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: 'Erro ao atualizar oferta.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.offer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json({ error: 'Erro ao excluir oferta.' }, { status: 500 });
  }
}
