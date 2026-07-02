import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const quickReplies = await prisma.quickReply.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(quickReplies);
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    return NextResponse.json({ error: 'Failed to fetch quick replies' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { title, content } = data;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const newReply = await prisma.quickReply.create({
      data: {
        title: title || '',
        content
      }
    });

    return NextResponse.json(newReply, { status: 201 });
  } catch (error) {
    console.error('Error creating quick reply:', error);
    return NextResponse.json({ error: 'Failed to create quick reply' }, { status: 500 });
  }
}
