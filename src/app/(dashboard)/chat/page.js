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

  // Simulator Drawer and Contact Search/Filters
  const [showSimulator, setShowSimulator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'AUTO', 'MANUAL'

  const messagesEndRef = useRef(null);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recorder, setRecorder] = useState(null);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    // Only load mic-recorder-to-mp3 on the client side
    import('mic-recorder-to-mp3').then((module) => {
      const MicRecorder = module.default;
      setRecorder(new MicRecorder({ bitRate: 128 }));
    }).catch(err => console.error('Failed to load mic-recorder-to-mp3', err));
  }, []);

  // File Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef(null);

  // Lead Profile Detail states
  const [rightPanelTab, setRightPanelTab] = useState('profile'); // 'profile' or 'simulator'
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileEmailInput, setProfileEmailInput] = useState('');
  const [profileTagsInput, setProfileTagsInput] = useState('');
  const [profileNotesInput, setProfileNotesInput] = useState('');
  const [profileAvatarInput, setProfileAvatarInput] = useState('');

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
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setMessages(data.messages || []);
          if (data.contact) {
            setSelectedContact(prev => {
              if (!prev) return data.contact;
              // Preserve call and modal toggle states but update dynamic db fields
              return { ...prev, ...data.contact };
            });
          }
        } else {
          setMessages(data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      setProfileNameInput(selectedContact.name || '');
      setProfileEmailInput(selectedContact.email || '');
      setProfileTagsInput(selectedContact.tags || '');
      setProfileNotesInput(selectedContact.notes || '');
      setProfileAvatarInput(selectedContact.avatarUrl || '');
    } else {
      setEditProfileMode(false);
    }
  }, [selectedContact?.id]);

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

    return () => {
      clearInterval(interval);
      clearInterval(recordingTimerRef.current);
    };
  }, [selectedContact?.id]);

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

  // Start recording audio
  const startRecording = async () => {
    if (!recorder) {
      alert('Gravador de áudio não inicializado.');
      return;
    }
    try {
      await recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Não foi possível acessar o microfone.');
    }
  };

  // Stop recording audio
  const stopRecording = (shouldSend = true) => {
    if (!recorder) return;
    
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (shouldSend) {
      recorder.stop().getMp3().then(async ([buffer, blob]) => {
        const audioFile = new File(buffer, 'recorded_voice.mp3', { type: 'audio/mpeg' });
        
        const formData = new FormData();
        formData.append('file', audioFile);

        try {
          setLoading(true);
          const uploadRes = await fetch('/api/uploads', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) throw new Error('Upload failed');
          const uploadData = await uploadRes.json();

          const sendRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: selectedContact.id,
              type: 'audio',
              mediaUrl: uploadData.url,
            }),
          });

          const data = await sendRes.json();
          if (!sendRes.ok || data.sendError) {
            alert(`Aviso: Ocorreu um erro ao enviar áudio para o WhatsApp: ${data.error || data.sendError || 'Erro desconhecido'}`);
          }
          
          fetchMessages(selectedContact.id);
          fetchContacts();
        } catch (err) {
          console.error('Error uploading/sending audio:', err);
          alert('Erro ao gravar ou enviar áudio.');
        } finally {
          setLoading(false);
        }
      }).catch((err) => {
        console.error('Error getting MP3 buffer:', err);
        alert('Erro ao processar áudio gravado.');
      });
    } else {
      recorder.stop();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadProgress(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadFile({
          name: file.name,
          url: data.url,
          type: getMediaType(file.type)
        });
      } else {
        alert('Falha ao fazer upload do arquivo.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Erro ao fazer upload do arquivo.');
    } finally {
      setUploadProgress(false);
    }
  };

  const getMediaType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Save edited profile details
  const handleSaveProfile = async () => {
    if (!selectedContact) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          name: profileNameInput,
          email: profileEmailInput,
          notes: profileNotesInput,
          tags: profileTagsInput,
          avatarUrl: profileAvatarInput
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedContact(updated);
        setEditProfileMode(false);
        fetchContacts();
        fetchMessages(selectedContact.id);
      } else {
        alert('Falha ao salvar detalhes do perfil.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Send Manual Message (Human Agent)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !uploadFile) return;

    setLoading(true);
    const textToSend = inputText;
    const currentUpload = uploadFile;
    
    setInputText('');
    setUploadFile(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          type: currentUpload ? currentUpload.type : 'text',
          content: textToSend, // used as caption for media
          mediaUrl: currentUpload ? currentUpload.url : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || data.sendError) {
        const errMessage = data.error || data.sendError || 'Erro de envio.';
        alert(`Aviso: Ocorreu um erro no envio para o WhatsApp, mas a mensagem foi gravada localmente. Erro: ${errMessage}`);
      }
      
      fetchMessages(selectedContact.id);
      fetchContacts();
    } catch (err) {
      console.error('Error sending manual message:', err);
      alert('Erro de conexão ao enviar mensagem.');
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

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      contact.id?.includes(searchQuery);
    const matchesFilter = 
      statusFilter === 'ALL' || 
      contact.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="chat-page-container">
      
      {/* 1. Contact List Panel */}
      <div className={`contacts-panel ${selectedContact ? 'hidden-mobile' : ''}`}>
        <div className="contacts-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Contatos</h2>
            <button 
              onClick={() => { setShowSimulator(!showSimulator); setRightPanelTab('simulator'); }} 
              className={`btn ${showSimulator && rightPanelTab === 'simulator' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              title="Abrir Simulador de Clientes"
            >
              🧪 Simulador
            </button>
          </div>
          
          {/* Search bar */}
          <div className="contacts-search-wrapper">
            <svg className="contacts-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Buscar por nome ou número..." 
              className="contacts-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="contacts-filters">
          <button 
            className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Todos
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'AUTO' ? 'active' : ''}`}
            onClick={() => setStatusFilter('AUTO')}
          >
            Robô
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'MANUAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MANUAL')}
          >
            Manual
          </button>
        </div>

        {/* Contact list body */}
        <div className="contacts-list">
          {filteredContacts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 8px', fontSize: '0.85rem' }}>
              Nenhum contato encontrado.
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const isManual = contact.status === 'MANUAL';
              const initials = getInitials(contact.name || contact.profileName || contact.id);
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`contact-item ${isSelected ? 'selected' : ''}`}
                >
                  {contact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={contact.avatarUrl} 
                      alt="Avatar" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
                    />
                  ) : (
                    <div className="contact-avatar">
                      {initials}
                    </div>
                  )}
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <span className="contact-name">{contact.name || 'Sem Nome'}</span>
                      <span className={`status-indicator ${isManual ? 'manual' : 'auto'}`} />
                    </div>
                    <div className="contact-msg-row">
                      <span className="contact-last-msg">
                        {contact.lastMessage?.content || '(Sem mensagens)'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div className={`chat-window-panel ${!selectedContact ? 'hidden-mobile' : ''} ${showSimulator ? 'simulator-open' : ''}`}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                {/* Back button for mobile */}
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="btn btn-secondary back-btn-mobile"
                  style={{ marginRight: '8px', padding: '6px 10px' }}
                >
                  ← Voltar
                </button>
                {selectedContact.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={selectedContact.avatarUrl} 
                    alt="Avatar" 
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div className="contact-avatar" style={{ width: '36px', height: '36px' }}>
                    {getInitials(selectedContact.name)}
                  </div>
                )}
                <div className="chat-header-text">
                  <span className="chat-header-title">{selectedContact.name}</span>
                  <span className="chat-header-sub">WhatsApp: {selectedContact.id}</span>
                </div>
              </div>
              
              <div className="chat-header-actions">
                <button
                  onClick={() => { setShowSimulator(!showSimulator); setRightPanelTab('profile'); }}
                  className={`btn ${showSimulator && rightPanelTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  title="Ver Perfil do Lead"
                >
                  👤 Perfil
                </button>
                <button
                  onClick={() => { setShowCallModal(!showCallModal); setCallResult(null); }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  title="Ligar para o cliente com IA"
                >
                  📞 Ligar
                </button>
                <button 
                  onClick={handleToggleStatus}
                  className={`btn ${selectedContact.status === 'AUTO' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  {selectedContact.status === 'AUTO' ? '🤖 Robô Ativo' : '👤 Manual'}
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
            <div className="messages-container">
              {messages.map((msg) => {
                const isClient = msg.direction === 'INCOMING';
                const isBot = msg.senderType === 'BOT';
                
                let wrapperClass = 'message-wrapper';
                let senderLabel = selectedContact.name;

                if (isClient) {
                  wrapperClass += ' incoming';
                } else {
                  wrapperClass += ' outgoing';
                  wrapperClass += isBot ? ' bot' : ' human';
                  senderLabel = isBot ? 'IA (Assistente)' : 'Você (Humano)';
                }

                return (
                  <div key={msg.id} className={wrapperClass}>
                    <span className="message-meta">
                      {senderLabel} • {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="message-bubble" style={{ position: 'relative' }}>
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
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'underline' }}>
                            Ver Documento / Arquivo
                          </a>
                        </div>
                      )}

                      {msg.content}
                    </div>

                    {/* Exibe erro de entrega se houver */}
                    {msg.sendError && (
                      <div 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          fontSize: '0.72rem', 
                          color: '#ff5c5c', 
                          marginTop: '2px',
                          alignSelf: isClient ? 'flex-start' : 'flex-end',
                          cursor: 'help'
                        }} 
                        title={`Falha ao enviar via WhatsApp API: ${msg.sendError}`}
                      >
                        ⚠️ Não enviado ao lead ({msg.sendError})
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Upload File Preview */}
            {uploadFile && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.02)',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📎 <strong>Anexo ({uploadFile.type === 'image' ? 'Imagem' : uploadFile.type === 'video' ? 'Vídeo' : uploadFile.type === 'audio' ? 'Áudio' : 'Documento'}):</strong> {uploadFile.name}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setUploadFile(null)} 
                  style={{ background: 'none', border: 'none', color: '#ff5c5c', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-form" style={{ alignItems: 'center' }}>
              {/* Attachment Picker */}
              <label htmlFor="file-upload" className="btn btn-secondary" style={{ padding: '10px 14px', cursor: 'pointer', margin: 0 }} title="Anexar Imagem, Vídeo ou Documento">
                📎
              </label>
              <input 
                type="file" 
                id="file-upload" 
                ref={fileInputRef}
                style={{ display: 'none' }} 
                onChange={handleFileChange}
                disabled={uploadProgress || loading || isRecording}
              />

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isRecording 
                    ? "Gravando áudio..." 
                    : uploadFile 
                      ? "Digite uma legenda para o arquivo..." 
                      : selectedContact.status === 'AUTO' 
                        ? "Envie uma mensagem (desativará o bot automático)..." 
                        : "Responda como agente humano..."
                }
                style={{ flexGrow: 1 }}
                className="form-input"
                disabled={loading || isRecording}
              />

              {/* Microphone recorder */}
              {!isRecording ? (
                <button 
                  type="button" 
                  onClick={startRecording}
                  className="btn btn-secondary" 
                  style={{ padding: '10px 14px' }}
                  title="Gravar Mensagem de Voz"
                  disabled={loading || uploadProgress}
                >
                  🎙️
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', color: '#f87171', flexShrink: 0 }}>
                  <span className="led-indicator active" style={{ background: '#f87171', boxShadow: '0 0 8px #f87171', margin: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{formatTime(recordingSeconds)}</span>
                  <button 
                    type="button" 
                    onClick={() => stopRecording(true)} 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#ef4444', color: 'white', border: 'none' }}
                  >
                    Enviar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => stopRecording(false)} 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Send Button */}
              {!isRecording && (
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading || uploadProgress || (!inputText.trim() && !uploadFile)}
                  style={{ padding: '10px 24px' }}
                >
                  {loading ? '...' : 'Enviar'}
                </button>
              )}
            </form>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <svg style={{ width: '64px', height: '64px', marginBottom: '16px', color: 'rgba(255,255,255,0.05)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Nenhum chat aberto</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '350px', textAlign: 'center' }}>
              Selecione um contato na lista lateral ou utilize o simulador para criar interações de teste.
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Sidebar Panel (Profile Details + Client Simulator) */}
      <div className={`simulator-drawer ${!showSimulator ? 'collapsed' : ''}`}>
        {/* Panel Tabs */}
        <div className="simulator-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', width: '100%', marginBottom: '12px' }}>
              <button 
                className={`filter-tab ${rightPanelTab === 'profile' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('profile')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '12px' }}
              >
                👤 Perfil do Lead
              </button>
              <button 
                className={`filter-tab ${rightPanelTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('simulator')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '12px' }}
              >
                🧪 Simulador
              </button>
            </div>
          </div>
        </div>

        {selectedContact && rightPanelTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
            {/* View Mode */}
            {!editProfileMode ? (
              <>
                {/* Profile Header Card */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', borderBottom: '1px solid var(--border-glass)', gap: '12px' }}>
                  {selectedContact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedContact.avatarUrl} 
                      alt="Foto do Lead" 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} 
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 600, color: 'white' }}>
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'white', margin: 0, textAlign: 'center' }}>
                    {selectedContact.name || 'Sem Nome'}
                  </h3>
                  <span className={`badge ${selectedContact.status === 'MANUAL' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.75rem' }}>
                    {selectedContact.status === 'MANUAL' ? '👤 Atendimento Manual' : '🤖 Robô Ativo'}
                  </span>
                </div>

                {/* Profile Fields List */}
                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>WhatsApp ID (Número)</label>
                    <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{selectedContact.id}</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>E-mail</label>
                    <span style={{ fontSize: '0.9rem', color: selectedContact.email ? 'white' : 'var(--text-muted)', fontWeight: 500 }}>
                      {selectedContact.email || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tags</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedContact.tags ? selectedContact.tags.split(',').map((tag, idx) => (
                        <span key={idx} style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}>
                          {tag.trim()}
                        </span>
                      )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma tag cadastrada.</span>}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Observações</label>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {selectedContact.notes || 'Sem observações.'}
                    </div>
                  </div>

                  <button 
                    onClick={() => setEditProfileMode(true)}
                    className="btn btn-secondary" 
                    style={{ justifyContent: 'center', marginTop: '8px' }}
                  >
                    ✏️ Editar Dados do Lead
                  </button>
                </div>
              </>
            ) : (
              /* Edit Mode */
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Editar Perfil do Lead</h3>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Nome do Lead</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={profileNameInput} 
                    onChange={(e) => setProfileNameInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">E-mail</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="email@dominio.com"
                    value={profileEmailInput} 
                    onChange={(e) => setProfileEmailInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Foto de Perfil (URL)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="https://link-da-imagem.png"
                    value={profileAvatarInput} 
                    onChange={(e) => setProfileAvatarInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Tags (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Quente, Importante, Teste"
                    value={profileTagsInput} 
                    onChange={(e) => setProfileTagsInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Observações</label>
                  <textarea 
                    className="form-textarea" 
                    style={{ minHeight: '80px' }}
                    value={profileNotesInput} 
                    onChange={(e) => setProfileNotesInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={handleSaveProfile}
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button 
                    onClick={() => setEditProfileMode(false)}
                    className="btn btn-secondary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(!selectedContact || rightPanelTab === 'simulator') && (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Simulador Header */}
            <div style={{ padding: '12px 16px 4px 16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teste local enviando mensagens simuladas</span>
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
                      placeholder="wamid_test_media_123"
                    />
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
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Simular Mensagem Recebida
              </button>
            </form>
            
            <div style={{ margin: 'auto 16px 16px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              💡 <strong>Dica de Teste:</strong> Clique em "Simular" para receber a mensagem. A IA responderá na fila em 3 segundos.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
