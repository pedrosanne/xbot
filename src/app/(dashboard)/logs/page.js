'use client';

import { useState, useEffect } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState('ALL'); // 'ALL', 'INFO', 'WARN', 'ERROR'
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL', 'WEBHOOK', 'FLOW', 'API', 'DATABASE', 'AI', 'SYSTEM'
  const [expandedLogId, setExpandedLogId] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLogs();
    });
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Deseja realmente limpar todos os logs do banco de dados? Isso não pode ser desfeito.')) return;
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  // Filter logs based on selection
  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === 'ALL' || log.level === filterLevel;
    const categoryMatch = filterCategory === 'ALL' || log.category === filterCategory;
    return levelMatch && categoryMatch;
  });

  const getLevelBadgeClass = (level) => {
    if (level === 'ERROR') return 'badge-error';
    if (level === 'WARN') return 'badge-warning';
    return 'badge-success';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'WEBHOOK': '#3b82f6', // blue
      'FLOW': '#8b5cf6',    // purple
      'API': '#10b981',     // green
      'DATABASE': '#ec4899',// pink
      'AI': '#f59e0b',       // amber
      'SYSTEM': '#6b7280'   // grey
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Logs do Sistema</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchLogs} className="btn btn-secondary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <span className="spinner-mini" />
            ) : (
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
            )}
            Atualizar
          </button>
          <button onClick={handleClearLogs} className="btn btn-danger">
            Limpar Logs
          </button>
        </div>
      </header>

      <div className="page-body animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Registrado</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{logs.length}</span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-error)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Erros Críticos</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-error)' }}>
              {logs.filter(l => l.level === 'ERROR').length}
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-warning)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alertas</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning)' }}>
              {logs.filter(l => l.level === 'WARN').length}
            </span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--color-success)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Informativos</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {logs.filter(l => l.level === 'INFO').length}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Filtrar Nível:</span>
            <select className="form-select" style={{ width: '130px', padding: '6px 12px', margin: 0, fontSize: '0.85rem' }} value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="ALL">Todos</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Categoria:</span>
            <select className="form-select" style={{ width: '150px', padding: '6px 12px', margin: 0, fontSize: '0.85rem' }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="WEBHOOK">WEBHOOK</option>
              <option value="FLOW">FLOW</option>
              <option value="API">API</option>
              <option value="DATABASE">DATABASE</option>
              <option value="AI">AI</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Exibindo {filteredLogs.length} de {logs.length} logs
          </span>
        </div>

        {/* Logs Listing */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Nenhum registro de log encontrado para os filtros selecionados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasDetails = !!log.details;
                return (
                  <div
                    key={log.id}
                    className="log-row-container"
                    style={{
                      background: log.level === 'ERROR' ? 'rgba(239, 68, 68, 0.02)' : log.level === 'WARN' ? 'rgba(245, 158, 11, 0.01)' : 'transparent'
                    }}
                  >
                    {/* Log Row Main */}
                    <div className="log-row-main">
                      <span className={`badge ${getLevelBadgeClass(log.level)}`} style={{ minWidth: '70px', justifyContent: 'center' }}>
                        {log.level}
                      </span>
                      
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${getCategoryColor(log.category)}`,
                        color: getCategoryColor(log.category)
                      }}>
                        {log.category}
                      </span>

                      <span style={{ fontSize: '0.9rem', fontWeight: 600, flexGrow: 1, color: log.level === 'ERROR' ? 'var(--color-error)' : 'var(--text-primary)' }}>
                        {log.message}
                      </span>

                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>

                      {hasDetails && (
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}
                        >
                          {isExpanded ? 'Esconder Detalhes' : 'Ver Detalhes'}
                        </button>
                      )}
                    </div>

                    {/* Expanded JSON Details */}
                    {isExpanded && hasDetails && (
                      <div className="animate-fade-in" style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        padding: '14px',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: 'var(--text-primary)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '400px'
                      }}>
                        {log.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      
      <style jsx global>{`
        .spinner-mini {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top: 2px solid var(--text-primary);
          borderRadius: 50%;
          animation: spin-mini 1s linear infinite;
          display: inline-block;
        }
        @keyframes spin-mini {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
