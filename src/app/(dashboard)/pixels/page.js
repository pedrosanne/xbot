'use client';

import { useState, useEffect } from 'react';

export default function PixelsPage() {
  // Config States
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
          publicBaseUrl
        })
      });

      if (res.ok) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
      } else {
        setConfigError('Erro ao salvar as configurações do sistema.');
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

  const cleanUrl = publicBaseUrl ? publicBaseUrl.replace(/\/$/, '') : 'https://seu-painel.com';

  const trackingScriptCode = `<!-- XBot UTM & CAPI Tracking Script -->
<script>
(function() {
  // 1. Captura parâmetros UTM da URL
  const urlParams = new URLSearchParams(window.location.search);
  const utms = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function(param) {
    if (urlParams.has(param)) utms[param] = urlParams.get(param);
  });

  // 2. Captura cookies do Facebook para atribuição CAPI
  const getCookie = function(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  };
  const fbp = getCookie('_fbp');
  const fbc = getCookie('_fbc') || urlParams.get('fbclid');

  // 3. Modifica todos os links de WhatsApp para passarem pelo rastreamento
  window.addEventListener('DOMContentLoaded', function() {
    const redirectorBase = "${cleanUrl}/api/redirect/whatsapp";
    const links = document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    
    links.forEach(function(link) {
      try {
        const newUrl = new URL(redirectorBase);
        
        // Copia UTMs
        Object.keys(utms).forEach(function(key) {
          newUrl.searchParams.set(key, utms[key]);
        });
        
        // Copia cookies de clique
        if (fbp) newUrl.searchParams.set('fbp', fbp);
        if (fbc) {
          const cleanFbc = fbc.startsWith('fb.1.') ? fbc : "fb.1." + Date.now() + "." + fbc;
          newUrl.searchParams.set('fbc', cleanFbc);
        }
        
        // Mantém a mensagem original do botão (se houver)
        let text = "";
        try {
          const oldUrl = new URL(link.href);
          text = oldUrl.searchParams.get('text') || "";
        } catch(urlErr) {
          // Fallback if href is not a full URL
          const match = link.href.match(/[?&]text=([^&#]*)/);
          if (match) text = decodeURIComponent(match[1]);
        }
        
        if (text) newUrl.searchParams.set('text', text);

        link.href = newUrl.toString();
      } catch(e) {
        console.error("Erro ao rastrear link do WhatsApp:", e);
      }
    });
  });
})();
</script>`;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Métricas de UTM &amp; Rastreamento</h1>
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '12px' }}>⚙️ Configuração Geral de Rastreamento</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px', lineHeight: '1.5' }}>
              Defina as configurações globais de domínio do seu painel. Note que os <strong>pixels de rastreamento</strong> 
              devem ser configurados individualmente dentro de cada <strong>Produto</strong> (na aba Pixels).
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
                <label className="form-label">URL Base Pública do Sistema</label>
                <input 
                  type="url" 
                  required
                  className="form-input" 
                  placeholder="https://seu-painel.vercel.app" 
                  value={publicBaseUrl} 
                  onChange={(e) => setPublicBaseUrl(e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Necessário para o envio correto do parâmetro <code>event_source_url</code> da API de Conversões (CAPI) e links de redirecionamento.
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ justifyContent: 'center', padding: '12px', fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}
                disabled={savingConfig}
              >
                {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
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

        {/* External Site Integration */}
        <div className="glass-panel" style={{ padding: '24px', marginTop: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔌 Integração com Páginas de Venda Externas (WordPress, Elementor, etc.)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Como você utiliza páginas de vendas externas, as UTMs e os cookies do Facebook (<code style={{ color: 'var(--neon-green)' }}>_fbp</code> e <code style={{ color: 'var(--neon-green)' }}>_fbc</code>) ficam salvos no navegador do cliente enquanto ele navega no seu site. 
            Para passar esses dados para o WhatsApp do atendente de forma automática, copie e cole o script abaixo dentro da tag <code style={{ color: 'var(--neon-green)' }}>&lt;head&gt;</code> do seu site:
          </p>

          <div style={{ position: 'relative', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', overflow: 'hidden' }}>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(trackingScriptCode);
                alert('Script de rastreamento copiado para a área de transferência!');
              }} 
              className="btn btn-secondary" 
              style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}
            >
              📋 Copiar Script
            </button>
            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#a7f3d0', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '280px' }}>
              {trackingScriptCode}
            </pre>
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#60a5fa' }}>💡 O que este script faz automaticamente:</h4>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Captura todas as UTMs do anúncio da barra de endereço do seu site.</li>
                <li>Lê os cookies do Facebook do navegador do lead.</li>
                <li>Intercepta todos os botões de WhatsApp do seu site (links que apontam para <code>wa.me</code> ou <code>whatsapp.com</code>) e os redireciona através do nosso distribuidor inteligente de leads.</li>
                <li>Garante 100% de precisão no rastreamento e atribuição CAPI.</li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#60a5fa' }}>🛠️ Como instalar no WordPress / Elementor:</h4>
              <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>No painel do WordPress, vá em <strong>Elementor &gt; Custom Code</strong> (ou use um plugin de Header/Footer).</li>
                <li>Clique em <strong>Add New Code</strong>.</li>
                <li>Cole o script acima, defina a localização como <strong>&lt;head&gt;</strong> e salve em todo o site.</li>
                <li>Pronto! Todos os seus botões de WhatsApp externos agora estão rastreados pelo XBot.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
