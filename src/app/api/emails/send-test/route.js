import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { provider, apiKey, sender, to } = await request.json();

    if (!to) {
      return NextResponse.json({ error: 'Destinatário é obrigatório' }, { status: 400 });
    }

    // Load saved config as fallback
    const settings = await prisma.setting.findUnique({
      where: { id: 'system' }
    });

    const activeProvider = provider || settings?.emailProvider;
    const activeSender = sender || settings?.emailSender;
    
    let activeApiKey = apiKey;
    if (!activeApiKey || activeApiKey.includes('••••••••')) {
      activeApiKey = settings?.emailApiKey;
    }

    if (!activeProvider || !activeApiKey || !activeSender) {
      return NextResponse.json({ error: 'Configurações de e-mail incompletas' }, { status: 400 });
    }

    const testSubject = 'Teste de Conexão - XBot E-mail Marketing';
    const testHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #1f2937; background-color: #f9fafb; border-radius: 8px;">
        <h2 style="color: #10b981;">Conexão Estabelecida com Sucesso! 🎉</h2>
        <p>Olá,</p>
        <p>Este é um e-mail de teste enviado pelo <strong>XBot</strong> para confirmar que a sua integração com o provedor <strong>${activeProvider.toUpperCase()}</strong> está funcionando perfeitamente.</p>
        <p>Agora você já pode criar campanhas e fazer disparos em massa para seus leads.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 0.82rem; color: #6b7280;">Enviado automaticamente por XBot v1.0.0</p>
      </div>
    `;

    await sendEmail({
      provider: activeProvider,
      apiKey: activeApiKey,
      sender: activeSender,
      to,
      subject: testSubject,
      html: testHtml
    });

    return NextResponse.json({ success: true, message: 'E-mail de teste enviado com sucesso!' });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: error.message || 'Falha ao enviar e-mail de teste' }, { status: 500 });
  }
}
