import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { campaignId, contactId } = await request.json();

    if (!campaignId || !contactId) {
      return NextResponse.json({ error: 'campaignId e contactId são obrigatórios' }, { status: 400 });
    }

    // 1. Load campaign and contact
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId }
    });

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!campaign || !contact || !contact.email) {
      return NextResponse.json({ error: 'Campanha ou contato com e-mail não encontrado' }, { status: 404 });
    }

    // 2. Load email configuration
    const settings = await prisma.setting.findUnique({
      where: { id: 'system' }
    });

    if (!settings || !settings.emailApiKey || !settings.emailSender) {
      return NextResponse.json({ error: 'Configuração de e-mail do sistema incompleta' }, { status: 400 });
    }

    // 3. Variable Interpolation
    let personalizedBody = campaign.body;
    const firstName = contact.name.split(' ')[0] || 'Cliente';
    
    personalizedBody = personalizedBody
      .replace(/{nome}/g, contact.name)
      .replace(/{name}/g, contact.name)
      .replace(/{primeiro_nome}/g, firstName)
      .replace(/{first_name}/g, firstName)
      .replace(/{whatsapp}/g, contact.id)
      .replace(/{phone}/g, contact.id)
      .replace(/{email}/g, contact.email);

    let personalizedSubject = campaign.subject;
    personalizedSubject = personalizedSubject
      .replace(/{nome}/g, contact.name)
      .replace(/{name}/g, contact.name)
      .replace(/{primeiro_nome}/g, firstName)
      .replace(/{first_name}/g, firstName);

    let sendError = '';
    let success = false;

    // 4. Send the Email
    try {
      await sendEmail({
        provider: settings.emailProvider,
        apiKey: settings.emailApiKey,
        sender: settings.emailSender,
        to: contact.email,
        subject: personalizedSubject,
        html: personalizedBody
      });
      success = true;
    } catch (apiError) {
      console.error(`Failed to send email to ${contact.email}:`, apiError);
      sendError = apiError.message || 'Erro de envio no provedor';
    }

    // 5. Create Log and Update Counts
    await prisma.$transaction(async (tx) => {
      await tx.emailLog.create({
        data: {
          campaignId,
          contactId,
          status: success ? 'SENT' : 'FAILED',
          error: sendError || ''
        }
      });

      await tx.emailCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: success ? 1 : 0 },
          failedCount: { increment: success ? 0 : 1 }
        }
      });
    });

    return NextResponse.json({ success, error: sendError });
  } catch (error) {
    console.error('Error processing campaign email item:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
