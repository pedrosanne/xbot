import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Erro ao carregar produtos.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, description, type, price, imageUrl, postSaleFlowId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        type: type || 'DIGITAL',
        price: parseFloat(price) || 0.0,
        imageUrl: imageUrl || '',
        postSaleFlowId: postSaleFlowId || null
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Erro ao criar produto.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, description, type, price, imageUrl, postSaleFlowId } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'ID e Nome são obrigatórios.' }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description: description ?? '',
        type: type || 'DIGITAL',
        price: parseFloat(price) ?? 0.0,
        imageUrl: imageUrl ?? '',
        postSaleFlowId: postSaleFlowId !== undefined ? postSaleFlowId : undefined
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Erro ao excluir produto.' }, { status: 500 });
  }
}
