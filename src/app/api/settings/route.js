import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/settings';

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
        whatsappToken: data.whatsappToken ?? '',
        whatsappPhoneId: data.whatsappPhoneId ?? '',
        whatsappVerifyToken: data.whatsappVerifyToken ?? 'antigravity_token_123',
        geminiApiKey: data.geminiApiKey ?? '',
        elevenLabsApiKey: data.elevenLabsApiKey ?? '',
        elevenLabsVoiceId: data.elevenLabsVoiceId ?? '21m00Tcm4TlvDq8ikWAM',
        vapidPublicKey: data.vapidPublicKey ?? '',
        vapidPrivateKey: data.vapidPrivateKey ?? ''
      }
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
