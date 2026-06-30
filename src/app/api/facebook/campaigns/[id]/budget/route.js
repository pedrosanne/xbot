import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateFbElementBudget } from '@/lib/facebook';

// POST: Update budget of a campaign or adset
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { budget } = await request.json(); // budget is standard float (e.g. 100.50)

    if (budget === undefined || isNaN(budget) || budget <= 0) {
      return NextResponse.json({ error: 'Orçamento inválido. Deve ser um valor maior que zero.' }, { status: 400 });
    }

    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config || !config.accessToken) {
      return NextResponse.json({ error: 'Facebook não configurado.' }, { status: 400 });
    }

    try {
      const result = await updateFbElementBudget(config.accessToken, id, budget);
      return NextResponse.json({ success: true, result });
    } catch (err) {
      console.error('Error updating Facebook budget:', err);
      return NextResponse.json({ error: `Erro no Facebook: ${err.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in budget route:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}
