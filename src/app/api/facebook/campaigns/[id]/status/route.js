import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateFbElementStatus } from '@/lib/facebook';

// POST: Update status of a campaign, adset, or ad (ACTIVE | PAUSED)
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status || (status !== 'ACTIVE' && status !== 'PAUSED')) {
      return NextResponse.json({ error: 'Status inválido. Deve ser ACTIVE ou PAUSED.' }, { status: 400 });
    }

    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config || !config.accessToken) {
      return NextResponse.json({ error: 'Facebook não configurado.' }, { status: 400 });
    }

    try {
      const result = await updateFbElementStatus(config.accessToken, id, status);
      return NextResponse.json({ success: true, result });
    } catch (err) {
      console.error('Error updating Facebook status:', err);
      return NextResponse.json({ error: `Erro no Facebook: ${err.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in status route:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
