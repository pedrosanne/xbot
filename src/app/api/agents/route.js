import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all agents
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST: Create a new agent
export async function POST(request) {
  try {
    const { name, description, systemPrompt, model, temperature, isActive } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // If making this active, deactivate all other agents first
    if (isActive) {
      await prisma.agent.updateMany({
        data: { isActive: false }
      });
    }

    const newAgent = await prisma.agent.create({
      data: {
        name,
        description: description || '',
        systemPrompt: systemPrompt || 'Você é um atendente simpático.',
        model: model || 'gemini-1.5-flash',
        temperature: parseFloat(temperature) || 0.7,
        isActive: isActive || false
      }
    });

    return NextResponse.json(newAgent);
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

// PUT: Update an existing agent
export async function PUT(request) {
  try {
    const { id, name, description, systemPrompt, model, temperature, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // If making this active, deactivate all other agents first
    if (isActive) {
      await prisma.agent.updateMany({
        where: { id: { not: id } },
        data: { isActive: false }
      });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        name,
        description,
        systemPrompt,
        model,
        temperature: parseFloat(temperature),
        isActive
      }
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// DELETE: Delete an agent
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  try {
    await prisma.agent.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
