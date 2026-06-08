import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch latest 100 logs
export async function GET() {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return NextResponse.json({ error: 'Failed to fetch system logs' }, { status: 500 });
  }
}

// DELETE: Clear all logs from the database
export async function DELETE() {
  try {
    await prisma.log.deleteMany();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing system logs:', error);
    return NextResponse.json({ error: 'Failed to clear system logs' }, { status: 500 });
  }
}
