import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logToDb } from '@/lib/log';
import { sendStepResponse } from '@/lib/queue';

export async function GET(request) {
  try {
    // 1. Authorization check
    const authHeader = request.headers.get('authorization');
    const isValidVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isValidSupabase = authHeader === `Bearer ${process.env.SUPABASE_CRON_SECRET || 'xbot_supabase_cron_5599'}`;
    
    if (!isValidVercel && !isValidSupabase) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await logToDb('INFO', 'SYSTEM', 'Iniciando verificação de timeouts / follow-ups automáticos de fluxos.');

    // 2. Fetch all contacts in AUTO flow mode
    const contacts = await prisma.contact.findMany({
      where: {
        status: 'AUTO',
        botMode: 'FLOW',
        activeFlowId: { not: '' },
        currentStepId: { not: '' }
      },
      include: { connection: true }
    });

    let processedCount = 0;
    const now = new Date();

    for (const contact of contacts) {
      try {
        // Fetch the active flow
        const flow = await prisma.flow.findUnique({
          where: { id: contact.activeFlowId }
        });

        if (!flow || !flow.isActive) continue;

        const steps = JSON.parse(flow.steps || '[]');
        const currentStep = steps.find(s => s.id === contact.currentStepId);

        if (!currentStep || !currentStep.timeoutEnabled) continue;

        const duration = parseInt(currentStep.timeoutDuration) || 5;
        const unit = currentStep.timeoutUnit || 'minutes';
        
        // Calculate timeout threshold in milliseconds
        let thresholdMs = duration * 60 * 1000; // default minutes
        if (unit === 'hours') {
          thresholdMs = duration * 60 * 60 * 1000;
        } else if (unit === 'days') {
          thresholdMs = duration * 24 * 60 * 60 * 1000;
        }

        const enteredAt = contact.flowStepEnteredAt || contact.lastInteraction;
        const elapsedMs = now.getTime() - new Date(enteredAt).getTime();

        if (elapsedMs >= thresholdMs) {
          await logToDb('INFO', 'FLOW', `Timeout atingido para contato ${contact.id} na etapa '${currentStep.id}' do fluxo '${flow.name}'. Tempo decorrido: ${Math.round(elapsedMs / 1000 / 60)} min.`);

          const targetStepId = currentStep.timeoutNextStepId;

          if (!targetStepId) {
            // End Flow fallback
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                activeFlowId: '',
                currentStepId: '',
                lastInteraction: now
              }
            });
            await logToDb('INFO', 'FLOW', `Fluxo finalizado para o contato ${contact.id} devido a timeout sem etapa seguinte definida.`);
          } else {
            const nextStep = steps.find(s => s.id === targetStepId);
            if (nextStep) {
              // Transition contact and send step response
              await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  currentStepId: targetStepId,
                  lastInteraction: now
                }
              });

              await sendStepResponse(contact.id, nextStep, steps, null, contact.connection);
              processedCount++;
            } else {
              await logToDb('WARN', 'FLOW', `Etapa seguinte de timeout '${targetStepId}' não encontrada no fluxo '${flow.name}'.`);
            }
          }
        }
      } catch (contactError) {
        console.error(`Error processing timeout for contact ${contact.id}:`, contactError);
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error) {
    console.error('Error running flow-timeout cron:', error);
    await logToDb('ERROR', 'SYSTEM', `Falha crítica no cron de timeouts de fluxo: ${error.message}`);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
