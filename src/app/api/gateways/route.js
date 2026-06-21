import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get('session');
    const token = cookie ? cookie.value : null;
    if (!token) return null;
    return await verifyToken(token);
  } catch (e) {
    return null;
  }
}

// GET: List all payment gateways
export async function GET() {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const gateways = await prisma.paymentGateway.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(gateways);
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return NextResponse.json({ error: 'Erro ao buscar gateways.' }, { status: 500 });
  }
}

// POST: Create a payment gateway
export async function POST(req) {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { name, type, isActive, apiKey, publicKey, webhookSecret } = await req.json();
    if (!name || !type) {
      return NextResponse.json({ error: 'Nome e tipo são obrigatórios.' }, { status: 400 });
    }

    const gateway = await prisma.paymentGateway.create({
      data: {
        name,
        type,
        isActive: isActive ?? true,
        apiKey: apiKey || '',
        publicKey: publicKey || '',
        webhookSecret: webhookSecret || ''
      }
    });

    return NextResponse.json(gateway);
  } catch (error) {
    console.error('Error creating gateway:', error);
    return NextResponse.json({ error: 'Erro ao criar gateway.' }, { status: 500 });
  }
}

// PUT: Update a payment gateway
export async function PUT(req) {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { id, name, type, isActive, apiKey, publicKey, webhookSecret } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (isActive !== undefined) data.isActive = isActive;
    if (apiKey !== undefined) data.apiKey = apiKey;
    if (publicKey !== undefined) data.publicKey = publicKey;
    if (webhookSecret !== undefined) data.webhookSecret = webhookSecret;

    const gateway = await prisma.paymentGateway.update({
      where: { id },
      data
    });

    return NextResponse.json(gateway);
  } catch (error) {
    console.error('Error updating gateway:', error);
    return NextResponse.json({ error: 'Erro ao atualizar gateway.' }, { status: 500 });
  }
}

// DELETE: Delete a payment gateway
export async function DELETE(req) {
  const userPayload = await getAuthenticatedUser();
  if (!userPayload) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.paymentGateway.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gateway:', error);
    return NextResponse.json({ error: 'Erro ao excluir gateway.' }, { status: 500 });
  }
}
