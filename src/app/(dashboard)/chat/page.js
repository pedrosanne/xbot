'use client';

import { useState, useEffect, useRef } from 'react';

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callFirstMessage, setCallFirstMessage] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const [callResult, setCallResult] = useState(null); // { success, message }
  
  // Simulated Client states
  const [simName, setSimName] = useState('João Silva');
  const [simPhone, setSimPhone] = useState('5511999999999');
  const [simText, setSimText] = useState('Olá, gostaria de saber se vocês têm o produto em estoque?');
  const [simType, setSimType] = useState('text');
  const [simMediaId, setSimMediaId] = useState('wamid_test_media_123');

  const messagesEndRef = useRef(null);

  // 1. Fetch Contact List
  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  // 2. Fetch Messages for Selected Contact
  const fetchMessages = async (contactId) => {
    try {
      const res = await fetch(`/api/chat?contactId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchContacts();
    };
    load();
    const interval = setInterval(async () => {
      await fetchContacts();
      if (selectedContact) {
        await fetchMessages(selectedContact.id);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedContact]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Contact Select
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };

  // Toggle Bot Status (AUTO / MANUAL)
  const handleToggleStatus = async () => {
    if (!selectedContact) return;
    const newStatus = selectedContact.status === 'AUTO' ? 'MANUAL' : 'AUTO';
    
    try {
      const res = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact.id, status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedContact(updated);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error toggling bot status:', err);
    }
  };

  // Send Manual Message (Human Agent)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;

    setLoading(true);
    const textToSend = inputText;
    setInputText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          type: 'text',
          content: textToSend
        })
      });

      if (res.ok) {
        // Refresh messages immediately
        fetchMessages(selectedContact.id);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error sending manual message:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initiate AI Voice Call via Vapi.ai
  const handleInitiateCall = async () => {
    if (!selectedContact) return;
    setCallLoading(true);
    setCallResult(null);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          firstMessage: callFirstMessage || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCallResult({ success: true, message: 'Chamada iniciada com sucesso! A IA está ligando para o cliente.' });
        setCallFirstMessage('');
        setTimeout(() => { setShowCallModal(false); setCallResult(null); }, 4000);
      } else {
        setCallResult({ success: false, message: data.error || 'Erro ao iniciar chamada.' });
      }
    } catch (err) {
      console.error('Error initiating call:', err);
      setCallResult({ success: false, message: 'Erro de conexão com a API.' });
    } finally {
      setCallLoading(false);
    }
  };

  // Send Simulated Webhook (Client Simulator)
  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    if (!simPhone.trim()) return;

    const messageId = `wamid_simulated_${Date.now()}`;
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'sim_business_id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '5511999999999', phone_number_id: 'sim_phone_id' },
                contacts: [
                  {
                    profile: { name: simName },
                    wa_id: simPhone
                  }
                ],
                messages: [
                  {
                    from: simPhone,
                    id: messageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: simType,
                    ...(simType === 'text' && { text: { body: simText } }),
                    ...(simType === 'audio' && { audio: { id: simMediaId, mime_type: 'audio/ogg; codecs=opus' } }),
                    ...(simType === 'image' && { image: { id: simMediaId, mime_type: 'image/jpeg', caption: simText } })
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Simulação enviada com sucesso ao Webhook! Aguarde a IA responder na fila em 2.5s.');
        // Select simulated contact automatically
        const checkContact = { id: simPhone, name: simName, status: 'AUTO' };
        setSelectedContact(checkContact);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error simulating webhook:', err);
      alert('Falha ao simular webhook.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      
      {/* 1. Contact List Panel */}
      <div style={{ width: '320px', borderRight: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Contatos</h2>
        </div>
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.9rem' }}>
              Nenhum contato ativo. Use o simulador no painel lateral!
            </div>
          ) : (
            contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const isManual = contact.status === 'MANUAL';
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}`,
                    transition: 'var(--transition-smooth)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  className={!isSelected ? 'glass-card' : ''}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: isSelected ? 'white' : 'var(--text-primary)' }}>
                      {contact.name}
                    </span>
                    <span className={`badge ${isManual ? 'badge-warning' : 'badge-success'}`} style={{ scale: '0.85' }}>
                      {isManual ? 'Manual' : 'Auto'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact.lastMessage?.content || '(Sem mensagens)'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#07080c' }}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{selectedContact.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>WhatsApp: {selectedContact.id}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'none' }}>
                  {selectedContact.status === 'AUTO' ? 'IA ativa' : 'Manual'}
                </span>
                <button
                  onClick={() => { setShowCallModal(!showCallModal); setCallResult(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', position: 'relative' }}
                  title="Ligar para o cliente com IA"
                >
                  📞 Ligar
                </button>
                <button 
                  onClick={handleToggleStatus}
                  className={`btn ${selectedContact.status === 'AUTO' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  {selectedContact.status === 'AUTO' ? '🤖 Bot: Ligado' : '👤 Bot: Pausado'}
                </button>
              </div>
            </div>

            {/* Call Modal */}
            {showCallModal && (
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-glass)',
                background: 'rgba(0,0,0,0.3)',
                animation: 'fadeIn 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>📞 Chamada com IA para {selectedContact.name}</h4>
                  <button onClick={() => setShowCallModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Primeira mensagem da IA (opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      placeholder={`Olá ${selectedContact.name}! Aqui é a assistente virtual...`}
                      value={callFirstMessage}
                      onChange={(e) => setCallFirstMessage(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleInitiateCall}
                    className="btn btn-primary"
                    style={{ padding: '8px 20px', whiteSpace: 'nowrap' }}
                    disabled={callLoading}
                  >
                    {callLoading ? '⏳ Ligando...' : '📞 Iniciar Chamada'}
                  </button>
                </div>

                {callResult && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    background: callResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(255,92,92,0.08)',
                    border: `1px solid ${callResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(255,92,92,0.2)'}`,
                    color: callResult.success ? '#4ade80' : '#ff5c5c',
                  }}>
                    {callResult.success ? '✓' : '✗'} {callResult.message}
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  ℹ A IA usará a persona do agente ativo para conversar como um ser humano real. Requer Vapi.ai configurado em Agentes → Central de Chamadas.
                </div>
              </div>
            )}

            {/* Message Area */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg) => {
                const isClient = msg.direction === 'INCOMING';
                const isBot = msg.senderType === 'BOT';
                
                // Color coding for different senders
                let bgBubble = 'rgba(255, 255, 255, 0.05)';
                let borderBubble = '1px solid var(--border-glass)';
                let alignSelf = 'flex-start';
                let senderLabel = selectedContact.name;

                if (!isClient) {
                  alignSelf = 'flex-end';
                  senderLabel = isBot ? 'IA (Assistente)' : 'Você (Humano)';
                  bgBubble = isBot ? 'rgba(139, 92, 246, 0.25)' : 'rgba(59, 130, 246, 0.25)';
                  borderBubble = `1px solid ${isBot ? 'var(--color-primary)' : '#3b82f6'}`;
                }

                return (
                  <div key={msg.id} style={{ alignSelf, maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: isClient ? 'flex-start' : 'flex-end', margin: '0 4px' }}>
                      {senderLabel} • {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div style={{ 
                      padding: '12px 16px', 
                      borderRadius: isClient ? '4px 16px 16px 16px' : '16px 4px 16px 16px', 
                      background: bgBubble,
                      border: borderBubble,
                      fontSize: '0.95rem',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                      color: 'white'
                    }}>
                      {/* Media Renderers */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.mediaUrl} alt="WhatsApp Image" style={{ maxWidth: '100%', maxHeight: '250px', display: 'block' }} />
                        </div>
                      )}

                      {msg.type === 'audio' && msg.mediaUrl && (
                        <div style={{ marginBottom: '8px', minWidth: '220px' }}>
                          <audio src={msg.mediaUrl} controls style={{ width: '100%', height: '40px' }} />
                        </div>
                      )}

                      {msg.type === 'video' && msg.mediaUrl && (
                        <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px' }}>
                          <video src={msg.mediaUrl} controls style={{ width: '100%', maxHeight: '200px' }} />
                        </div>
                      )}

                      {msg.type === 'document' && msg.mediaUrl && (
                        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg style={{ width: '24px', height: '24px', color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-hover)', fontSize: '0.85rem' }}>
                            Ver Documento PDF / Arquivo
                          </a>
                        </div>
                      )}

                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '12px', background: 'var(--bg-glass)' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedContact.status === 'AUTO' ? "Envie uma mensagem (desativará o bot automático)..." : "Responda como agente humano..."}
                style={{ flexGrow: 1 }}
                className="form-input"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !inputText.trim()}
                style={{ padding: '0 24px' }}
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <svg style={{ width: '64px', height: '64px', marginBottom: '16px', color: 'rgba(255,255,255,0.05)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Nenhum chat aberto</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '350px', textAlign: 'center' }}>
              Selecione um contato na lista lateral ou utilize o simulador à direita para simular novas interações!
            </p>
          </div>
        )}
      </div>

      {/* 3. Simulator Sidebar Panel */}
      <div style={{ width: '340px', borderLeft: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', background: 'var(--bg-glass)', overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Simulador de Clientes</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teste sem chaves de API do WhatsApp</span>
        </div>
        
        <form onSubmit={handleSimulateWebhook} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Nome do Cliente</label>
            <input 
              type="text" 
              value={simName} 
              onChange={(e) => setSimName(e.target.value)} 
              className="form-input" 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone (ID WhatsApp)</label>
            <input 
              type="text" 
              value={simPhone} 
              onChange={(e) => setSimPhone(e.target.value)} 
              className="form-input" 
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Mensagem</label>
            <select 
              value={simType} 
              onChange={(e) => setSimType(e.target.value)} 
              className="form-select"
            >
              <option value="text">Texto Puro</option>
              <option value="audio">Áudio (Mensagem Voz)</option>
              <option value="image">Imagem com Legenda</option>
            </select>
          </div>

          {simType === 'text' && (
            <div className="form-group">
              <label className="form-label">Mensagem do Cliente</label>
              <textarea 
                value={simText} 
                onChange={(e) => setSimText(e.target.value)} 
                className="form-textarea" 
                required
              />
            </div>
          )}

          {simType === 'image' && (
            <>
              <div className="form-group">
                <label className="form-label">Legenda da Imagem</label>
                <input 
                  type="text" 
                  value={simText} 
                  onChange={(e) => setSimText(e.target.value)} 
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Media ID da Meta</label>
                <input 
                  type="text" 
                  value={simMediaId} 
                  onChange={(e) => setSimMediaId(e.target.value)} 
                  className="form-input"
                  placeholder="ID da mídia para download mockado"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Nota: Se a API do WhatsApp não estiver configurada, simulamos o download salvando uma imagem de exemplo.
                </span>
              </div>
            </>
          )}

          {simType === 'audio' && (
            <div className="form-group">
              <label className="form-label">Media ID da Meta</label>
              <input 
                type="text" 
                value={simMediaId} 
                onChange={(e) => setSimMediaId(e.target.value)} 
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Simula o envio de um arquivo de áudio. Na ausência de chaves, colocaremos um áudio de exemplo.
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            Simular Mensagem Recebida
          </button>
        </form>
        
        <div style={{ margin: 'auto 16px 16px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          💡 <strong>Dica de Teste:</strong> {"Clique em \"Simular\" para receber a mensagem. A IA processará e responderá automaticamente em cerca de 3 segundos, atualizando este painel do chat em tempo real!"}
        </div>
      </div>

    </div>
  );
}
