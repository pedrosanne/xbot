import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/settings';

// Disable caching so dashboard stats refresh on every page load
export const revalidate = 0;

export default async function DashboardPage() {
  // 1. Fetch Stats from SQLite
  const totalContacts = await prisma.contact.count();
  const incomingMessages = await prisma.message.count({ where: { direction: 'INCOMING' } });
  const outgoingMessages = await prisma.message.count({ where: { direction: 'OUTGOING' } });
  const totalMessages = incomingMessages + outgoingMessages;

  // 2. Fetch Active Agent
  const activeAgent = await prisma.agent.findFirst({ where: { isActive: true } });

  // 3. Fetch Settings for Checklist
  const settings = await getSystemSettings();
  const hasWhatsApp = !!(settings.whatsappToken && settings.whatsappPhoneId);
  const hasGemini = !!settings.geminiApiKey;
  const hasTTS = !!settings.elevenLabsApiKey;

  // 4. Fetch Recent Active Chats
  const recentContacts = await prisma.contact.findMany({
    orderBy: { lastInteraction: 'desc' },
    take: 5,
    include: {
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 1
      }
    }
  });

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Hoje: {new Date().toLocaleDateString('pt-BR')}
        </div>
      </header>

      <div className="page-body animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Stats Grid */}
        <div className="stats-grid">
          
          <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total de Conversas</span>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{totalContacts}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chats únicos salvos</span>
          </div>

          <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Mensagens Recebidas</span>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{incomingMessages}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enviadas pelos clientes</span>
          </div>

          <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Respostas Enviadas</span>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{outgoingMessages}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enviadas por IA ou Humano</span>
          </div>

          <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Agente IA Ativo</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: activeAgent ? 'var(--text-primary)' : 'var(--color-error)', margin: '6px 0' }}>
              {activeAgent ? activeAgent.name : 'Nenhum ativo'}
            </span>
            <span className={`badge ${activeAgent ? 'badge-success' : 'badge-error'}`} style={{ alignSelf: 'flex-start' }}>
              {activeAgent ? 'Robô Operante' : 'Inativo'}
            </span>
          </div>

        </div>

        {/* Configurations Checklist & Activity Split */}
        <div className="integration-grid">
          
          {/* Checklist Panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Status de Integração</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>WhatsApp Cloud API</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Envio e recepção oficial</span>
                </div>
                <span className={`badge ${hasWhatsApp ? 'badge-success' : 'badge-warning'}`}>
                  {hasWhatsApp ? 'Conectado' : 'Pendente'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Google Gemini AI</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Respostas e processamento multimodal</span>
                </div>
                <span className={`badge ${hasGemini ? 'badge-success' : 'badge-warning'}`}>
                  {hasGemini ? 'Ativo' : 'Pendente'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>Text-To-Speech (Voz)</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>API ElevenLabs para mensagens de voz</span>
                </div>
                <span className={`badge ${hasTTS ? 'badge-success' : 'badge-warning'}`}>
                  {hasTTS ? 'Pronto' : 'Sem Voz'}
                </span>
              </div>

            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: 600 }}>Começar a Atender</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Os agentes IA responderão automaticamente a todos os clientes que enviarem mensagens, a menos que você ative o <strong>Modo Manual</strong> na tela de Live Chat para assumir a conversa.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <Link href="/chat" className="btn btn-primary" style={{ textDecoration: 'none', flexGrow: 1, justifyContent: 'center' }}>
                Abrir Live Chat
              </Link>
              <Link href="/settings" className="btn btn-secondary" style={{ textDecoration: 'none', flexGrow: 1, justifyContent: 'center' }}>
                Configurar APIs
              </Link>
            </div>
          </div>

        </div>

        {/* Recent Conversations */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Conversas Recentes</h3>
          
          {recentContacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Nenhuma conversa registrada ainda. Configure seu Webhook e envie uma mensagem de teste no WhatsApp!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentContacts.map((contact) => {
                const isManual = contact.status === 'MANUAL';
                const lastMsg = contact.messages[0];
                return (
                  <div key={contact.id} className="conversation-row">
                    <div className="conversation-left">
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{contact.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg ? `${lastMsg.direction === 'OUTGOING' ? 'Você: ' : ''}${lastMsg.content}` : 'Nenhuma mensagem.'}
                      </span>
                    </div>

                    <div className="conversation-right">
                      <span className={`badge ${isManual ? 'badge-warning' : 'badge-success'}`}>
                        {isManual ? 'Manual (Pausado)' : 'Robô Ativo'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(contact.lastInteraction).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Link href={`/chat?contactId=${contact.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                        Atender
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
