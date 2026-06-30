import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

export async function GET() {
  try {
    const automations = await prisma.groupAutomation.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(automations);
  } catch (error) {
    console.error('Error fetching group automations:', error);
    return NextResponse.json({ error: 'Failed to fetch group automations' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, type, event, target, message, productId, isActive, apiType, apiUrl, apiToken } = await request.json();

    if (!name || !type || !event || !target) {
      return NextResponse.json({ error: 'Nome, tipo, evento e alvo são obrigatórios' }, { status: 400 });
    }

    const automation = await prisma.groupAutomation.create({
      data: {
        name,
        type,
        event,
        target,
        message: message || '',
        productId: productId || null,
        isActive: isActive !== undefined ? isActive : true,
        apiType: apiType || 'official',
        apiUrl: apiUrl || '',
        apiToken: apiToken || ''
      }
    });

    await logToDb('INFO', 'API', `Nova automação de grupo criada: ${name} (Evento: ${event})`);
    return NextResponse.json(automation);
  } catch (error) {
    console.error('Error creating group automation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create group automation' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, type, event, target, message, productId, isActive, apiType, apiUrl, apiToken } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const automation = await prisma.groupAutomation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(event !== undefined && { event }),
        ...(target !== undefined && { target }),
        ...(message !== undefined && { message }),
        ...(productId !== undefined && { productId }),
        ...(isActive !== undefined && { isActive }),
        ...(apiType !== undefined && { apiType }),
        ...(apiUrl !== undefined && { apiUrl }),
        ...(apiToken !== undefined && { apiToken })
      }
    });

    await logToDb('INFO', 'API', `Automação de grupo atualizada: ${name}`);
    return NextResponse.json(automation);
  } catch (error) {
    console.error('Error updating group automation:', error);
    return NextResponse.json({ error: error.message || 'Failed to update group automation' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const automation = await prisma.groupAutomation.delete({
      where: { id }
    });

    await logToDb('INFO', 'API', `Automação de grupo excluída: ${automation.name}`);
    return NextResponse.json({ success: true, automation });
  } catch (error) {
    console.error('Error deleting group automation:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete group automation' }, { status: 500 });
  }
}
