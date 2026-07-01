import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

export async function PATCH(request, context) {
  try {
    const { id } = context.params;
    const body = await request.json();
    
    // We only allow updating certain fields to keep it safe
    const { status, amount, paymentMethod, externalId } = body;
    
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (externalId !== undefined) updateData.externalId = externalId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado válido fornecido para atualização.' }, { status: 400 });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: updateData
    });

    await logToDb('INFO', 'SYSTEM', `Venda (Transação) ID: ${id} atualizada manualmente.`, updateData);

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Erro ao atualizar a venda.' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = context.params;

    await prisma.payment.delete({
      where: { id }
    });

    await logToDb('INFO', 'SYSTEM', `Venda (Transação) ID: ${id} excluída do banco de dados.`);

    return NextResponse.json({ success: true, message: 'Venda excluída com sucesso.' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Erro ao excluir a venda.' }, { status: 500 });
  }
}
