'use client';

import { useState, useEffect } from 'react';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [isActive, setIsActive] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch all agents
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

  useEffect(() => {
    const load = async () => {
      await fetchAgents();
    };
    load();
  }, []);

  // Handle Form Submit (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const payload = {
      name,
      description,
      systemPrompt,
      model,
      temperature: parseFloat(temperature),
      isActive
    };

    try {
      let res;
      if (editingId) {
        res = await fetch('/api/agents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload })
        });
      } else {
        res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        resetForm();
        fetchAgents();
      }
    } catch (err) {
      console.error('Error saving agent:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active State directly from the card
  const handleToggleActive = async (agent) => {
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
          isActive: !agent.isActive // Toggle
        })
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (err) {
      console.error('Error toggling active state:', err);
    }
  };

  // Load agent details into form for editing
  const handleEdit = (agent) => {
    setEditingId(agent.id);
    setName(agent.name);
    setDescription(agent.description);
    setSystemPrompt(agent.systemPrompt);
    setModel(agent.model);
    setTemperature(agent.temperature);
    setIsActive(agent.isActive);
  };

  // Delete Agent
  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este agente?')) return;

    try {
      const res = await fetch(`/api/agents?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchAgents();
        if (editingId === id) resetForm();
      }
    } catch (err) {
      console.error('Error deleting agent:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setSystemPrompt('');
    setModel('gemini-1.5-flash');
    setTemperature(0.7);
    setIsActive(false);
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Gerenciador de Agentes IA</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Agent Setup Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 600 }}>
            {editingId ? 'Editar Agente' : 'Criar Novo Agente'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nome do Agente</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Clara - Suporte Técnico"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição Breve</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Responsável por tirar dúvidas de produtos"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Modelo de IA (LLM)</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="form-select"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recomendado - Rápido)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Raciocínio Avançado)</option>
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Temperatura (Criatividade)</label>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
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
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Escreva como o robô deve se comportar. Ex: 'Você é a Clara, atendente virtual da loja X. Seu tom deve ser super carismático, use emojis e responda em português brasileiro. Seja breve nas respostas...'"
                className="form-textarea"
                style={{ minHeight: '140px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-glass)' }}>
              <span className="form-label" style={{ margin: 0 }}>Ativar Imediatamente?</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flexGrow: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Agente'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancelar
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Agents List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Agentes Cadastrados</h2>
          
          {agents.length === 0 ? (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum agente cadastrado. Crie um no formulário lateral!
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
                    <button 
                      onClick={() => handleEdit(agent)} 
                      className="btn btn-secondary" 
                      style={{ padding: '6px', borderRadius: '6px' }}
                      title="Editar"
                    >
                      <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(agent.id)} 
                      className="btn btn-danger" 
                      style={{ padding: '6px', borderRadius: '6px' }}
                      title="Excluir"
                    >
                      <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Prompt do Sistema:</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                    {agent.systemPrompt}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Modelo: <code style={{ color: 'var(--color-primary-hover)' }}>{agent.model}</code></span>
                  <span>Temp: {agent.temperature}</span>
                  
                  <button
                    onClick={() => handleToggleActive(agent)}
                    className={`btn ${agent.isActive ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    {agent.isActive ? 'Desativar' : 'Ativar Agente'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
