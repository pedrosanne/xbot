'use client';

import { useState, useEffect } from 'react';

export default function PixelsPage() {
  // Config States
  const [globalPixelId, setGlobalPixelId] = useState('');
  const [globalPixelToken, setGlobalPixelToken] = useState('');
  const [globalPixelTestCode, setGlobalPixelTestCode] = useState('');
  const [publicBaseUrl, setPublicBaseUrl] = useState('');
  
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState('');

  // Stats States
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setGlobalPixelId(data.globalPixelId || '');
        setGlobalPixelToken(data.globalPixelToken || '');
        setGlobalPixelTestCode(data.globalPixelTestCode || '');
        setPublicBaseUrl(data.publicBaseUrl || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/pixels');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(false);
    setConfigError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalPixelId,
          globalPixelToken,
          globalPixelTestCode,
          publicBaseUrl
        })
      });

      if (res.ok) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
      } else {
        setConfigError('Erro ao salvar as configurações de rastreamento.');
      }
    } catch (err) {
      setConfigError('Erro de conexão ao salvar.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Calculate totals
  const totalLeads = stats.reduce((sum, s) => sum + s.leads, 0);
  const totalSales = stats.reduce((sum, s) => sum + s.salesCount, 0);
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
  const globalConvRate = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(2) : '0.00';

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Pixels &amp; UTMs Rastreamento</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Leads Rastreados</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{totalLeads}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-green)' }}>Capturados via link de rotação</span>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Vendas Rastreadas</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{totalSales}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-green)' }}>Confirmadas via gateways</span>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Faturamento Rastreado</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-green)' }}>Atribuído diretamente a campanhas</span>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taxa de Conversão Global</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{globalConvRate}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-green)' }}>Percentual de leads que compraram</span>
          </div>
        </div>

        <div className="integration-grid" style={{ alignItems: 'start', gap: '24px' }}>
          
          {/* Left: Pixel Configuration */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>⚙️ Configuração Meta Pixel &amp; CAPI</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Insira as credenciais do seu Pixel do Facebook para que o sistema envie automaticamente o evento de <strong>Purchase (Compra)</strong> 
              via API de Conversões (CAPI) toda vez que um pagamento PIX/Cartão for detectado.
            </p>

            {configSuccess && (
              <div style={{ padding: '10px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', fontWeight: 500 }}>
                ✓ Configurações salvas com sucesso!
              </div>
            )}
            
            {configError && (
              <div style={{ padding: '10px', background: 'rgba(255,92,92,0.08)', border: '1px solid rgba(255,92,92,0.2)', color: '#ff5c5c', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', fontWeight: 500 }}>
                {configError}
              </div>
            )}

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">ID do Meta Pixel</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: 123456789012345" 
                  value={globalPixelId} 
                  onChange={(e) => setGlobalPixelId(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Token de Acesso da API de Conversões (CAPI)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="EAABw..." 
                  value={globalPixelToken} 
                  onChange={(e) => setGlobalPixelToken(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Código de Teste de Eventos (Opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: TEST12345" 
                  value={globalPixelTestCode} 
                  onChange={(e) => setGlobalPixelTestCode(e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Use para testar o recebimento dos eventos em tempo real no Gerenciador de Eventos da Meta. Remova em produção.
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">URL Base Pública do Sistema</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://seu-painel.vercel.app" 
                  value={publicBaseUrl} 
                  onChange={(e) => setPublicBaseUrl(e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Necessário para o envio correto do parâmetro <code>event_source_url</code> da CAPI.
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ justifyContent: 'center', padding: '12px', fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}
                disabled={savingConfig}
              >
                {savingConfig ? 'Salvando...' : 'Salvar Configurações de Rastreamento'}
              </button>
            </form>
          </div>

          {/* Right: UTM Analytics Table */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>📊 Performance de Campanhas (UTMs)</h2>
              <button onClick={fetchStats} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                🔄 Atualizar
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: '1.5' }}>
              Abaixo estão listadas as campanhas e origens de anúncios identificadas através dos links de rotação de leads, 
              ordenadas por cliques/leads gerados.
            </p>

            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Analisando UTMs...</div>
            ) : stats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Nenhum lead com UTM rastreado ainda. Use os links de rotação para começar a capturar.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Origem (Source)</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Campanha (Campaign)</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Leads</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Vendas</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Faturamento</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((row, idx) => {
                      const convRate = row.leads > 0 ? ((row.salesCount / row.leads) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)', background: 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#60a5fa' }}>{row.source}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{row.campaign}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>{row.leads}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>{row.salesCount}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
                            R$ {row.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: row.salesCount > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                            {convRate}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
