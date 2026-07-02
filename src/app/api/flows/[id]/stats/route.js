import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing flow ID' }, { status: 400 });
    }

    const stats = await prisma.flowStepStat.findMany({
      where: { flowId: id }
    });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching flow stats:', error);
    return NextResponse.json({ error: 'Failed to fetch flow stats' }, { status: 500 });
  }
}
