import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFacebookAdsData } from '@/lib/facebook';

// GET: Fetch Facebook elements (campaigns/adsets/ads) and merge with system sales data (ROI)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'campaign'; // 'campaign' | 'adset' | 'ad'
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const config = await prisma.facebookConfig.findFirst({
      where: { isActive: true }
    });

    if (!config || !config.accessToken || !config.adAccountId) {
      return NextResponse.json({ 
        error: 'Facebook não configurado.', 
        setupRequired: true 
      });
    }

    // 1. Fetch data from Facebook Ads API
    let fbElements = [];
    try {
      fbElements = await getFacebookAdsData({
        accessToken: config.accessToken,
        adAccountId: config.adAccountId,
        level,
        startDate,
        endDate
      });
    } catch (err) {
      console.error('Error fetching Facebook Ads data:', err);
      return NextResponse.json({ error: `Erro na API do Facebook: ${err.message}` }, { status: 500 });
    }

    const elementIds = fbElements.map(el => el.id);

    // 2. Query system sales matching these Facebook IDs in the date range
    // We match against the appropriate UTM field based on the selected level:
    // - campaign -> utmCampaign
    // - adset -> utmTerm
    // - ad -> utmContent
    const utmField = level === 'campaign' ? 'utmCampaign' : level === 'adset' ? 'utmTerm' : 'utmContent';

    const contacts = await prisma.contact.findMany({
      where: {
        [utmField]: { in: elementIds }
      },
      select: {
        id: true,
        [utmField]: true,
        payments: {
          where: {
            status: 'PAID',
            createdAt: {
              gte: new Date(`${startDate}T00:00:00.000Z`),
              lte: new Date(`${endDate}T23:59:59.999Z`)
            }
          },
          select: {
            amount: true
          }
        }
      }
    });

    // 3. Aggregate sales by Facebook ID
    const salesMap = {};
    contacts.forEach(contact => {
      const fbId = contact[utmField];
      if (!fbId) return;

      if (!salesMap[fbId]) {
        salesMap[fbId] = { salesCount: 0, revenue: 0 };
      }

      if (contact.payments && contact.payments.length > 0) {
        salesMap[fbId].salesCount += contact.payments.length;
        salesMap[fbId].revenue += contact.payments.reduce((sum, p) => sum + p.amount, 0);
      }
    });

    // 4. Merge Facebook Ads insights with our sales data
    const results = fbElements.map(el => {
      const insights = el.insights?.data?.[0] || {};
      const spend = parseFloat(insights.spend || 0);
      const impressions = parseInt(insights.impressions || 0, 10);
      const clicks = parseInt(insights.inline_link_clicks || 0, 10);

      const systemSales = salesMap[el.id] || { salesCount: 0, revenue: 0 };
      const revenue = systemSales.revenue;
      const salesCount = systemSales.salesCount;

      const profit = revenue - spend;
      const cpa = salesCount > 0 ? spend / salesCount : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;

      // Budget handling (Facebook returns budgets in cents or micro-currency)
      // We convert it to standard float
      let budget = 0;
      let budgetType = 'Diário';
      if (el.daily_budget) {
        budget = parseFloat(el.daily_budget) / 100;
        budgetType = 'Diário';
      } else if (el.lifetime_budget) {
        budget = parseFloat(el.lifetime_budget) / 100;
        budgetType = 'Vitalício';
      }

      return {
        id: el.id,
        name: el.name,
        status: el.status,
        objective: el.objective || '',
        budget,
        budgetType,
        campaign: el.campaign ? { id: el.campaign.id, name: el.campaign.name } : null,
        adset: el.adset ? { id: el.adset.id, name: el.adset.name } : null,
        spend,
        impressions,
        clicks,
        salesCount,
        revenue,
        profit,
        cpa,
        roas,
        roi
      };
    });

    return NextResponse.json({
      success: true,
      level,
      startDate,
      endDate,
      data: results
    });
  } catch (error) {
    console.error('Error in Facebook Campaigns route:', error);
    return NextResponse.json({ error: 'Failed to process tracking data' }, { status: 500 });
  }
}
