'use client';

import { useState, useEffect } from 'react';

export default function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState([]);
  const [loggedUser, setLoggedUser] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status/Loading States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchLoggedUser();
    fetchCollaborators();
  }, []);

  const fetchLoggedUser = async () => {
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

  const fetchCollaborators = async () => {
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
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Colaborador ${data.name} adicionado com sucesso!` });
        setName('');
        setEmail('');
        setPassword('');
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
    <div className="main-content">
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
          
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                            color: 'white' 
                          }}
                        >
                          {getInitials(collab.name)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'white' }}>
                            {collab.name} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-hover)', marginLeft: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>Você</span>}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {collab.email}
                          </span>
                        </div>
                      </div>

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
