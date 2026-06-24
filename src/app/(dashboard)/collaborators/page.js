'use client';

import { useState, useEffect } from 'react';

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loggedUser, setLoggedUser] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedConnections, setSelectedConnections] = useState([]);

  // Connection Edit states
  const [editingCollab, setEditingCollab] = useState(null);
  const [editSelectedConnections, setEditSelectedConnections] = useState([]);

  // Status/Loading States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchLoggedUser();
    fetchCollaborators();
    fetchConnections();
  }, []);

  async function fetchLoggedUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setLoggedUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching logged user:', err);
    }
  };

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  async function fetchCollaborators() {
    setFetching(true);
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      } else {
        const data = await res.json();
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao carregar colaboradores.' });
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, connectionIds: selectedConnections })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Colaborador ${data.name} adicionado com sucesso!` });
        setName('');
        setEmail('');
        setPassword('');
        setSelectedConnections([]);
        fetchCollaborators();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao adicionar colaborador.' });
      }
    } catch (err) {
      console.error('Error creating collaborator:', err);
      setStatusMsg({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const startEditConnections = (collab) => {
    setEditingCollab(collab);
    setEditSelectedConnections(collab.connections?.map(c => c.id) || []);
  };

  const handleSaveConnections = async () => {
    if (!editingCollab) return;
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/collaborators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCollab.id,
          connectionIds: editSelectedConnections
        })
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Números designados para ${editingCollab.name} atualizados com sucesso!` });
        setEditingCollab(null);
        fetchCollaborators();
      } else {
        const data = await res.json();
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao atualizar designações.' });
      }
    } catch (err) {
      console.error('Error updating collaborator connections:', err);
      setStatusMsg({ type: 'error', text: 'Falha na conexão ao atualizar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (loggedUser && id === loggedUser.id) {
      alert('Você não pode excluir o seu próprio usuário.');
      return;
    }

    if (!confirm(`Tem certeza de que deseja remover o colaborador "${name}"?`)) {
      return;
    }

    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch(`/api/collaborators?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Colaborador "${name}" removido com sucesso!` });
        fetchCollaborators();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Erro ao remover colaborador.' });
      }
    } catch (err) {
      console.error('Error deleting collaborator:', err);
      setStatusMsg({ type: 'error', text: 'Falha na conexão ao remover.' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Gestão de Colaboradores</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
        
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

        {/* Connection Assignment Panel */}
        {editingCollab && (
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary-hover)' }}>
            <h3 style={{ marginBottom: '6px', fontSize: '1.1rem', fontWeight: 600 }}>
              Gerenciar Números de Atendimento: {editingCollab.name}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Selecione quais conexões de WhatsApp este colaborador poderá visualizar e gerenciar no Live Chat.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {connections.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', fontSize: '0.85rem' }}>Nenhum número de WhatsApp cadastrado no sistema.</div>
              ) : connections.map((conn) => (
                <label 
                  key={conn.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    fontSize: '0.85rem', 
                    color: 'white', 
                    cursor: 'pointer', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border-glass)', 
                    borderRadius: '8px',
                    transition: 'border-color 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editSelectedConnections.includes(conn.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditSelectedConnections([...editSelectedConnections, conn.id]);
                      } else {
                        setEditSelectedConnections(editSelectedConnections.filter(id => id !== conn.id));
                      }
                    }}
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ display: 'block', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{conn.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{conn.phoneNumber || conn.whatsappPhoneId}</span>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveConnections}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button
                onClick={() => setEditingCollab(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="dashboard-split-layout">
          
          {/* List panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
              Colaboradores Ativos
            </h3>

            {fetching ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                Carregando colaboradores...
              </div>
            ) : collaborators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                Nenhum colaborador cadastrado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {collaborators.map((collab) => {
                  const isSelf = loggedUser && collab.id === loggedUser.id;
                  return (
                    <div 
                      key={collab.id} 
                      className="responsive-list-row"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '14px 16px', 
                        background: 'rgba(255, 255, 255, 0.01)', 
                        border: '1px solid var(--border-glass)', 
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))', 
                            border: '1px solid rgba(255,255,255,0.06)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '0.9rem', 
                            fontWeight: 600, 
                            color: 'white',
                            flexShrink: 0
                          }}
                        >
                          {getInitials(collab.name)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {collab.name} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-hover)', marginLeft: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>Você</span>}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {collab.email}
                          </span>
                          
                          {/* Designated Connections tags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {collab.connections && collab.connections.length > 0 ? (
                              collab.connections.map(conn => (
                                <span key={conn.id} style={{ padding: '2px 6px', background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.15)', color: '#25d366', borderRadius: '4px', fontSize: '0.7rem' }}>
                                  📞 {conn.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', borderRadius: '4px', fontSize: '0.7rem' }}>
                                🔓 Acesso Total
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '12px' }}>
                        <button
                          onClick={() => startEditConnections(collab)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--border-glass)' }}
                          title="Designar números para este colaborador"
                        >
                          ⚙️ Números
                        </button>
                        {!isSelf && (
                          <button 
                            onClick={() => handleDelete(collab.id, collab.name)}
                            className="btn btn-danger"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Creation panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
              Adicionar Colaborador
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Senha Provisória</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="form-input"
                />
              </div>

              {/* Checkbox selector for Connections */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Números Atribuídos (Opcional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                  {connections.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum número cadastrado.</span>
                  ) : connections.map((conn) => (
                    <label key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedConnections.includes(conn.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedConnections([...selectedConnections, conn.id]);
                          } else {
                            setSelectedConnections(selectedConnections.filter(id => id !== conn.id));
                          }
                        }}
                      />
                      {conn.name}
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Selecione quais números este colaborador irá atender. Se não marcar nenhuma, ele terá acesso total.
                </span>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.9rem', marginTop: '10px' }} 
                disabled={loading}
              >
                {loading ? 'Adicionando...' : 'Adicionar Colaborador'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
