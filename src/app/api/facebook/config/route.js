import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdAccounts } from '@/lib/facebook';

// GET: Check configuration status
export async function GET() {
  try {
    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return NextResponse.json({ hasConfig: false });
    }

    return NextResponse.json({
      hasConfig: true,
      id: config.id,
      adAccountId: config.adAccountId,
      createdAt: config.createdAt
    });
  } catch (error) {
    console.error('Error fetching Facebook config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

// POST: Save Access Token and test connection
export async function POST(request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access Token é obrigatório.' }, { status: 400 });
    }

    // Test token by fetching accounts
    try {
      await getAdAccounts(accessToken);
    } catch (err) {
      return NextResponse.json({ error: `Token inválido: ${err.message}` }, { status: 400 });
    }

    // Deactivate previous configs
    await prisma.facebookConfig.updateMany({
      data: { isActive: false }
    });

    // Create new config
    const config = await prisma.facebookConfig.create({
      data: {
        accessToken,
        adAccountId: '',
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      id: config.id,
      message: 'Token do Facebook conectado com sucesso!'
    });
  } catch (error) {
    console.error('Error saving Facebook config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

// PUT: Update selected Ad Account ID
export async function PUT(request) {
  try {
    const { adAccountId } = await request.json();

    if (!adAccountId) {
      return NextResponse.json({ error: 'ID da conta de anúncios é obrigatório.' }, { status: 400 });
    }

    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return NextResponse.json({ error: 'Nenhuma configuração ativa do Facebook encontrada.' }, { status: 404 });
    }

    const updated = await prisma.facebookConfig.update({
      where: { id: config.id },
      data: { adAccountId }
    });

    return NextResponse.json({
      success: true,
      adAccountId: updated.adAccountId,
      message: 'Conta de anúncios atualizada com sucesso!'
    });
  } catch (error) {
    console.error('Error updating Facebook Ad Account:', error);
    return NextResponse.json({ error: 'Failed to update ad account' }, { status: 500 });
  }
}

// DELETE: Remove Facebook connection
export async function DELETE() {
  try {
    await prisma.facebookConfig.updateMany({
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: 'Conexão com o Facebook removida.' });
  } catch (error) {
    console.error('Error deleting Facebook config:', error);
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 });
  }
}
