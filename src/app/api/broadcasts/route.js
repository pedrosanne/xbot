import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

// GET: Retrieve all broadcasts
export async function GET() {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          select: {
            id: true,
            contactId: true,
            status: true,
            error: true,
            timestamp: true
          }
        }
      }
    });
    return NextResponse.json(broadcasts);
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 });
  }
}

// POST: Create a new broadcast campaign
export async function POST(request) {
  try {
    const data = await request.json();
    const { name, message, flowId, senderIds, contactIds } = data;

    if (!name || !message || !senderIds || !contactIds || contactIds.length === 0) {
      return NextResponse.json({ error: 'Nome, mensagem, conexões remetentes e contatos são obrigatórios.' }, { status: 400 });
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        name,
        message,
        flowId: flowId || null,
        senderIds: Array.isArray(senderIds) ? senderIds.join(',') : senderIds,
        totalLeads: contactIds.length,
        status: 'PENDING'
      }
    });

    // We also need to return the list of contactIds so the frontend can queue them
    await logToDb('INFO', 'API', `Nova campanha de disparos em massa criada: ${name} (Total: ${contactIds.length} contatos)`);
    
    return NextResponse.json({
      success: true,
      broadcast,
      contactIds
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }
}

// PUT: Update broadcast status or details
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, status } = data;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 });
    }

    const broadcast = await prisma.broadcast.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(broadcast);
  } catch (error) {
    console.error('Error updating broadcast:', error);
    return NextResponse.json({ error: 'Failed to update broadcast' }, { status: 500 });
  }
}

// DELETE: Delete a broadcast
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    await prisma.broadcast.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    return NextResponse.json({ error: 'Failed to delete broadcast' }, { status: 500 });
  }
}
