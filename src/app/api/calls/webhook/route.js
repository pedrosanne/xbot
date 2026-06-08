import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';

// POST: Vapi.ai webhook for call events
export async function POST(request) {
  try {
    const data = await request.json();
    const eventType = data.message?.type || data.type || '';

    await logToDb('INFO', 'CALL', `Webhook Vapi.ai recebido: ${eventType}`, {
      callId: data.message?.call?.id || data.call?.id || '',
      type: eventType,
    });

    const vapiCallId = data.message?.call?.id || data.call?.id || '';

    if (!vapiCallId) {
      return NextResponse.json({ received: true });
    }

    // Find the call in our database
    const existingCall = await prisma.call.findFirst({
      where: { vapiCallId },
    });

    if (!existingCall) {
      await logToDb('WARN', 'CALL', `Chamada não encontrada no banco para Vapi ID: ${vapiCallId}`);
      return NextResponse.json({ received: true });
    }

    switch (eventType) {
      case 'call-started':
      case 'status-update': {
        const newStatus = data.message?.call?.status || data.call?.status || 'in-progress';
        await prisma.call.update({
          where: { id: existingCall.id },
          data: { status: mapVapiStatus(newStatus) },
        });
        await logToDb('INFO', 'CALL', `Status da chamada ${existingCall.id} atualizado para: ${newStatus}`);
        break;
      }

      case 'end-of-call-report':
      case 'call-ended': {
        const callData = data.message?.call || data.call || {};
        const report = data.message || data;
        
        await prisma.call.update({
          where: { id: existingCall.id },
          data: {
            status: 'completed',
            duration: callData.duration ? Math.round(callData.duration) : 0,
            transcript: report.transcript || report.artifact?.transcript || '',
            recordingUrl: report.recordingUrl || report.artifact?.recordingUrl || '',
            summary: report.summary || report.artifact?.summary || '',
            cost: report.cost ? parseFloat(report.cost) : 0,
            endedReason: report.endedReason || callData.endedReason || '',
          },
        });

        await logToDb('INFO', 'CALL', `Chamada ${existingCall.id} finalizada. Duração: ${callData.duration || 0}s. Motivo: ${report.endedReason || 'N/A'}`, {
          duration: callData.duration,
          cost: report.cost,
          endedReason: report.endedReason,
        });
        break;
      }

      case 'transcript': {
        // Real-time transcript update (partial)
        const transcriptText = data.message?.transcript || '';
        if (transcriptText) {
          await prisma.call.update({
            where: { id: existingCall.id },
            data: { transcript: transcriptText },
          });
        }
        break;
      }

      default:
        await logToDb('INFO', 'CALL', `Evento Vapi não tratado: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await logToDb('ERROR', 'CALL', `Erro no webhook de chamadas: ${error.message}`, {
      error: error.message,
      stack: error.stack,
    });
    console.error('Call webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

function mapVapiStatus(vapiStatus) {
  const statusMap = {
    'queued': 'queued',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'forwarding': 'in-progress',
    'ended': 'completed',
    'completed': 'completed',
    'failed': 'failed',
    'busy': 'busy',
    'no-answer': 'no-answer',
  };
  return statusMap[vapiStatus] || vapiStatus;
}
