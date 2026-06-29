import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || '';

    // 1. Fetch active connections participating in distribution that haven't hit their limit
    const connections = await prisma.whatsAppConnection.findMany({
      where: {
        isActive: true,
        isDistributionEnabled: true,
      }
    });

    // Filter connections that haven't hit their daily limit
    const availableConnections = connections.filter(conn => conn.currentDayLeads < conn.dailyLeadLimit);

    let chosenConnection = null;

    if (availableConnections.length > 0) {
      // 2. Weighted Random Distribution Algorithm
      const totalWeight = availableConnections.reduce((sum, conn) => sum + (conn.distributionWeight || 1), 0);
      let randomNum = Math.random() * totalWeight;

      for (const conn of availableConnections) {
        randomNum -= (conn.distributionWeight || 1);
        if (randomNum <= 0) {
          chosenConnection = conn;
          break;
        }
      }

      // Fallback in case of rounding issues
      if (!chosenConnection) {
        chosenConnection = availableConnections[0];
      }
    } else if (connections.length > 0) {
      // Fallback if all distribution connections hit their limit (take the one with the highest limit)
      await logToDb('WARN', 'FLOW', 'Todos os números de WhatsApp na rotação atingiram o limite diário. Usando fallback.');
      chosenConnection = connections.reduce((max, conn) => conn.dailyLeadLimit > max.dailyLeadLimit ? conn : max, connections[0]);
    } else {
      // Ultimate fallback: Fetch any active connection
      const fallbackConnection = await prisma.whatsAppConnection.findFirst({
        where: { isActive: true }
      });
      chosenConnection = fallbackConnection;
    }

    if (!chosenConnection || !chosenConnection.phoneNumber) {
      await logToDb('ERROR', 'FLOW', 'Tentativa de redirecionamento de lead sem número de WhatsApp ativo configurado no sistema.');
      return new Response('Nenhum número de WhatsApp ativo configurado no sistema.', { status: 404 });
    }

    // 3. Increment daily count for the chosen number
    if (chosenConnection.isDistributionEnabled) {
      await prisma.whatsAppConnection.update({
        where: { id: chosenConnection.id },
        data: { currentDayLeads: { increment: 1 } }
      });
    }

    const cleanPhone = chosenConnection.phoneNumber.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

    await logToDb('INFO', 'FLOW', `Lead redirecionado para o número ${chosenConnection.name} (${cleanPhone}). Total hoje: ${chosenConnection.currentDayLeads + 1}/${chosenConnection.dailyLeadLimit}`);

    return NextResponse.redirect(waUrl);
  } catch (error) {
    console.error('Error in WhatsApp lead distribution redirect:', error);
    await logToDb('ERROR', 'FLOW', `Erro ao redirecionar lead no distribuidor: ${error.message}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}
