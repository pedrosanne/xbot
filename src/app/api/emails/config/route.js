import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Retrieve current email settings (masked API Key)
export async function GET() {
  try {
    const settings = await prisma.setting.findUnique({
      where: { id: 'system' }
    });

    if (!settings) {
      return NextResponse.json({ hasConfig: false });
    }

    const maskedKey = settings.emailApiKey 
      ? `${settings.emailApiKey.substring(0, 4)}••••••••` 
      : '';

    return NextResponse.json({
      hasConfig: !!settings.emailApiKey,
      provider: settings.emailProvider,
      sender: settings.emailSender,
      apiKey: maskedKey
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações de e-mail' }, { status: 500 });
  }
}

// POST: Save email settings
export async function POST(request) {
  try {
    const { provider, apiKey, sender } = await request.json();

    if (!provider || !sender) {
      return NextResponse.json({ error: 'Provedor e remetente são obrigatórios' }, { status: 400 });
    }

    // Prepare update data
    const updateData = {
      emailProvider: provider,
      emailSender: sender
    };

    // Only update API Key if it's not the masked placeholder
    if (apiKey && !apiKey.includes('••••••••')) {
      updateData.emailApiKey = apiKey;
    }

    const settings = await prisma.setting.upsert({
      where: { id: 'system' },
      update: updateData,
      create: {
        id: 'system',
        ...updateData
      }
    });

    return NextResponse.json({ 
      success: true, 
      provider: settings.emailProvider,
      sender: settings.emailSender 
    });
  } catch (error) {
    console.error('Error saving email config:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações de e-mail' }, { status: 500 });
  }
}
