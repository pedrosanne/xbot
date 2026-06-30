import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdAccounts } from '@/lib/facebook';

// GET: List all ad accounts for the connected Facebook token
export async function GET() {
  try {
    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config || !config.accessToken) {
      return NextResponse.json({ error: 'Nenhuma conta do Facebook conectada.' }, { status: 400 });
    }

    const accounts = await getAdAccounts(config.accessToken);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching Facebook ad accounts:', error);
    return NextResponse.json({ error: error.message || 'Falha ao buscar contas de anúncios.' }, { status: 500 });
  }
}
