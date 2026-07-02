import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const providers = await prisma.aiProvider.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usages: {
          select: { cost: true, tokens: true, durationMs: true }
        }
      }
    });
    // Mask API keys for security and calculate metrics
    const masked = providers.map(p => {
      const totalCost = p.usages.reduce((acc, u) => acc + (u.cost || 0), 0);
      const totalTokens = p.usages.reduce((acc, u) => acc + (u.tokens || 0), 0);
      const avgDuration = p.usages.length > 0 
        ? p.usages.reduce((acc, u) => acc + (u.durationMs || 0), 0) / p.usages.length 
        : 0;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const dailyUsage = p.usages.filter(u => new Date(u.timestamp) >= startOfDay).length;

      const { usages, ...rest } = p;
      return {
        ...rest,
        apiKey: p.apiKey ? `${p.apiKey.substring(0, 4)}...${p.apiKey.substring(p.apiKey.length - 4)}` : '',
        metrics: {
          totalCost,
          totalTokens,
          avgDuration: Math.round(avgDuration),
          dailyUsage
        }
      };
    });
    return NextResponse.json(masked);
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, provider, model, apiKey } = data;

    if (!name || !provider || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newProvider = await prisma.aiProvider.create({
      data: {
        name,
        provider,
        model: model || 'gemini-2.5-flash',
        apiKey,
        isActive: true
      }
    });

    return NextResponse.json({ ...newProvider, apiKey: '***' }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
