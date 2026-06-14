import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Retrieve all flows
export async function GET() {
  try {
    const flows = await prisma.flow.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(flows);
  } catch (error) {
    console.error('Error fetching flows:', error);
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }
}

// POST: Create a new flow
export async function POST(request) {
  try {
    const data = await request.json();
    const { name, trigger, keywords, steps, isActive, agentId, connectionId } = data;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const flow = await prisma.flow.create({
      data: {
        name,
        trigger: trigger || 'keyword',
        keywords: keywords || '',
        steps: steps ? JSON.stringify(steps) : '[]',
        isActive: isActive !== undefined ? isActive : true,
        agentId: agentId || null,
        connectionId: connectionId || null
      }
    });

    return NextResponse.json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    return NextResponse.json({ error: 'Failed to create flow' }, { status: 500 });
  }
}

// PUT: Update an existing flow
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, name, trigger, keywords, steps, isActive, agentId, connectionId } = data;

    if (!id) {
      return NextResponse.json({ error: 'Flow ID is required' }, { status: 400 });
    }

    const flow = await prisma.flow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(keywords !== undefined && { keywords }),
        ...(steps !== undefined && { steps: JSON.stringify(steps) }),
        ...(isActive !== undefined && { isActive }),
        ...(agentId !== undefined && { agentId: agentId || null }),
        ...(connectionId !== undefined && { connectionId: connectionId || null })
      }
    });

    return NextResponse.json(flow);
  } catch (error) {
    console.error('Error updating flow:', error);
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }
}

// DELETE: Delete a flow
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Flow ID is required' }, { status: 400 });
    }

    await prisma.flow.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
  }
}
