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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'pix'

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const [usageRes, settingsRes] = await Promise.all([
        fetch('/api/ai-usage?period=30'),
        fetch('/api/settings')
      ]);

      if (usageRes.ok && settingsRes.ok) {
        const usageJson = await usageRes.json();
        const settingsJson = await settingsRes.json();
        setData(usageJson);
        setSettings(settingsJson);
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
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af' }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af' }
      }
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
          tension: 0.4,
          yAxisID: 'y'
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

  return (
    <div className="fade-in">
      <div className="header-actions">
        <div>
          <h1 className="text-gradient">Consumo de IA</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Acompanhe o uso e configure os modelos de Inteligência Artificial do sistema.
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
            padding: '12px 24px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'general' ? '#8b5cf6' : 'var(--text-muted)',
            borderBottom: activeTab === 'general' ? '2px solid #8b5cf6' : '2px solid transparent',
            fontWeight: activeTab === 'general' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('pix')}
          style={{ 
            padding: '12px 24px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'pix' ? '#10b981' : 'var(--text-muted)',
            borderBottom: activeTab === 'pix' ? '2px solid #10b981' : '2px solid transparent',
            fontWeight: activeTab === 'pix' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Extrator de PIX
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', marginBottom: '24px' }}>
          {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ color: 'var(--text-muted)' }}>Carregando métricas de IA...</span>
        </div>
      ) : data && settings ? (
        <>
          {activeTab === 'general' && (
            <div className="fade-in">
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Custo Total Estimado (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
                    ${data.summary.totalCost.toFixed(3)}
                  </div>
                </div>
                
                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #8b5cf6' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Tokens Gemini (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                    {data.summary.geminiTokens.toLocaleString()}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
                  <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>Caracteres ElevenLabs (30d)</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                    {data.summary.elevenLabsChars.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Evolução de Tokens (Gemini)</h3>
                  <div style={{ height: '300px' }}>
                    {data.chartData.length > 0 ? (
                      <Line data={getChartData()} options={chartOptions} />
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sem dados</div>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Custo Estimado (Diário)</h3>
                  <div style={{ height: '300px' }}>
                    {data.chartData.length > 0 ? (
                      <Bar data={getCostChartData()} options={chartOptions} />
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sem dados</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Logs Table */}
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
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Uso (Tokens/Chars)</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Custo Est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentLogs.map((log) => (
                          <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '12px 16px' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.8rem',
                                background: log.provider === 'GEMINI' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: log.provider === 'GEMINI' ? '#a78bfa' : '#fcd34d'
                              }}>
                                {log.provider}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.model}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.action}</td>
                            <td style={{ padding: '12px 16px', fontWeight: '500' }}>{log.tokens.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', color: '#10b981' }}>${log.cost.toFixed(4)}</td>
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
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#10b981' }}>Configuração do Extrator de PIX</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Personalize as instruções e o modelo que o sistema usa para ler comprovantes na Aprovação Rápida.
                  </p>
                  
                  <form onSubmit={handleSaveSettings}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Modelo do Google Gemini</label>
                      <select 
                        className="form-control"
                        value={settings.geminiPixModel || 'gemini-2.5-flash'}
                        onChange={(e) => setSettings({...settings, geminiPixModel: e.target.value})}
                        style={{ width: '100%' }}
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado, Rápido)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Preciso, mais caro)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legado)</option>
                      </select>
                      <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Define a inteligência utilizada para a extração do valor.
                      </small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Prompt de Extração (Comando)</label>
                      <textarea 
                        className="form-control"
                        rows="8"
                        value={settings.geminiPixPrompt}
                        onChange={(e) => setSettings({...settings, geminiPixPrompt: e.target.value})}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                      <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Instruções textuais para a IA. Use a variável <code>{'{texto}'}</code> onde o texto do cliente ou OCR do comprovante será inserido.
                      </small>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Salvando...' : 'Salvar Configurações da IA'}
                    </button>
                  </form>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Estatísticas da Leitura de PIX</h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tokens (Recentes)</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{pixTokensTotal.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Custo (Recentes)</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10b981' }}>${pixCostTotal.toFixed(4)}</div>
                    </div>
                    <div style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Análises (Recentes)</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{pixLogs.length}</div>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Últimas Leituras de PIX</h4>
                  {pixLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma leitura de comprovante recente.</div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                      {pixLogs.map((log) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                            <div style={{ fontSize: '0.9rem', color: '#a78bfa' }}>{log.model}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{log.tokens} tokens</div>
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
        </>
      ) : null}
    </div>
  );
}
