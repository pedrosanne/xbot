import { NextResponse } from 'next/server';
import { logToDb } from '@/lib/log';

export async function POST(request) {
  try {
    const { whatsappPhoneId, whatsappToken } = await request.json();

    if (!whatsappPhoneId || !whatsappToken) {
      return NextResponse.json({ success: false, error: 'Phone Number ID e Access Token são obrigatórios para teste' }, { status: 400 });
    }

    const response = await fetch(`https://graph.facebook.com/v20.0/${whatsappPhoneId}`, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      await logToDb('INFO', 'API', `Teste de conexão WhatsApp bem sucedido para Phone ID: ${whatsappPhoneId}`);
      return NextResponse.json({ success: true, data });
    } else {
      await logToDb('WARN', 'API', `Falha no teste de conexão WhatsApp para Phone ID: ${whatsappPhoneId}. Erro: ${data.error?.message}`);
      return NextResponse.json({ success: false, error: data.error?.message || 'Erro de autenticação com Meta APIs' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
