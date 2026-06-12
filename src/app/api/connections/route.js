import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

export async function GET() {
  try {
    const connections = await prisma.whatsAppConnection.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, phoneNumber, whatsappToken, whatsappPhoneId, whatsappVerifyToken, isActive } = await request.json();

    if (!name || !whatsappPhoneId) {
      return NextResponse.json({ error: 'Nome e Phone Number ID são obrigatórios' }, { status: 400 });
    }

    const connection = await prisma.whatsAppConnection.create({
      data: {
        name,
        phoneNumber: phoneNumber || '',
        whatsappToken: whatsappToken || '',
        whatsappPhoneId,
        whatsappVerifyToken: whatsappVerifyToken || 'antigravity_token_123',
        isActive: isActive !== undefined ? isActive : true
      }
    });

    await logToDb('INFO', 'API', `Nova conexão WhatsApp criada: ${name} (ID: ${whatsappPhoneId})`);
    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json({ error: error.message || 'Failed to create connection' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, phoneNumber, whatsappToken, whatsappPhoneId, whatsappVerifyToken, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const connection = await prisma.whatsAppConnection.update({
      where: { id },
      data: {
        name,
        phoneNumber,
        whatsappToken,
        whatsappPhoneId,
        whatsappVerifyToken,
        isActive
      }
    });

    await logToDb('INFO', 'API', `Conexão WhatsApp atualizada: ${name} (ID: ${whatsappPhoneId})`);
    return NextResponse.json(connection);
  } catch (error) {
    console.error('Error updating connection:', error);
    return NextResponse.json({ error: error.message || 'Failed to update connection' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const connection = await prisma.whatsAppConnection.delete({
      where: { id }
    });

    await logToDb('INFO', 'API', `Conexão WhatsApp excluída: ${connection.name} (ID: ${connection.whatsappPhoneId})`);
    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete connection' }, { status: 500 });
  }
}
