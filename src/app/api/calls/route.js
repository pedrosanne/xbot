import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/settings';
import { logToDb } from '@/lib/log';

// GET: List calls (optionally filtered by contactId)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    const where = contactId ? { contactId } : {};
    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        contact: {
          select: { name: true, profileName: true }
        }
      }
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}

// POST: Initiate a new outbound call via Vapi.ai
export async function POST(request) {
  try {
    const data = await request.json();
    const { contactId, firstMessage, systemPrompt, maxDuration } = data;

    if (!contactId) {
      return NextResponse.json({ error: 'contactId é obrigatório' }, { status: 400 });
    }

    const settings = await getSystemSettings();
    const { vapiApiKey, vapiPhoneNumberId, vapiAssistantId } = settings;

    if (!vapiApiKey) {
      return NextResponse.json({ error: 'Chave de API do Vapi.ai não configurada. Vá em Agentes → Central de Chamadas para configurar.' }, { status: 400 });
    }

    if (!vapiPhoneNumberId) {
      return NextResponse.json({ error: 'Phone Number ID do Vapi.ai não configurado.' }, { status: 400 });
    }

    // Get contact info
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // Get active AI agent for persona
    const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });

    // Build Vapi.ai call payload
    const vapiPayload = {
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: `+${contactId}`,
        name: contact.name || contact.profileName || 'Cliente',
      },
      ...(vapiAssistantId ? { assistantId: vapiAssistantId } : {
        assistant: {
          model: {
            provider: 'google',
            model: activeAgent?.model || 'gemini-2.5-flash',
            temperature: activeAgent?.temperature || 0.7,
            messages: [
              {
                role: 'system',
                content: systemPrompt || activeAgent?.systemPrompt || 'Você é um atendente virtual simpático. Responda de maneira clara, prestativa e natural, simulando um contato humano real. Use linguagem coloquial e amigável.',
              },
            ],
          },
          voice: {
            provider: 'eleven-labs',
            voiceId: activeAgent?.elevenLabsVoiceId || settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
            modelId: 'eleven_multilingual_v2',
          },
          firstMessage: firstMessage || `Olá ${contact.name || 'cliente'}! Aqui é a ${activeAgent?.name || 'assistente virtual'}. Tudo bem com você?`,
          transcriber: {
            provider: 'deepgram',
            language: 'pt-BR',
          },
          endCallMessage: 'Foi um prazer conversar com você. Tenha um ótimo dia!',
          ...(maxDuration ? { maxDurationSeconds: parseInt(maxDuration) } : { maxDurationSeconds: 300 }),
        },
      }),
    };

    await logToDb('INFO', 'CALL', `Iniciando chamada para ${contactId} via Vapi.ai`, { phoneNumberId: vapiPhoneNumberId });

    // Send request to Vapi.ai
    const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vapiPayload),
    });

    const vapiData = await vapiRes.json();

    if (!vapiRes.ok) {
      await logToDb('ERROR', 'CALL', `Erro ao iniciar chamada via Vapi.ai: ${JSON.stringify(vapiData)}`, vapiData);
      return NextResponse.json({ error: vapiData.message || 'Erro ao iniciar chamada no Vapi.ai', details: vapiData }, { status: vapiRes.status });
    }

    // Save call record in database
    const call = await prisma.call.create({
      data: {
        contactId,
        vapiCallId: vapiData.id || '',
        type: 'outbound',
        status: vapiData.status || 'queued',
      },
    });

    await logToDb('INFO', 'CALL', `Chamada iniciada com sucesso. Call ID: ${call.id}, Vapi ID: ${vapiData.id}`, {
      callId: call.id,
      vapiCallId: vapiData.id,
    });

    return NextResponse.json({ success: true, call, vapiData });
  } catch (error) {
    await logToDb('ERROR', 'CALL', `Exceção ao iniciar chamada: ${error.message}`, {
      error: error.message,
      stack: error.stack,
    });
    console.error('Error initiating call:', error);
    return NextResponse.json({ error: 'Falha ao iniciar chamada' }, { status: 500 });
  }
}
