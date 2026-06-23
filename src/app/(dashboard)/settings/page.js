'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Helper function to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  // Configs
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('');
  const [publicBaseUrl, setPublicBaseUrl] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  
  // VAPID keys
  const [vapidPublicKey, setVapidPublicKey] = useState('');
  const [vapidPrivateKey, setVapidPrivateKey] = useState('');
  
  // Visibility and Copy states for API Keys
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [copiedGemini, setCopiedGemini] = useState(false);
  const [showElevenKey, setShowElevenKey] = useState(false);
  const [copiedEleven, setCopiedEleven] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [copiedWhatsappToken, setCopiedWhatsappToken] = useState(false);

  // Status/Loading States
  const [loading, setLoading] = useState(false);
  const [vapidLoading, setVapidLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // PWA/Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [subLoading, setSubLoading] = useState(false);
  
  // Test Push Customization
  const [testTitle, setTestTitle] = useState('Mensagem do Xbot ⚡');
  const [testBody, setTestBody] = useState('Uma nova mensagem precisa de atendimento humano no painel!');

  // Fetch settings & check push status on mount
  useEffect(() => {
    fetchSettings();
    checkPushCapability();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setWhatsappToken(data.whatsappToken || '');
        setWhatsappPhoneId(data.whatsappPhoneId || '');
        setWhatsappVerifyToken(data.whatsappVerifyToken || 'antigravity_token_123');
        setPublicBaseUrl(data.publicBaseUrl || '');
        setGeminiApiKey(data.geminiApiKey || '');
        setElevenLabsApiKey(data.elevenLabsApiKey || '');
        setElevenLabsVoiceId(data.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM');
        setVapidPublicKey(data.vapidPublicKey || '');
        setVapidPrivateKey(data.vapidPrivateKey || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const checkPushCapability = async () => {
    if (typeof window !== 'undefined') {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      setPushSupported(isSupported);

      if (isSupported) {
        setNotificationPermission(Notification.permission);
        
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (e) {
          console.error('Error checking push subscription status:', e);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappToken,
          whatsappPhoneId,
          whatsappVerifyToken,
          publicBaseUrl,
          geminiApiKey,
          elevenLabsApiKey,
          elevenLabsVoiceId,
          vapidPublicKey,
          vapidPrivateKey
        })
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Erro ao salvar configurações.' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setStatusMsg({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  // Generate VAPID keys API Call
  const handleGenerateVapidKeys = async () => {
    setVapidLoading(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/vapid/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVapidPublicKey(data.publicKey);
        setVapidPrivateKey(data.privateKey);
        setStatusMsg({ type: 'success', text: 'Novas chaves VAPID geradas e salvas com sucesso no banco!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Erro ao gerar chaves VAPID.' });
      }
    } catch (err) {
      console.error('Error generating VAPID keys:', err);
      setStatusMsg({ type: 'error', text: 'Falha ao conectar na API de chaves.' });
    } finally {
      setVapidLoading(false);
    }
  };

  // Subscribe browser to push
  const handleSubscribe = async () => {
    if (!pushSupported) return;
    if (!vapidPublicKey) {
      alert('Por favor, gere ou adicione as chaves VAPID antes de inscrever o dispositivo.');
      return;
    }

    setSubLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== 'granted') {
        setStatusMsg({ type: 'error', text: 'Permissão de notificação negada pelo usuário.' });
        setSubLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe any existing one first to clean up
      const oldSub = await registration.pushManager.getSubscription();
      if (oldSub) {
        await oldSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (res.ok) {
        setIsSubscribed(true);
        setStatusMsg({ type: 'success', text: 'Este dispositivo foi inscrito com sucesso no PWA Notificações!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Falha ao registrar inscrição de notificações no banco.' });
      }
    } catch (err) {
      console.error('Push subscription error:', err);
      setStatusMsg({ type: 'error', text: `Erro na inscrição: ${err.message}` });
    } finally {
      setSubLoading(false);
    }
  };

  // Unsubscribe browser from push
  const handleUnsubscribe = async () => {
    if (!pushSupported) return;
    setSubLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Delete from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }

      setIsSubscribed(false);
      setStatusMsg({ type: 'success', text: 'Dispositivo desinscrito com sucesso.' });
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setStatusMsg({ type: 'error', text: 'Falha ao remover a inscrição.' });
    } finally {
      setSubLoading(false);
    }
  };

  // Dispatch test push API Call
  const handleSendTestPush = async () => {
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/push/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: testTitle, body: testBody })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.total === 0) {
          setStatusMsg({ type: 'error', text: 'Não foi possível testar: Nenhum dispositivo está inscrito ainda.' });
        } else {
          setStatusMsg({ type: 'success', text: `Notificação enviada para ${data.sent} de ${data.total} aparelhos inscritos!` });
        }
      } else {
        setStatusMsg({ type: 'error', text: `Erro no envio de teste: ${data.error || 'Erro desconhecido'}` });
      }
    } catch (err) {
      console.error('Error sending test push:', err);
      setStatusMsg({ type: 'error', text: 'Falha ao conectar na API de envio de teste.' });
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Configurações do Sistema</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {statusMsg.text && (
          <div 
            className={`badge ${statusMsg.type === 'success' ? 'badge-success' : 'badge-error'}`} 
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              fontSize: '0.9rem', 
              borderRadius: '8px', 
              marginBottom: '20px',
              justifyContent: 'center',
              fontWeight: 500
            }}
          >
            {statusMsg.type === 'success' ? '✓ ' : '✗ '} {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. Meta / WhatsApp Credentials */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#25d366', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>W</span>
              WhatsApp Cloud API (Padrão do Sistema)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
              Configure o número padrão do sistema. Para cadastrar múltiplos números adicionais, utilize o gerenciador de conexões.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number ID</label>
                <input
                  type="text"
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  placeholder="Ex: 1200987366423001"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Access Token</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showWhatsappToken ? 'text' : 'password'}
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    placeholder="EAAGz..."
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                  >
                    {showWhatsappToken ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (whatsappToken) {
                        navigator.clipboard.writeText(whatsappToken);
                        setCopiedWhatsappToken(true);
                        setTimeout(() => setCopiedWhatsappToken(false), 2000);
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                    disabled={!whatsappToken}
                  >
                    {copiedWhatsappToken ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Webhook Verify Token</label>
                <input
                  type="text"
                  value={whatsappVerifyToken}
                  onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">URL Pública da Aplicação (Produção)</label>
                <input
                  type="text"
                  value={publicBaseUrl}
                  onChange={(e) => setPublicBaseUrl(e.target.value)}
                  placeholder="Ex: https://meu-chatbot.vercel.app ou https://xbot.meudominio.com"
                  className="form-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Necessário para que a API do WhatsApp consiga baixar mídias, áudios, imagens e PDFs do seu servidor.
                </span>
              </div>
            </div>

            <Link 
              href="/agents" 
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none', borderColor: 'var(--color-primary)', color: 'var(--color-primary-hover)' }}
            >
              Gerenciar Múltiplas Conexões WhatsApp →
            </Link>
          </div>

          {/* 2. Google Gemini API */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--color-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>G</span>
              Google Gemini AI Configuration
            </h3>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Gemini API Key</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                >
                  {showGeminiKey ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (geminiApiKey) {
                      navigator.clipboard.writeText(geminiApiKey);
                      setCopiedGemini(true);
                      setTimeout(() => setCopiedGemini(false), 2000);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                  disabled={!geminiApiKey}
                >
                  {copiedGemini ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Obtenha uma chave gratuita no Google AI Studio (https://aistudio.google.com).
              </span>
            </div>
          </div>

          {/* 3. Text-to-Speech (TTS) ElevenLabs */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#3b82f6', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>🗣️</span>
              Text-To-Speech (Voz do Robô) - ElevenLabs
            </h3>

            <div className="form-group">
              <label className="form-label">ElevenLabs API Key (Opcional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type={showElevenKey ? 'text' : 'password'}
                  value={elevenLabsApiKey}
                  onChange={(e) => setElevenLabsApiKey(e.target.value)}
                  placeholder="Insira sua chave para habilitar respostas de voz"
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowElevenKey(!showElevenKey)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                >
                  {showElevenKey ? 'Ocultar' : 'Mostrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (elevenLabsApiKey) {
                      navigator.clipboard.writeText(elevenLabsApiKey);
                      setCopiedEleven(true);
                      setTimeout(() => setCopiedEleven(false), 2000);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                  disabled={!elevenLabsApiKey}
                >
                  {copiedEleven ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Voice ID</label>
              <input
                type="text"
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                placeholder="Ex: 21m00Tcm4TlvDq8ikWAM"
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Escolha o ID de voz preferido no portal da ElevenLabs. O padrão é a voz Rachel (21m00Tcm4TlvDq8ikWAM).
              </span>
            </div>
          </div>

          {/* 4. PWA and Push Notifications Settings */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--color-primary-hover)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>⚡</span>
              Configurações de PWA e Notificações Push
            </h3>

            {/* Browser Support & Registration status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Suporte Push no Navegador:</span>
                <strong style={{ color: pushSupported ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {pushSupported ? 'Suportado' : 'Não suportado / Incompatível'}
                </strong>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Inscrição deste Dispositivo:</span>
                <strong style={{ color: isSubscribed ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {isSubscribed ? 'Inscrito e Ativo' : 'Não inscrito'}
                </strong>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Permissão Nativa:</span>
                <strong style={{ 
                  color: notificationPermission === 'granted' ? 'var(--color-success)' : 
                         notificationPermission === 'denied' ? 'var(--color-error)' : 'var(--text-muted)'
                }}>
                  {notificationPermission === 'granted' ? 'Permitido' : 
                   notificationPermission === 'denied' ? 'Bloqueado' : 'Pendente (Default)'}
                </strong>
              </div>
            </div>

            {/* Subscribe Actions */}
            {pushSupported && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
                {!isSubscribed ? (
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '10px 16px', background: 'var(--color-primary-hover)' }}
                    disabled={subLoading}
                  >
                    {subLoading ? 'Inscrevendo...' : 'Ativar Notificações Neste Dispositivo 🔔'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    className="btn btn-danger"
                    style={{ fontSize: '0.85rem', padding: '10px 16px' }}
                    disabled={subLoading}
                  >
                    {subLoading ? 'Desinscrevendo...' : 'Desativar Notificações Neste Dispositivo 🔕'}
                  </button>
                )}
              </div>
            )}

            {/* VAPID credentials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chaves VAPID do Servidor Push</h4>
                <button
                  type="button"
                  onClick={handleGenerateVapidKeys}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', borderColor: 'var(--color-primary)', color: 'var(--color-primary-hover)' }}
                  disabled={vapidLoading}
                >
                  {vapidLoading ? 'Gerando...' : 'Gerar Novas Chaves VAPID 🔑'}
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Chave Pública VAPID (VAPID Public Key)</label>
                <input
                  type="text"
                  value={vapidPublicKey}
                  onChange={(e) => setVapidPublicKey(e.target.value)}
                  placeholder="Gere ou insira a chave pública..."
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Chave Privada VAPID (VAPID Private Key)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={vapidPrivateKey}
                    onChange={(e) => setVapidPrivateKey(e.target.value)}
                    placeholder="Gere ou insira a chave privada..."
                    className="form-input"
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                  >
                    {showPrivateKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (vapidPrivateKey) {
                        navigator.clipboard.writeText(vapidPrivateKey);
                        setCopiedPrivate(true);
                        setTimeout(() => setCopiedPrivate(false), 2000);
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', height: '100%', whiteSpace: 'nowrap' }}
                    disabled={!vapidPrivateKey}
                  >
                    {copiedPrivate ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Push Test Box */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Enviar Notificação Push de Teste
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Título do Teste</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mensagem do Teste</label>
                  <input
                    type="text"
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestPush}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Disparar Teste de Notificação Nativa ⚡
              </button>
            </div>

          </div>

          {/* Action button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: '10px' }} 
            disabled={loading}
          >
            {loading ? 'Salvando Configurações...' : 'Salvar Configurações'}
          </button>

        </form>

        <div className="glass-panel" style={{ padding: '20px', marginTop: '24px', background: 'rgba(255,255,255,0.01)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          💡 <strong>Como funciona o PWA:</strong> Clique na barra de endereços do seu navegador (no botão de instalação "+" ou "Instalar aplicativo") para adicionar o Xbot à tela inicial do seu computador ou celular. Após salvar as chaves VAPID e clicar em "Ativar Notificações", você receberá notificações pop-up nativas mesmo se a aba do sistema estiver fechada!
        </div>

      </div>
    </div>
  );
}
