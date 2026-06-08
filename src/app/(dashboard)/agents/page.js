'use client';

import { useState, useEffect } from 'react';

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp', 'agents', 'flows'
  
  // ==========================================
  // STATE: WhatsApp & API Settings
  // ==========================================
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('antigravity_token_123');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');

  // ==========================================
  // STATE: AI Agents
  // ==========================================
  const [agents, setAgents] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');
  const [agentModel, setAgentModel] = useState('gemini-1.5-flash');
  const [agentTemperature, setAgentTemperature] = useState(0.7);
  const [agentIsActive, setAgentIsActive] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);

  // ==========================================
  // STATE: Chatbot Flows
  // ==========================================
  const [flows, setFlows] = useState([]);
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [flowTrigger, setFlowTrigger] = useState('keyword'); // 'welcome', 'keyword'
  const [flowKeywords, setFlowKeywords] = useState('');
  const [flowSteps, setFlowSteps] = useState([]); // Array of steps
  const [activeFlowEditor, setActiveFlowEditor] = useState(false);
  const [flowLoading, setFlowLoading] = useState(false);

  // ==========================================
  // LIFECYCLE & DATA FETCHING
  // ==========================================
  useEffect(() => {
    // Determine the base URL for the callback endpoint
    if (typeof window !== 'undefined') {
      setCallbackUrl(`${window.location.protocol}//${window.location.host}/api/webhook`);
    }
    
    fetchSettings();
    fetchAgents();
    fetchFlows();
  }, []);

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

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);
    setSettingsError('');

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
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        setSettingsError('Falha ao atualizar configurações.');
      }
    } catch (err) {
      setSettingsError('Erro na conexão com a API.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // ==========================================
  // METHODS: AI AGENTS
  // ==========================================
  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    setAgentLoading(true);
    const payload = {
      name: agentName,
      description: agentDescription,
      systemPrompt: agentSystemPrompt,
      model: agentModel,
      temperature: parseFloat(agentTemperature),
      isActive: agentIsActive
    };

    try {
      let res;
      if (editingAgentId) {
        res = await fetch('/api/agents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingAgentId, ...payload })
        });
      } else {
        res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        resetAgentForm();
        fetchAgents();
      }
    } catch (err) {
      console.error('Error saving agent:', err);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleToggleAgentActive = async (agent) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          temperature: agent.temperature,
          isActive: !agent.isActive
        })
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (err) {
      console.error('Error toggling agent:', err);
    }
  };

  const handleEditAgent = (agent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentDescription(agent.description);
    setAgentSystemPrompt(agent.systemPrompt);
    setAgentModel(agent.model);
    setAgentTemperature(agent.temperature);
    setAgentIsActive(agent.isActive);
  };

  const handleDeleteAgent = async (id) => {
    if (!confirm('Deseja realmente excluir este agente?')) return;

    try {
      const res = await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAgents();
        if (editingAgentId === id) resetAgentForm();
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  const resetAgentForm = () => {
    setEditingAgentId(null);
    setAgentName('');
    setAgentDescription('');
    setAgentSystemPrompt('');
    setAgentModel('gemini-1.5-flash');
    setAgentTemperature(0.7);
    setAgentIsActive(false);
  };

  // ==========================================
  // METHODS: CHATBOT FLOWS
  // ==========================================
  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows');
      if (res.ok) {
        const data = await res.json();
        setFlows(data);
      }
    } catch (err) {
      console.error('Error fetching flows:', err);
    }
  };

  const handleFlowSubmit = async (e) => {
    e.preventDefault();
    if (!flowName.trim()) return;

    setFlowLoading(true);
    const payload = {
      name: flowName,
      trigger: flowTrigger,
      keywords: flowKeywords,
      steps: flowSteps,
      isActive: true
    };

    try {
      let res;
      if (editingFlowId) {
        res = await fetch('/api/flows', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingFlowId, ...payload })
        });
      } else {
        res = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        closeFlowEditor();
        fetchFlows();
      }
    } catch (err) {
      console.error('Error saving flow:', err);
    } finally {
      setFlowLoading(false);
    }
  };

  const handleEditFlow = (flow) => {
    setEditingFlowId(flow.id);
    setFlowName(flow.name);
    setFlowTrigger(flow.trigger);
    setFlowKeywords(flow.keywords);
    setFlowSteps(JSON.parse(flow.steps || '[]'));
    setActiveFlowEditor(true);
  };

  const handleDeleteFlow = async (id) => {
    if (!confirm('Deseja realmente excluir este fluxo de chatbot?')) return;

    try {
      const res = await fetch(`/api/flows?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFlows();
        if (editingFlowId === id) closeFlowEditor();
      }
    } catch (err) {
      console.error('Error deleting flow:', err);
    }
  };

  const handleToggleFlowActive = async (flow) => {
    try {
      const res = await fetch('/api/flows', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: flow.id,
          isActive: !flow.isActive
        })
      });

      if (res.ok) {
        fetchFlows();
      }
    } catch (err) {
      console.error('Error toggling flow:', err);
    }
  };

  const createNewFlow = () => {
    setEditingFlowId(null);
    setFlowName('');
    setFlowTrigger('keyword');
    setFlowKeywords('');
    // Initial standard steps structure
    setFlowSteps([
      {
        id: 'boas_vindas',
        text: 'Olá! Seja bem-vindo ao nosso atendimento virtual. Escolha uma das opções abaixo para começar:',
        buttons: [
          { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: 'Falar com IA 🤖', action: 'transfer_to_ia', targetStepId: '' },
          { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: 'Dúvidas e Preços 🏷️', action: 'go_to_step', targetStepId: 'menu_precos' },
          { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: 'Atendimento Humano 👤', action: 'transfer_to_human', targetStepId: '' }
        ]
      },
      {
        id: 'menu_precos',
        text: 'Oferecemos os seguintes planos:\n1. Básico - R$ 49/mês\n2. Completo - R$ 99/mês\n\nComo gostaria de prosseguir?',
        buttons: [
          { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: 'Tirar dúvidas (IA)', action: 'transfer_to_ia', targetStepId: '' },
          { id: `btn_${Math.random().toString(36).substr(2, 5)}`, title: 'Voltar ao Menu', action: 'go_to_step', targetStepId: 'boas_vindas' }
        ]
      }
    ]);
    setActiveFlowEditor(true);
  };

  const loadFlowTemplate = (type) => {
    if (type === 'hybrid') {
      setFlowName('Fluxo Híbrido Automático');
      setFlowTrigger('welcome');
      setFlowKeywords('');
      setFlowSteps([
        {
          id: 'step_boas_vindas',
          text: 'Olá! Como posso te ajudar hoje?\nPor favor, escolha uma opção clicando nos botões abaixo:',
          buttons: [
            { id: 'b_falar_ia', title: 'Assistente IA 🤖', action: 'transfer_to_ia', targetStepId: '' },
            { id: 'b_informacoes', title: 'Ver Serviços 💼', action: 'go_to_step', targetStepId: 'step_servicos' },
            { id: 'b_suporte_human', title: 'Falar com Atendente', action: 'transfer_to_human', targetStepId: '' }
          ]
        },
        {
          id: 'step_servicos',
          text: 'Disponibilizamos suporte e assessoria tecnológica:\n1. Criação de Chatbots personalizados\n2. Integração de IA e Voz\n3. Sistemas Sob Medida\n\nO que deseja fazer?',
          buttons: [
            { id: 'b_voltar_menu', title: 'Voltar ao Menu', action: 'go_to_step', targetStepId: 'step_boas_vindas' },
            { id: 'b_falar_ia2', title: 'Mais informações (IA)', action: 'transfer_to_ia', targetStepId: '' }
          ]
        }
      ]);
    }
  };

  const closeFlowEditor = () => {
    setActiveFlowEditor(false);
    setEditingFlowId(null);
    setFlowName('');
    setFlowTrigger('keyword');
    setFlowKeywords('');
    setFlowSteps([]);
  };

  const addStepToFlow = () => {
    const newStepId = `etapa_${Math.random().toString(36).substr(2, 5)}`;
    setFlowSteps([
      ...flowSteps,
      {
        id: newStepId,
        text: 'Nova mensagem do fluxo. Escreva o texto aqui...',
        buttons: []
      }
    ]);
  };

  const updateStepText = (index, value) => {
    const updated = [...flowSteps];
    updated[index].text = value;
    setFlowSteps(updated);
  };

  const updateStepId = (index, value) => {
    const cleanValue = value.replace(/\s+/g, '_').toLowerCase();
    const updated = [...flowSteps];
    updated[index].id = cleanValue;
    setFlowSteps(updated);
  };

  const removeStepFromFlow = (index) => {
    const updated = [...flowSteps];
    updated.splice(index, 1);
    setFlowSteps(updated);
  };

  const addButtonToStep = (stepIndex) => {
    const updated = [...flowSteps];
    if (updated[stepIndex].buttons.length >= 3) {
      alert('O WhatsApp permite no máximo 3 botões interativos por mensagem.');
      return;
    }
    updated[stepIndex].buttons.push({
      id: `btn_${Math.random().toString(36).substr(2, 5)}`,
      title: 'Novo Botão',
      action: 'go_to_step',
      targetStepId: ''
    });
    setFlowSteps(updated);
  };

  const updateButtonField = (stepIndex, buttonIndex, field, value) => {
    const updated = [...flowSteps];
    updated[stepIndex].buttons[buttonIndex][field] = value;
    setFlowSteps(updated);
  };

  const removeButtonFromStep = (stepIndex, buttonIndex) => {
    const updated = [...flowSteps];
    updated[stepIndex].buttons.splice(buttonIndex, 1);
    setFlowSteps(updated);
  };

  // ==========================================
  // COPY TO CLIPBOARD HELPER
  // ==========================================
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  return (
    <div className="main-content">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Gerenciador de Conexões e Fluxos</h1>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '4px', borderRadius: '12px', gap: '4px' }}>
          <button
            onClick={() => { setActiveTab('whatsapp'); closeFlowEditor(); }}
            className={`btn ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none' }}
          >
            Conexão WhatsApp & APIs
          </button>
          <button
            onClick={() => { setActiveTab('agents'); closeFlowEditor(); }}
            className={`btn ${activeTab === 'agents' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none' }}
          >
            Agentes de IA (Persona)
          </button>
          <button
            onClick={() => { setActiveTab('flows'); }}
            className={`btn ${activeTab === 'flows' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none' }}
          >
            Chatbot e Fluxos Híbridos
          </button>
        </div>
      </header>

      <div className="page-body animate-fade-in" style={{ padding: '24px' }}>
        
        {/* =====================================================================
            TAB 1: WHATSAPP CONNECTION & APIS SETUP
            ===================================================================== */}
        {activeTab === 'whatsapp' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', alignItems: 'start' }}>
            
            {/* Connection Form */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Credenciais da API</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Preencha os dados oficiais do Meta Developer Console e outras chaves de IA do sistema.
              </p>

              {settingsSuccess && (
                <div style={{ padding: '12px', background: 'var(--color-success-bg)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-success)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
                  ✓ Configurações salvas e aplicadas com sucesso!
                </div>
              )}
              {settingsError && (
                <div style={{ padding: '12px', background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
                  ✗ {settingsError}
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary-hover)', marginBottom: '12px' }}>WhatsApp Cloud API</h3>
                  
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Phone Number ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 34892401824901"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Temporary or Permanent Access Token</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="EAAGz..."
                      value={whatsappToken}
                      onChange={(e) => setWhatsappToken(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Webhook Verification Token (Verify Token)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={whatsappVerifyToken}
                      onChange={(e) => setWhatsappVerifyToken(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '12px' }}>Provedores de Inteligência Artificial</h3>
                  
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Chave de API do Google Gemini</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">ElevenLabs API Key (Voz)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Sua chave ElevenLabs"
                      value={elevenLabsApiKey}
                      onChange={(e) => setElevenLabsApiKey(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">ElevenLabs Voice ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={elevenLabsVoiceId}
                      onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '12px', justifyContent: 'center', fontWeight: 600, fontSize: '0.95rem', marginTop: '10px' }} disabled={settingsLoading}>
                  {settingsLoading ? 'Salvando Configurações...' : 'Salvar Todas as Configurações'}
                </button>

              </form>
            </div>

            {/* Instruction Panel & Status checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Webhook Settings Copy Panel */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Configuração do Webhook no Meta</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px' }}>
                  No painel de desenvolvedor do Facebook (Meta for Developers), configure o Webhook do WhatsApp informando estes valores:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>URL de Callback:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-input" value={callbackUrl} readOnly style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                      <button onClick={() => copyToClipboard(callbackUrl)} className="btn btn-secondary" style={{ padding: '0 12px' }}>Copiar</button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Token de Verificação:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-input" value={whatsappVerifyToken} readOnly style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)' }} />
                      <button onClick={() => copyToClipboard(whatsappVerifyToken)} className="btn btn-secondary" style={{ padding: '0 12px' }}>Copiar</button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.1)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  ℹ <strong>Lembrete:</strong> Ao configurar o Webhook, assine os campos de eventos para **`messages`** no Meta para que as conversas sejam recebidas pelo ZapFlow.
                </div>
              </div>

              {/* Status Integration Checklist */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Status das APIs</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Conexão com WhatsApp</span>
                    <span className={`badge ${whatsappToken && whatsappPhoneId ? 'badge-success' : 'badge-warning'}`}>
                      {whatsappToken && whatsappPhoneId ? 'Configurado' : 'Pendente'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Chave Gemini AI</span>
                    <span className={`badge ${geminiApiKey ? 'badge-success' : 'badge-warning'}`}>
                      {geminiApiKey ? 'Ativo' : 'Pendente'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Voz ElevenLabs</span>
                    <span className={`badge ${elevenLabsApiKey ? 'badge-success' : 'badge-warning'}`}>
                      {elevenLabsApiKey ? 'Pronto' : 'Desativado'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: AI AGENTS SETUP (PERSONA)
            ===================================================================== */}
        {activeTab === 'agents' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
            
            {/* Agent Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 600 }}>
                {editingAgentId ? 'Editar Agente IA' : 'Criar Novo Agente IA'}
              </h2>
              
              <form onSubmit={handleAgentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nome do Agente</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Ex: Lara - Suporte Comercial"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição Breve</label>
                  <input
                    type="text"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="Ex: Focada em qualificação de leads"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Modelo de IA (LLM)</label>
                  <select
                    value={agentModel}
                    onChange={(e) => setAgentModel(e.target.value)}
                    className="form-select"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recomendado - Rápido)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Raciocínio Avançado)</option>
                  </select>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Temperatura (Criatividade)</label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>{agentTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={agentTemperature}
                    onChange={(e) => setAgentTemperature(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Mais Preciso (0.1)</span>
                    <span>Mais Criativo (1.0)</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Instrução do Sistema (System Prompt Persona)</label>
                  <textarea
                    value={agentSystemPrompt}
                    onChange={(e) => setAgentSystemPrompt(e.target.value)}
                    placeholder="Defina o comportamento da IA. Ex: 'Você é a atendente virtual da empresa X. Responda de forma prestativa, use emojis, e ofereça auxílio comercial...'"
                    className="form-textarea"
                    style={{ minHeight: '140px' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-glass)' }}>
                  <span className="form-label" style={{ margin: 0 }}>Ativar este agente?</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={agentIsActive}
                      onChange={(e) => setAgentIsActive(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }} disabled={agentLoading}>
                    {agentLoading ? 'Salvando...' : editingAgentId ? 'Salvar Alterações' : 'Criar Agente'}
                  </button>
                  {editingAgentId && (
                    <button type="button" onClick={resetAgentForm} className="btn btn-secondary">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Agents List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Agentes IA Cadastrados</h2>
              
              {agents.length === 0 ? (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum agente de IA cadastrado. Preencha o formulário para criar!
                </div>
              ) : (
                agents.map((agent) => (
                  <div 
                    key={agent.id} 
                    className="glass-panel glass-card"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      border: agent.isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {agent.name}
                          {agent.isActive && (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Ativo</span>
                          )}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agent.description || 'Sem descrição'}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditAgent(agent)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '6px' }} title="Editar">
                          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteAgent(agent.id)} className="btn btn-danger" style={{ padding: '6px', borderRadius: '6px' }} title="Excluir">
                          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Instruções (Persona):</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                        {agent.systemPrompt}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Modelo: <code style={{ color: 'var(--color-primary-hover)' }}>{agent.model}</code></span>
                      <span>Temp: {agent.temperature}</span>
                      
                      <button
                        onClick={() => handleToggleAgentActive(agent)}
                        className={`btn ${agent.isActive ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        {agent.isActive ? 'Desativar' : 'Ativar Persona'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: CHATBOT FLOW BUILDER
            ===================================================================== */}
        {activeTab === 'flows' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'start' }}>
            
            {/* Flows Directory (Left Side) */}
            <div className="glass-panel" style={{ flex: '1 1 300px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Meus Fluxos</h2>
                <button onClick={createNewFlow} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  + Novo Fluxo
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {flows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum fluxo cadastrado. Crie um fluxo manual ou use um modelo!
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => { createNewFlow(); loadFlowTemplate('hybrid'); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                        Carregar Fluxo Híbrido Exemplo
                      </button>
                    </div>
                  </div>
                ) : (
                  flows.map((flow) => {
                    const parsedSteps = JSON.parse(flow.steps || '[]');
                    return (
                      <div
                        key={flow.id}
                        style={{
                          padding: '12px 16px',
                          background: flow.isActive ? 'rgba(139, 92, 246, 0.03)' : 'rgba(255,255,255,0.01)',
                          border: flow.isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{flow.name}</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleEditFlow(flow)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Editar</button>
                            <button onClick={() => handleDeleteFlow(flow.id)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Excluir</button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span className={`badge ${flow.trigger === 'welcome' ? 'badge-success' : 'badge-warning'}`}>
                            {flow.trigger === 'welcome' ? 'Entrada Principal' : 'Por palavra-chave'}
                          </span>
                          {flow.trigger === 'keyword' && (
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              Palavras: {flow.keywords || 'Nenhuma'}
                            </span>
                          )}
                          <span>({parsedSteps.length} etapas)</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
                          <button
                            onClick={() => handleToggleFlowActive(flow)}
                            className={`btn ${flow.isActive ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            {flow.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Interactive Flow Step Builder (Right Side) */}
            {activeFlowEditor && (
              <div className="glass-panel animate-fade-in" style={{ flex: '2 1 500px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {editingFlowId ? 'Editar Construtor de Fluxo' : 'Construir Novo Fluxo'}
                  </h2>
                  <button onClick={closeFlowEditor} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleFlowSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Flow Configuration Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nome do Fluxo</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Boas Vindas Comercial"
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Como o Fluxo é Ativado?</label>
                      <select
                        className="form-select"
                        value={flowTrigger}
                        onChange={(e) => setFlowTrigger(e.target.value)}
                      >
                        <option value="keyword">Por palavra-chave do cliente</option>
                        <option value="welcome">Welcome Flow (Primeiro contato / Sem atendimento ativo)</option>
                      </select>
                    </div>

                    {flowTrigger === 'keyword' && (
                      <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                        <label className="form-label">Palavras-chave de Ativação (separadas por vírgula)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ex: oi, ola, menu, iniciar, ajuda"
                          value={flowKeywords}
                          onChange={(e) => setFlowKeywords(e.target.value)}
                          required={flowTrigger === 'keyword'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Steps List */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Etapas e Respostas do Fluxo</h3>
                      <button type="button" onClick={addStepToFlow} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary-hover)' }}>
                        + Adicionar Etapa
                      </button>
                    </div>

                    {flowSteps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                        Nenhuma etapa criada neste fluxo. Clique em "Adicionar Etapa" para começar a montar o bot.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {flowSteps.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            style={{
                              padding: '20px',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '16px',
                              position: 'relative'
                            }}
                          >
                            {/* Step Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  width: '24px',
                                  height: '24px',
                                  background: 'var(--color-primary)',
                                  borderRadius: '50%',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  color: 'white'
                                }}>
                                  {stepIndex + 1}
                                </span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Identificador da Etapa:</span>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ padding: '4px 8px', width: '150px', fontSize: '0.8rem', margin: 0 }}
                                  value={step.id}
                                  onChange={(e) => updateStepId(stepIndex, e.target.value)}
                                  placeholder="etapa_1"
                                  required
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => removeStepFromFlow(stepIndex)}
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'none', color: 'var(--color-error)' }}
                              >
                                Excluir Etapa
                              </button>
                            </div>

                            {/* Step Text Message */}
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                              <label className="form-label">Mensagem que o Bot vai Enviar</label>
                              <textarea
                                className="form-textarea"
                                style={{ minHeight: '80px', fontSize: '0.9rem', padding: '10px' }}
                                value={step.text}
                                onChange={(e) => updateStepText(stepIndex, e.target.value)}
                                placeholder="Digite a mensagem de texto..."
                                required
                              />
                            </div>

                            {/* Clickable Buttons / Menu Options */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  Botões Clicáveis do WhatsApp (Máx. 3)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addButtonToStep(stepIndex)}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  disabled={step.buttons.length >= 3}
                                >
                                  + Adicionar Botão
                                </button>
                              </div>

                              {step.buttons.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                                  Sem botões nesta etapa. O bot enviará apenas o texto e aguardará resposta aberta.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {step.buttons.map((btn, btnIndex) => (
                                    <div
                                      key={btnIndex}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.2fr 1fr 1fr auto',
                                        gap: '8px',
                                        alignItems: 'center',
                                        background: 'rgba(255,255,255,0.01)',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-glass)'
                                      }}
                                    >
                                      {/* Button text */}
                                      <input
                                        type="text"
                                        className="form-input"
                                        style={{ padding: '6px', fontSize: '0.8rem', margin: 0 }}
                                        value={btn.title}
                                        onChange={(e) => updateButtonField(stepIndex, btnIndex, 'title', e.target.value)}
                                        placeholder="Texto do Botão (Máx 20c)"
                                        maxLength={20}
                                        required
                                      />

                                      {/* Button Action */}
                                      <select
                                        className="form-select"
                                        style={{ padding: '6px', fontSize: '0.8rem', margin: 0 }}
                                        value={btn.action}
                                        onChange={(e) => updateButtonField(stepIndex, btnIndex, 'action', e.target.value)}
                                      >
                                        <option value="go_to_step">Ir para Etapa</option>
                                        <option value="transfer_to_ia">Ativar Agente IA</option>
                                        <option value="transfer_to_human">Transferir Humano</option>
                                      </select>

                                      {/* Action target step (only if go_to_step) */}
                                      {btn.action === 'go_to_step' ? (
                                        <select
                                          className="form-select"
                                          style={{ padding: '6px', fontSize: '0.8rem', margin: 0 }}
                                          value={btn.targetStepId}
                                          onChange={(e) => updateButtonField(stepIndex, btnIndex, 'targetStepId', e.target.value)}
                                          required
                                        >
                                          <option value="">-- Selecione Etapa --</option>
                                          {flowSteps.map((s, idx) => (
                                            <option key={idx} value={s.id}>{s.id}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                          {btn.action === 'transfer_to_ia' ? 'Conecta c/ IA' : 'Pausa o Bot'}
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => removeButtonFromStep(stepIndex, btnIndex)}
                                        className="btn btn-danger"
                                        style={{ padding: '6px', color: 'var(--color-error)', background: 'none' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit buttons */}
                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 600, fontSize: '0.95rem' }} disabled={flowLoading}>
                      {flowLoading ? 'Salvando Fluxo...' : editingFlowId ? 'Salvar Alterações de Fluxo' : 'Criar Fluxo de Chatbot'}
                    </button>
                    <button type="button" onClick={closeFlowEditor} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
                      Cancelar
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
