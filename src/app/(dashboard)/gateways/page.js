'use client';

import { useState, useEffect } from 'react';

export default function GatewaysPage() {
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'history'
  const [gateways, setGateways] = useState([]);
  const [payments, setPayments] = useState([]);
  const [origin, setOrigin] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('mercadopago');
  const [apiKey, setApiKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Edit states
  const [editingGateway, setEditingGateway] = useState(null);

  // Status/Loading States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchGateways();
    fetchPayments();
  }, []);

  const fetchGateways = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/gateways');
      if (res.ok) {
        setGateways(await res.json());
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao carregar gateways.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setFetching(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/gateways/payments');
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, apiKey, publicKey, webhookSecret, isActive })
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Gateway "${name}" criado com sucesso!` });
        setName('');
        setType('mercadopago');
        setApiKey('');
        setPublicKey('');
        setWebhookSecret('');
        setIsActive(true);
        fetchGateways();
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao criar gateway.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao salvar gateway.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingGateway) return;
    setLoading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch('/api/gateways', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGateway.id,
          name: editingGateway.name,
          type: editingGateway.type,
          apiKey: editingGateway.apiKey,
          publicKey: editingGateway.publicKey,
          webhookSecret: editingGateway.webhookSecret,
          isActive: editingGateway.isActive
        })
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Gateway "${editingGateway.name}" atualizado!` });
        setEditingGateway(null);
        fetchGateways();
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao atualizar.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao salvar alterações.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, gName) => {
    if (!confirm(`Excluir gateway "${gName}"? Todas as transações deste gateway serão apagadas.`)) {
      return;
    }
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await fetch(`/api/gateways?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Gateway "${gName}" excluído.` });
        fetchGateways();
        fetchPayments();
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao excluir.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Falha na conexão ao excluir.' });
    }
  };

  const copyToClipboard = (id) => {
    const url = `${origin}/api/webhooks/payments/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const getProviderName = (pType) => {
    const map = {
      mercadopago: 'Mercado Pago',
      stripe: 'Stripe',
      asaas: 'Asaas',
      naut: 'Naut',
      custom: 'Custom / API'
    };
    return map[pType] || pType;
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <h1 className="page-title">Gestão de Gateways & Pagamentos</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('config')}
            className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: activeTab === 'config' ? 'white' : 'transparent' }}
          >
            ⚙️ Configurar Gateways
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              fetchPayments();
            }}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: activeTab === 'history' ? 'white' : 'transparent' }}
          >
            💳 Histórico de Transações
          </button>
        </div>

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

        {activeTab === 'config' ? (
          <div>
            {/* Edit Mode Modal / Form Overlay */}
            {editingGateway && (
              <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary-hover)' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
                  Editar Gateway: {editingGateway.name}
                </h3>
                <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome de Identificação</label>
                    <input
                      type="text"
                      required
                      value={editingGateway.name}
                      onChange={(e) => setEditingGateway({ ...editingGateway, name: e.target.value })}
                      placeholder="Ex: Mercado Pago Produção"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Provedor</label>
                    <select
                      value={editingGateway.type}
                      onChange={(e) => setEditingGateway({ ...editingGateway, type: e.target.value })}
                      className="form-input"
                     
                    >
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="stripe">Stripe</option>
                      <option value="asaas">Asaas</option>
                      <option value="naut">Naut</option>
                      <option value="custom">Custom (Geral)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">API Key / Secret Token (Senha/Token do Provedor)</label>
                    <input
                      type="password"
                      value={editingGateway.apiKey}
                      onChange={(e) => setEditingGateway({ ...editingGateway, apiKey: e.target.value })}
                      placeholder="Chave privada ou Token secreto"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Public Key / Client ID (Opcional)</label>
                    <input
                      type="text"
                      value={editingGateway.publicKey}
                      onChange={(e) => setEditingGateway({ ...editingGateway, publicKey: e.target.value })}
                      placeholder="Chave pública do gateway"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Webhook Secret / Assinatura (Opcional)</label>
                    <input
                      type="text"
                      value={editingGateway.webhookSecret}
                      onChange={(e) => setEditingGateway({ ...editingGateway, webhookSecret: e.target.value })}
                      placeholder="Assinatura secreta para verificar payload"
                      className="form-input"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="editIsActive"
                      checked={editingGateway.isActive}
                      onChange={(e) => setEditingGateway({ ...editingGateway, isActive: e.target.checked })}
                    />
                    <label htmlFor="editIsActive" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Gateway Ativo</label>
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button type="button" onClick={() => setEditingGateway(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>
              
              {/* Gateways List */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
                  Gateways Configurados
                </h3>

                {fetching ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Carregando gateways...
                  </div>
                ) : gateways.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Nenhum gateway configurado. Adicione um novo gateway ao lado para receber pagamentos.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {gateways.map((g) => (
                      <div 
                        key={g.id} 
                        style={{ 
                          padding: '16px', 
                          background: 'rgba(255, 255, 255, 0.01)', 
                          border: '1px solid var(--border-glass)', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem', marginRight: '8px' }}>{g.name}</span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {getProviderName(g.type)}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span 
                              style={{ 
                                fontSize: '0.72rem', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                background: g.isActive ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)', 
                                color: g.isActive ? '#2ed573' : '#ff4757',
                                border: `1px solid ${g.isActive ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 71, 87, 0.2)'}`
                              }}
                            >
                              {g.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                            <button
                              onClick={() => setEditingGateway(g)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(g.id, g.name)}
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>

                        {/* Webhook Endpoint section */}
                        <div style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                            URL de Webhook (Configure no portal do provedor):
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              readOnly
                              value={`${origin}/api/webhooks/payments/${g.id}`}
                              style={{ 
                                flex: 1, 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text-primary)', 
                                fontSize: '0.75rem', 
                                fontFamily: 'monospace', 
                                outline: 'none' 
                              }}
                              onClick={(e) => e.target.select()}
                            />
                            <button
                              onClick={() => copyToClipboard(g.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              {copiedId === g.id ? 'Copiado! ✓' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Gateway Form */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
                  Adicionar Gateway
                </h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome de Identificação</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Mercado Pago Principal"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Provedor</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="form-input"
                     
                    >
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="stripe">Stripe</option>
                      <option value="asaas">Asaas</option>
                      <option value="naut">Naut</option>
                      <option value="custom">Custom (Geral)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">API Key / Secret Token</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Secret Key ou Access Token"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Public Key / Client ID (Opcional)</label>
                    <input
                      type="text"
                      value={publicKey}
                      onChange={(e) => setPublicKey(e.target.value)}
                      placeholder="PublicKey ou ClientID"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Webhook Secret / Assinatura (Opcional)</label>
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Assinatura de validação"
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <label htmlFor="isActive" style={{ fontSize: '0.82rem', cursor: 'pointer' }}>Gateway Ativo</label>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.9rem', marginTop: '10px' }} 
                    disabled={loading}
                  >
                    {loading ? 'Adicionando...' : 'Adicionar Gateway'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        ) : (
          /* Transaction history tab */
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Registro de Transações
              </h3>
              <button 
                onClick={fetchPayments} 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                Atualizar Registro
              </button>
            </div>

            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                Nenhum pagamento registrado no momento. Configure um webhook para receber pagamentos e vê-los aqui.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Lead</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Gateway</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>ID Externo</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Método</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Valor</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr 
                        key={p.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.02)',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 8px' }}>
                          {p.contact ? (
                            <div>
                              <span style={{ display: 'block', fontWeight: 600, color: 'white' }}>
                                {p.contact.name || p.contact.profileName || 'Cliente'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {p.contact.clientPhone || p.contactId}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Lead Desconhecido</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <div>
                            <span style={{ display: 'block', fontWeight: 500 }}>{p.gateway?.name || 'N/A'}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{getProviderName(p.gateway?.type)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 8px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {p.externalId || 'N/A'}
                        </td>
                        <td style={{ padding: '14px 8px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}>
                          {p.paymentMethod}
                        </td>
                        <td style={{ padding: '14px 8px', fontWeight: 600, color: 'white' }}>
                          R$ {p.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td style={{ padding: '14px 8px' }}>
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              padding: '2px 8px', 
                              borderRadius: '10px', 
                              background: p.status === 'PAID' ? 'rgba(46, 213, 115, 0.1)' : (p.status === 'PENDING' ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255, 71, 87, 0.1)'), 
                              color: p.status === 'PAID' ? '#2ed573' : (p.status === 'PENDING' ? '#ffa500' : '#ff4757'),
                              border: `1px solid ${p.status === 'PAID' ? 'rgba(46, 213, 115, 0.2)' : (p.status === 'PENDING' ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 71, 87, 0.2)')}`
                            }}
                          >
                            {p.status === 'PAID' ? 'Aprovado' : (p.status === 'PENDING' ? 'Pendente' : 'Falhou')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {new Date(p.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
