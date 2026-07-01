import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(period));

    // Get all usage within the period
    const usages = await prisma.aiUsage.findMany({
      where: {
        timestamp: {
          gte: dateLimit
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Aggregates
    let totalCost = 0;
    let geminiTokens = 0;
    let elevenLabsChars = 0;

    // Daily breakdown for charts
    const dailyDataMap = {};

    for (const u of usages) {
      totalCost += u.cost;
      
      if (u.provider === 'GEMINI') {
        geminiTokens += u.tokens;
      } else if (u.provider === 'ELEVENLABS') {
        elevenLabsChars += u.tokens;
      }

      // Group by YYYY-MM-DD
      const dateStr = u.timestamp.toISOString().split('T')[0];
      if (!dailyDataMap[dateStr]) {
        dailyDataMap[dateStr] = { date: dateStr, cost: 0, tokens: 0, characters: 0 };
      }
      
      dailyDataMap[dateStr].cost += u.cost;
      if (u.provider === 'GEMINI') {
        dailyDataMap[dateStr].tokens += u.tokens;
      } else if (u.provider === 'ELEVENLABS') {
        dailyDataMap[dateStr].characters += u.tokens;
      }
    }

    const dailyData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

    // Get recent logs (last 50)
    const recentLogs = await prisma.aiUsage.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalCost,
        geminiTokens,
        elevenLabsChars
      },
      chartData: dailyData,
      recentLogs
    });

  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados de uso de IA.' }, { status: 500 });
  }
}
