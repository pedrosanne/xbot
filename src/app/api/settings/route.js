import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemSettings, clearSettingsCache } from '@/lib/settings';

// GET: Retrieve system settings
export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST: Update system settings
export async function POST(request) {
  try {
    const data = await request.json();
    
    const updatedSettings = await prisma.setting.update({
      where: { id: 'system' },
      data: {
        whatsappToken: data.whatsappToken !== undefined ? data.whatsappToken : undefined,
        whatsappPhoneId: data.whatsappPhoneId !== undefined ? data.whatsappPhoneId : undefined,
        whatsappVerifyToken: data.whatsappVerifyToken !== undefined ? data.whatsappVerifyToken : undefined,
        geminiApiKey: data.geminiApiKey !== undefined ? data.geminiApiKey : undefined,
        elevenLabsApiKey: data.elevenLabsApiKey !== undefined ? data.elevenLabsApiKey : undefined,
        elevenLabsVoiceId: data.elevenLabsVoiceId !== undefined ? data.elevenLabsVoiceId : undefined,
        vapidPublicKey: data.vapidPublicKey !== undefined ? data.vapidPublicKey : undefined,
        vapidPrivateKey: data.vapidPrivateKey !== undefined ? data.vapidPrivateKey : undefined,
        vapiApiKey: data.vapiApiKey !== undefined ? data.vapiApiKey : undefined,
        vapiPhoneNumberId: data.vapiPhoneNumberId !== undefined ? data.vapiPhoneNumberId : undefined,
        vapiAssistantId: data.vapiAssistantId !== undefined ? data.vapiAssistantId : undefined,
        publicBaseUrl: data.publicBaseUrl !== undefined ? data.publicBaseUrl : undefined,
        globalPixelId: data.globalPixelId !== undefined ? data.globalPixelId : undefined,
        globalPixelToken: data.globalPixelToken !== undefined ? data.globalPixelToken : undefined,
        globalPixelTestCode: data.globalPixelTestCode !== undefined ? data.globalPixelTestCode : undefined,
        pushTitleManual: data.pushTitleManual !== undefined ? data.pushTitleManual : undefined,
        pushBodyManual: data.pushBodyManual !== undefined ? data.pushBodyManual : undefined,
        pushSoundManual: data.pushSoundManual !== undefined ? data.pushSoundManual : undefined,
        pushTitleSale: data.pushTitleSale !== undefined ? data.pushTitleSale : undefined,
        pushBodySale: data.pushBodySale !== undefined ? data.pushBodySale : undefined,
        pushSoundSale: data.pushSoundSale !== undefined ? data.pushSoundSale : undefined,
        pushTitleAlert: data.pushTitleAlert !== undefined ? data.pushTitleAlert : undefined,
        pushBodyAlert: data.pushBodyAlert !== undefined ? data.pushBodyAlert : undefined,
        pushSoundAlert: data.pushSoundAlert !== undefined ? data.pushSoundAlert : undefined,
        pushTitleLead: data.pushTitleLead !== undefined ? data.pushTitleLead : undefined,
        pushBodyLead: data.pushBodyLead !== undefined ? data.pushBodyLead : undefined,
        pushSoundLead: data.pushSoundLead !== undefined ? data.pushSoundLead : undefined,
        geminiPixPrompt: data.geminiPixPrompt !== undefined ? data.geminiPixPrompt : undefined,
        geminiPixModel: data.geminiPixModel !== undefined ? data.geminiPixModel : undefined,
        blockRegistrations: data.blockRegistrations !== undefined ? data.blockRegistrations : undefined
      }
    });

    clearSettingsCache();

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
