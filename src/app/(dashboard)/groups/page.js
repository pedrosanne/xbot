'use client';

import { useState, useEffect } from 'react';
import { logToDb } from '@/lib/log';

export default function GroupsPage() {
  const [automations, setAutomations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('invite'); // invite, post, welcome
  const [event, setEvent] = useState('payment_approved'); // payment_approved, lead_created
  const [productId, setProductId] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [apiType, setApiType] = useState('official'); // official, evolution, zapi
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAutomations();
    fetchProducts();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch (err) {
      console.error('Error fetching automations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleEdit = (auto) => {
    setEditingId(auto.id);
    setName(auto.name);
    setType(auto.type);
    setEvent(auto.event);
    setProductId(auto.productId || '');
    setTarget(auto.target);
    setMessage(auto.message || '');
    setApiType(auto.apiType || 'official');
    setApiUrl(auto.apiUrl || '');
    setApiToken(auto.apiToken || '');
    setIsActive(auto.isActive);
  };

  const handleClear = () => {
    setEditingId(null);
    setName('');
    setType('invite');
    setEvent('payment_approved');
    setProductId('');
    setTarget('');
    setMessage('');
    setApiType('official');
    setApiUrl('');
    setApiToken('');
    setIsActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !target) {
      showStatus('error', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        type,
        event,
        target,
        message,
        productId: event === 'payment_approved' && productId ? productId : null,
        isActive,
        apiType,
        apiUrl: apiType !== 'official' ? apiUrl : '',
        apiToken: apiType !== 'official' ? apiToken : ''
      };

      const url = '/api/groups';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showStatus('success', editingId ? 'Automação atualizada com sucesso!' : 'Automação criada com sucesso!');
        handleClear();
        fetchAutomations();
      } else {
        const errData = await res.json();
        showStatus('error', errData.error || 'Erro ao salvar automação.');
      }
    } catch (err) {
      console.error('Error saving automation:', err);
      showStatus('error', 'Ocorreu um erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta automação?')) return;

    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showStatus('success', 'Automação excluída com sucesso!');
        fetchAutomations();
      } else {
        showStatus('error', 'Erro ao excluir automação.');
      }
    } catch (err) {
      console.error('Error deleting automation:', err);
      showStatus('error', 'Erro na requisição de exclusão.');
    }
  };

  const toggleActiveStatus = async (auto) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: auto.id, isActive: !auto.isActive })
      });
      if (res.ok) {
        fetchAutomations();
      }
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            👥 Automação de Grupos & Canais
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Gerencie o envio automático de convites ou posts em grupos e canais com base em eventos.
          </p>
        </div>
      </div>

      {statusMsg.text && (
        <div className={`status-alert ${statusMsg.type}`} style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 500,
          background: statusMsg.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
          color: statusMsg.type === 'success' ? '#2ed573' : '#ff4757',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
          transition: 'all 0.3s ease'
        }}>
          {statusMsg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Form Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {editingId ? '✏️ Editar Automação' : '➕ Nova Automação de Grupo/Canal'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Nome da Automação *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Entrega Grupo VIP Alunos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Tipo de Ação *</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="invite">📨 Enviar link de convite ao cliente (Oficial)</option>
                  <option value="post">📢 Postar mensagem no grupo/canal (Unofficial API)</option>
                  <option value="welcome">👋 Mensagem de Boas-Vindas no grupo (Unofficial API)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Gatilho (Evento) *</label>
                <select className="form-select" value={event} onChange={(e) => setEvent(e.target.value)}>
                  <option value="payment_approved">💰 Venda Aprovada (Pedido Pago)</option>
                  <option value="lead_created">👤 Novo Lead Cadastrado (Primeira Interação)</option>
                </select>
              </div>

              {event === 'payment_approved' ? (
                <div>
                  <label className="form-label">Produto Associado</label>
                  <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)}>
                    <option value="">Qualquer Produto</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  <label className="form-label">Produto Associado</label>
                  <select className="form-select" disabled value="">
                    <option value="">Não Aplicável</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-glass)', paddingBlob: '8px', paddingTop: '16px', marginTop: '4px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                🔗 Integração do WhatsApp (Instância e API de Envio)
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Tipo de API *</label>
                  <select className="form-select" value={apiType} onChange={(e) => setApiType(e.target.value)}>
                    <option value="official">Oficial (WhatsApp Cloud API)</option>
                    <option value="evolution">Evolution API (Unofficial)</option>
                    <option value="zapi">Z-API (Unofficial)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    {apiType === 'official' ? 'Link do Convite do Grupo/Canal *' : 'ID do Grupo/Canal (JID) *'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={apiType === 'official' ? 'https://chat.whatsapp.com/L12345...' : 'Ex: 120363024848@g.us'}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    required
                  />
                </div>
              </div>

              {apiType !== 'official' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                  <div>
                    <label className="form-label">URL da Instância API *</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Ex: https://api.suainstancia.com"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      required={apiType !== 'official'}
                    />
                  </div>
                  <div>
                    <label className="form-label">Token da API *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Instance Token / API Key"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      required={apiType !== 'official'}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Mensagem para Envio</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={type === 'invite' ? 'Olá! Aqui está o seu link para entrar no grupo VIP: {link}' : 'Olá {nome}, seja bem-vindo ao grupo!'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Variáveis disponíveis: <strong>{'{nome}'}</strong>, <strong>{'{whatsapp}'}</strong>, <strong>{'{email}'}</strong> e <strong>{'{link}'}</strong> (substitui pelo link de convite).
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={saving}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Automação'}
              </button>
            </div>
          </form>
        </div>

        {/* List Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
            📋 Automações Ativas
          </h2>
          
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Carregando automações...</p>
          ) : automations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Nenhuma automação de grupo configurada ainda.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="crm-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Nome</th>
                    <th style={{ padding: '10px' }}>Tipo</th>
                    <th style={{ padding: '10px' }}>Gatilho</th>
                    <th style={{ padding: '10px' }}>API</th>
                    <th style={{ padding: '10px' }}>Alvo</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {automations.map(auto => (
                    <tr key={auto.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{auto.name}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: auto.type === 'invite' ? 'rgba(59, 130, 246, 0.15)' : auto.type === 'post' ? 'rgba(235, 94, 40, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: auto.type === 'invite' ? '#60a5fa' : auto.type === 'post' ? '#f59e0b' : '#c084fc',
                          fontWeight: 500
                        }}>
                          {auto.type === 'invite' ? 'Convite' : auto.type === 'post' ? 'Postagem' : 'Boas-Vindas'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                        {auto.event === 'payment_approved' ? '💰 Venda Aprovada' : '👤 Novo Lead'}
                        {auto.productId && (
                          <div style={{ fontSize: '0.7rem', color: '#2ed573' }}>
                            ({products.find(p => p.id === auto.productId)?.name || 'Produto ID: ' + auto.productId})
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                        {auto.apiType}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {auto.target}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            className="status-toggle-checkbox"
                            style={{ cursor: 'pointer' }}
                            checked={auto.isActive}
                            onChange={() => toggleActiveStatus(auto)}
                          />
                          <span style={{ fontSize: '0.75rem', color: auto.isActive ? '#2ed573' : 'var(--text-muted)' }}>
                            {auto.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleEdit(auto)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.2)' }}
                            onClick={() => handleDelete(auto.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
