import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Only allow updating specific fields
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.apiKey && data.apiKey !== '***') updateData.apiKey = data.apiKey;

    const updated = await prisma.aiProvider.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ ...updated, apiKey: '***' });
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await prisma.aiProvider.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
