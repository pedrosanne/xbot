'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setWhatsappToken(data.whatsappToken || '');
          setWhatsappPhoneId(data.whatsappPhoneId || '');
          setWhatsappVerifyToken(data.whatsappVerifyToken || 'antigravity_token_123');
          setGeminiApiKey(data.geminiApiKey || '');
          setElevenLabsApiKey(data.elevenLabsApiKey || '');
          setElevenLabsVoiceId(data.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, []);

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
          geminiApiKey,
          elevenLabsApiKey,
          elevenLabsVoiceId
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

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Configurações do Sistema</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
        
        {statusMsg.text && (
          <div 
            className={`badge ${statusMsg.type === 'success' ? 'badge-success' : 'badge-error'}`} 
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              fontSize: '0.9rem', 
              borderRadius: '8px', 
              marginBottom: '20px',
              justifyContent: 'center' 
            }}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. Meta / WhatsApp Credentials */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#25d366', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>W</span>
              WhatsApp Cloud API (Meta Developer)
            </h3>
            
            <div className="form-group">
              <label className="form-label">Token de Acesso Temporário ou Permanente</label>
              <input
                type="password"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                placeholder="EAAGz..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ID do Número de Telefone (Phone Number ID)</label>
              <input
                type="text"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
                placeholder="Ex: 10565856236589"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Token de Verificação do Webhook (Verify Token)</label>
              <input
                type="text"
                value={whatsappVerifyToken}
                onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                placeholder="Digite o token usado para validar o webhook"
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Insira este mesmo token na configuração de Webhook do portal do Meta for Developers.
              </span>
            </div>
          </div>

          {/* 2. Google Gemini API */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--color-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>G</span>
              Google Gemini AI Configuration
            </h3>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Gemini API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="form-input"
              />
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
              <input
                type="password"
                value={elevenLabsApiKey}
                onChange={(e) => setElevenLabsApiKey(e.target.value)}
                placeholder="Insira sua chave para habilitar respostas de voz"
                className="form-input"
              />
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

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem' }} 
            disabled={loading}
          >
            {loading ? 'Salvando Configurações...' : 'Salvar Configurações'}
          </button>

        </form>

        <div className="glass-panel" style={{ padding: '20px', marginTop: '24px', background: 'rgba(255,255,255,0.01)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          💡 <strong>Como testar sem WhatsApp API:</strong> Deixe os campos de WhatsApp em branco e insira apenas a chave do Google Gemini. Vá para a aba <strong>Live Chat</strong> e use o <strong>Simulador de Clientes</strong> à direita para enviar e receber mensagens como se estivesse conversando no WhatsApp!
        </div>

      </div>
    </div>
  );
}
