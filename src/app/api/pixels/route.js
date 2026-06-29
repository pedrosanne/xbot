import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all contacts with UTMs and their PAID payments
    const contacts = await prisma.contact.findMany({
      select: {
        id: true,
        utmSource: true,
        utmCampaign: true,
        utmMedium: true,
        payments: {
          where: { status: 'PAID' },
          select: { amount: true }
        }
      }
    });

    // Aggregate stats by Source + Campaign
    const stats = {};

    contacts.forEach(c => {
      const source = c.utmSource || 'Orgânico / Direto';
      const campaign = c.utmCampaign || '(sem campanha)';
      const medium = c.utmMedium || '';
      
      const key = `${source}||${campaign}||${medium}`;
      
      if (!stats[key]) {
        stats[key] = {
          source,
          campaign,
          medium,
          leads: 0,
          salesCount: 0,
          revenue: 0
        };
      }
      
      stats[key].leads += 1;
      
      if (c.payments && c.payments.length > 0) {
        stats[key].salesCount += c.payments.length;
        stats[key].revenue += c.payments.reduce((sum, p) => sum + p.amount, 0);
      }
    });

    return NextResponse.json({
      success: true,
      stats: Object.values(stats)
    });
  } catch (error) {
    console.error('Error fetching pixel/utm stats:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking stats' }, { status: 500 });
  }
}
