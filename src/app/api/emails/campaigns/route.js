import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: List all email campaigns OR get single campaign with logs
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');

  try {
    if (campaignId) {
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: { logs: true }
      });
      return NextResponse.json(campaign);
    }

    const campaigns = await prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { logs: true }
        }
      }
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching email campaigns:', error);
    return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 });
  }
}

// POST: Create a new email campaign
export async function POST(request) {
  try {
    const { name, subject, body, targetType, targetContactIds, tagFilter } = await request.json();

    if (!name || !subject || !body) {
      return NextResponse.json({ error: 'Nome, assunto e corpo são obrigatórios' }, { status: 400 });
    }

    // Determine target contacts
    let recipientIds = [];

    if (targetType === 'all') {
      const contacts = await prisma.contact.findMany({
        where: {
          email: { not: '' }
        },
        select: { id: true }
      });
      recipientIds = contacts.map(c => c.id);
    } else if (targetType === 'tag' && tagFilter) {
      const contacts = await prisma.contact.findMany({
        where: {
          email: { not: '' },
          tags: { contains: tagFilter, mode: 'insensitive' }
        },
        select: { id: true }
      });
      recipientIds = contacts.map(c => c.id);
    } else if (targetType === 'selected' && Array.isArray(targetContactIds)) {
      // Filter out contacts that don't have emails
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: targetContactIds },
          email: { not: '' }
        },
        select: { id: true }
      });
      recipientIds = contacts.map(c => c.id);
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead com e-mail válido encontrado para o alvo selecionado' }, { status: 400 });
    }

    // Create campaign in PENDING status
    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        body,
        status: 'PENDING',
        totalRecipients: recipientIds.length
      }
    });

    return NextResponse.json({
      success: true,
      campaign,
      recipientIds
    });
  } catch (error) {
    console.error('Error creating email campaign:', error);
    return NextResponse.json({ error: 'Erro ao criar campanha de e-mail' }, { status: 500 });
  }
}

// PUT: Update campaign status
export async function PUT(request) {
  try {
    const { campaignId, status } = await request.json();

    if (!campaignId || !status) {
      return NextResponse.json({ error: 'campaignId e status são obrigatórios' }, { status: 400 });
    }

    const updated = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 });
  }
}

// DELETE: Delete a campaign (cascade logs)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });
    }

    await prisma.emailCampaign.delete({
      where: { id: campaignId }
    });

    return NextResponse.json({ success: true, message: 'Campanha excluída com sucesso!' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Erro ao excluir campanha' }, { status: 500 });
  }
}
