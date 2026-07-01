'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsageData();
  }, []);

  async function fetchUsageData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai-usage?period=30');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Erro ao carregar dados.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
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

  return (
    <div className="fade-in">
      <div className="header-actions">
        <div>
          <h1 className="text-gradient">Consumo de IA</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Acompanhe o uso de Tokens (Gemini) e Caracteres (ElevenLabs).
          </p>
        </div>
        <button onClick={fetchUsageData} className="btn btn-secondary">
          Atualizar Dados
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ color: 'var(--text-muted)' }}>Carregando métricas de IA...</span>
        </div>
      ) : data ? (
        <>
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
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Histórico Recente de Uso</h3>
            
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
        </>
      ) : null}
    </div>
  );
}
