'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AiUsagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [providers, setProviders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'pix', 'keys'
  
  // New Provider State
  const [newProvider, setNewProvider] = useState({ name: '', apiKey: '', model: 'gemini-2.5-flash', provider: 'GEMINI' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [usageRes, settingsRes, provRes] = await Promise.all([
        fetch('/api/ai-usage?period=30'),
        fetch('/api/settings'),
        fetch('/api/ai-providers')
      ]);

      if (usageRes.ok && settingsRes.ok && provRes.ok) {
        const usageJson = await usageRes.json();
        const settingsJson = await settingsRes.json();
        const provJson = await provRes.json();
        setData(usageJson);
        setSettings(settingsJson);
        setProviders(provJson);
      } else {
        setErrorMsg('Erro ao carregar dados do servidor.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiPixPrompt: settings.geminiPixPrompt,
          geminiPixModel: settings.geminiPixModel
        })
      });

      if (res.ok) {
        setSuccessMsg('Configurações salvas com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Falha ao salvar as configurações.');
      }
    } catch (error) {
      setErrorMsg('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddProvider(e) {
    e.preventDefault();
    if (!newProvider.name || !newProvider.apiKey) return;
    try {
      const res = await fetch('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider)
      });
      if (res.ok) {
        setNewProvider({ name: '', apiKey: '', model: 'gemini-2.5-flash', provider: 'GEMINI' });
        fetchData();
        setSuccessMsg('Chave cadastrada com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Erro ao cadastrar chave.');
    }
  }

  async function toggleProvider(id, currentStatus) {
    try {
      await fetch(`/api/ai-providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchData();
    } catch (err) {}
  }

  async function deleteProvider(id) {
    if(!confirm('Tem certeza que deseja remover esta conta do rodízio?')) return;
    try {
      await fetch(`/api/ai-providers/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {}
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
      tooltip: {
        backgroundColor: 'rgba(12, 12, 12, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
    }
  };

  const getChartData = () => {
    if (!data?.chartData) return null;
    const labels = data.chartData.map(d => d.date.split('-').reverse().slice(0, 2).join('/'));
    return {
      labels,
      datasets: [
        {
          label: 'Tokens Gemini',
          data: data.chartData.map(d => d.tokens),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getCostChartData = () => {
    if (!data?.chartData) return null;
    const labels = data.chartData.map(d => d.date.split('-').reverse().slice(0, 2).join('/'));
    return {
      labels,
      datasets: [
        {
          label: 'Custo Estimado (USD)',
          data: data.chartData.map(d => d.cost),
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    };
  };

  const getPixLogs = () => {
    if (!data?.recentLogs) return [];
    return data.recentLogs.filter(l => l.action === 'extractAmount');
  };

  const pixLogs = getPixLogs();
  const pixTokensTotal = pixLogs.reduce((acc, l) => acc + l.tokens, 0);
  const pixCostTotal = pixLogs.reduce((acc, l) => acc + l.cost, 0);
  
  const successfulPix = pixLogs.filter(l => l.status === 'SUCCESS').length;
  const failedPix = pixLogs.filter(l => l.status === 'FAILED').length;
  const successRate = pixLogs.length > 0 ? ((successfulPix / pixLogs.length) * 100).toFixed(1) : 0;
  const avgDuration = pixLogs.length > 0 ? (pixLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / pixLogs.length).toFixed(0) : 0;

  return (
    <div className="fade-in">
      <div className="header-actions">
        <div>
          <h1 className="text-gradient">Consumo de IA</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Acompanhe o uso, configure modelos e gerencie a contingência de APIs.
          </p>
        </div>
        <button onClick={fetchData} className="btn btn-secondary">
          Atualizar Dados
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('general')}
          style={{ 
            padding: '12px 24px', background: 'none', border: 'none', 
            color: activeTab === 'general' ? '#8b5cf6' : 'var(--text-muted)',
            borderBottom: activeTab === 'general' ? '2px solid #8b5cf6' : '2px solid transparent',
            fontWeight: activeTab === 'general' ? 600 : 400, cursor: 'pointer', fontSize: '1rem'
          }}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('pix')}
          style={{ 
            padding: '12px 24px', background: 'none', border: 'none', 
            color: activeTab === 'pix' ? '#10b981' : 'var(--text-muted)',
            borderBottom: activeTab === 'pix' ? '2px solid #10b981' : '2px solid transparent',
            fontWeight: activeTab === 'pix' ? 600 : 400, cursor: 'pointer', fontSize: '1rem'
          }}
        >
          Extrator de PIX
        </button>
        <button 
          onClick={() => setActiveTab('keys')}
          style={{ 
            padding: '12px 24px', background: 'none', border: 'none', 
            color: activeTab === 'keys' ? '#f59e0b' : 'var(--text-muted)',
            borderBottom: activeTab === 'keys' ? '2px solid #f59e0b' : '2px solid transparent',
            fontWeight: activeTab === 'keys' ? 600 : 400, cursor: 'pointer', fontSize: '1rem'
          }}
        >
          Pool & Contingência
        </button>
      </div>

      {errorMsg && <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>{errorMsg}</div>}
      {successMsg && <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', marginBottom: '24px' }}>{successMsg}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ color: 'var(--text-muted)' }}>Carregando métricas de IA...</span>
        </div>
      ) : data && settings ? (
        <>
          {activeTab === 'general' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Custo Total Estimado (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>${data.summary.totalCost.toFixed(3)}</div>
                </div>
                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Tokens Gemini (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.summary.geminiTokens.toLocaleString()}</div>
                </div>
                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Caracteres ElevenLabs (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.summary.elevenLabsChars.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Evolução de Tokens (Gemini)</h3>
                  <div style={{ height: '300px' }}>
                    {data.chartData.length > 0 ? <Line data={getChartData()} options={chartOptions} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sem dados</div>}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Custo Estimado (Diário)</h3>
                  <div style={{ height: '300px' }}>
                    {data.chartData.length > 0 ? <Bar data={getCostChartData()} options={chartOptions} /> : <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sem dados</div>}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Histórico Recente de Uso Global</h3>
                {data.recentLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Nenhum registro recente encontrado.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Data/Hora</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Provedor</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Modelo</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Ação</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Latência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentLogs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '12px 16px' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px' }}>
                              {p.provider === 'OPENAI' ? (
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>{p.provider}</span>
                              ) : p.provider === 'DEEPSEEK' ? (
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>{p.provider}</span>
                              ) : (
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{p.provider || 'GEMINI'}</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.model}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.action}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444' }}>{log.status || 'SUCCESS'}</span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.durationMs || 0}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pix' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#10b981' }}>Configuração da Extração</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Personalize o comportamento e o modelo (quando o Pool estiver vazio) da leitura do PIX.
                  </p>
                  <form onSubmit={handleSaveSettings}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Modelo Base (Fallback)</label>
                      <select 
                        className="form-control"
                        value={settings.geminiPixModel || 'gemini-2.5-flash'}
                        onChange={(e) => setSettings({...settings, geminiPixModel: e.target.value})}
                        style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado, Rápido)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Preciso, mais caro)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Prompt de Extração</label>
                      <textarea 
                        className="form-control"
                        rows="8"
                        value={settings.geminiPixPrompt}
                        onChange={(e) => setSettings({...settings, geminiPixPrompt: e.target.value})}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Prompt'}</button>
                  </form>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Desempenho da Inteligência</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Taxa de Acerto</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981' }}>{successRate}%</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tempo Médio de Leitura</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{avgDuration}ms</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Falhas de Contingência</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444' }}>{failedPix}</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Processado</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{pixLogs.length}</div>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Últimas Validações</h4>
                  {pixLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma leitura recente.</div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                      {pixLogs.map((log) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString('pt-BR')} - <span style={{ color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444' }}>{log.status}</span></div>
                            <div style={{ fontSize: '0.9rem', color: '#a78bfa' }}>{log.model} {log.error ? `- ${log.error}` : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{log.durationMs}ms</div>
                            <div style={{ fontSize: '0.85rem', color: '#10b981' }}>${log.cost.toFixed(5)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* Cadastrar Nova Chave */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#f59e0b' }}>Nova Conta (Node)</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Adicione chaves de outras contas do Google AI Studio para revezamento (Load Balancing).
                  </p>
                  <form onSubmit={handleAddProvider}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Identificação (ex: Conta Marketing)</label>
                      <input 
                        type="text" className="form-control" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                        value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>API Key</label>
                      <input 
                        type="password" className="form-control" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                        value={newProvider.apiKey} onChange={e => setNewProvider({...newProvider, apiKey: e.target.value})} required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Provedor</label>
                      <select 
                        className="form-control" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                        value={newProvider.provider} onChange={e => {
                          const provider = e.target.value;
                          let defaultModel = 'gemini-2.5-flash';
                          if (provider === 'OPENAI') defaultModel = 'gpt-4o-mini';
                          if (provider === 'DEEPSEEK') defaultModel = 'deepseek-chat';
                          setNewProvider({...newProvider, provider, model: defaultModel});
                        }}
                      >
                        <option value="GEMINI">Google AI Studio (Gemini)</option>
                        <option value="OPENAI">OpenAI (ChatGPT)</option>
                        <option value="DEEPSEEK">DeepSeek</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Modelo Preferido</label>
                      <select 
                        className="form-control" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                        value={newProvider.model} onChange={e => setNewProvider({...newProvider, model: e.target.value})}
                      >
                        {newProvider.provider === 'GEMINI' && (
                          <>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          </>
                        )}
                        {newProvider.provider === 'OPENAI' && (
                          <>
                            <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          </>
                        )}
                        {newProvider.provider === 'DEEPSEEK' && (
                          <>
                            <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                            <option value="deepseek-reasoner">DeepSeek Reasoner (R1)</option>
                          </>
                        )}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#f59e0b' }}>Adicionar ao Pool</button>
                  </form>
                </div>

                {/* Pool de Contingência */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Pool de Contingência (Rodízio)</h3>
                  {providers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Você ainda não cadastrou provedores de IA.<br/> O sistema está usando a chave global de fallback.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Empresa</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Conta/Node</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Modelo</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Requisições</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Erros/Fails</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                            <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providers.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '12px 16px' }}>
                                {p.provider === 'OPENAI' ? (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>{p.provider}</span>
                                ) : p.provider === 'DEEPSEEK' ? (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>{p.provider}</span>
                                ) : (
                                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>{p.provider || 'GEMINI'}</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: '500' }}>{p.name}</td>
                              <td style={{ padding: '12px 16px', color: '#8b5cf6' }}>{p.model}</td>
                              <td style={{ padding: '12px 16px' }}>{p.usageCount}</td>
                              <td style={{ padding: '12px 16px', color: p.errorCount > 0 ? '#ef4444' : 'inherit' }}>{p.errorCount}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <button 
                                  onClick={() => toggleProvider(p.id, p.isActive)}
                                  style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', background: p.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: p.isActive ? '#10b981' : '#ef4444' }}
                                >
                                  {p.isActive ? 'Em Operação' : 'Pausado'}
                                </button>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <button onClick={() => deleteProvider(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>Remover</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '4px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#f59e0b', marginBottom: '8px' }}>Como a contingência funciona?</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      O sistema fará o rotacionamento de todas as chaves ativas do Pool acima (Round-Robin). Se uma chave exceder o limite de créditos do provedor, o sistema passará automaticamente para a próxima chave, garantindo 100% de tempo de atividade (Uptime) para os seus clientes na aprovação de PIX.
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance e Analytics por Provedor */}
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#10b981' }}>Performance & Custo por Node</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                  Análise detalhada do desempenho e durabilidade de cada chave configurada no seu Pool.
                </p>

                {providers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>Sem dados para exibir.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {providers.map(p => {
                      const totalRequests = p.usageCount + p.errorCount;
                      const successRate = totalRequests > 0 ? ((p.usageCount / totalRequests) * 100).toFixed(1) : 0;
                      
                      return (
                        <div key={'metrics-'+p.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span style={{ fontWeight: '600', fontSize: '1.05rem' }}>{p.name}</span>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '4px 8px', borderRadius: '4px' }}>
                              {p.provider || 'GEMINI'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Taxa de Sucesso</span>
                              <span style={{ color: successRate > 80 ? '#10b981' : (successRate > 50 ? '#f59e0b' : '#ef4444'), fontWeight: '600', fontSize: '0.9rem' }}>
                                {successRate}%
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tokens Processados</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>
                                {p.metrics?.totalTokens?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Custo Acumulado</span>
                              <span style={{ color: '#10b981', fontWeight: '500', fontSize: '0.9rem' }}>
                                ${(p.metrics?.totalCost || 0).toFixed(5)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Latência Média</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>
                                {p.metrics?.avgDuration || 0}ms
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
