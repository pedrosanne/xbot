import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Revalidate 0 ensures we always get fresh data for metrics
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filters
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { externalId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Parallel fetch for list and metrics
    const [sales, totalSalesCount, allMetricsData] = await Promise.all([
      // Paginated list
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: { select: { id: true, name: true, phone: true } },
          product: { select: { id: true, name: true } },
          gateway: { select: { id: true, name: true, type: true } }
        }
      }),
      // Total count for pagination
      prisma.payment.count({ where }),
      // Fetch all required fields to compute metrics (without pagination/search filters)
      prisma.payment.findMany({
        select: { status: true, amount: true }
      })
    ]);

    // Compute metrics
    const metrics = {
      totalRevenue: 0,
      approvedCount: 0,
      pendingCount: 0,
      refundedCount: 0,
      cancelledCount: 0,
      totalCount: allMetricsData.length
    };

    allMetricsData.forEach(p => {
      const st = p.status.toUpperCase();
      if (st === 'PAID' || st === 'APPROVED' || st === 'COMPLETED') {
        metrics.totalRevenue += (p.amount || 0);
        metrics.approvedCount++;
      } else if (st === 'PENDING' || st === 'PROCESSING') {
        metrics.pendingCount++;
      } else if (st === 'REFUNDED') {
        metrics.refundedCount++;
      } else if (st === 'CANCELLED' || st === 'FAILED' || st === 'CANCELED') {
        metrics.cancelledCount++;
      }
    });

    metrics.averageTicket = metrics.approvedCount > 0 ? metrics.totalRevenue / metrics.approvedCount : 0;

    return NextResponse.json({
      success: true,
      sales,
      pagination: {
        total: totalSalesCount,
        page,
        limit,
        totalPages: Math.ceil(totalSalesCount / limit)
      },
      metrics
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados de vendas.' }, { status: 500 });
  }
}
