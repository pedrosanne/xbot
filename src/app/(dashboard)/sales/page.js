'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    approvedCount: 0,
    pendingCount: 0,
    refundedCount: 0,
    cancelledCount: 0,
    totalCount: 0,
    averageTicket: 0
  });
  
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  // Modals
  const [editingSale, setEditingSale] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [page, statusFilter]);

  async function fetchSales(resetPage = false) {
    if (resetPage) setPage(1);
    setFetching(true);
    setStatusMsg({ type: '', text: '' });
    
    try {
      const p = resetPage ? 1 : page;
      const res = await fetch(`/api/sales?page=${p}&limit=50&status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) setPagination(data.pagination);
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao carregar vendas.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setFetching(false);
    }
  }

  const openEditModal = (sale) => {
    setEditingSale({ ...sale });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingSale(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    if (!editingSale) return;

    setStatusMsg({ type: '', text: '' });
    
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editingSale.status,
          amount: parseFloat(editingSale.amount),
          paymentMethod: editingSale.paymentMethod,
          externalId: editingSale.externalId
        })
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Venda atualizada com sucesso!' });
        closeEditModal();
        fetchSales(); // Refresh
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao atualizar a venda.');
    }
  };

  const handleDeleteSale = async (id) => {
    if (!confirm('ATENÇÃO: Deseja realmente excluir esta venda do banco de dados? Isso afetará as métricas irreversivelmente.')) return;
    
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Venda excluída com sucesso!' });
        fetchSales();
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir a venda.');
    }
  };

  // Helper for formatting BRL currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Helper for date formatting
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Badge coloring for statuses
  const getStatusBadge = (status) => {
    const st = (status || '').toUpperCase();
    if (st === 'PAID' || st === 'APPROVED' || st === 'COMPLETED') return <span className="badge badge-success">Aprovado</span>;
    if (st === 'PENDING' || st === 'PROCESSING') return <span className="badge badge-warning">Pendente</span>;
    if (st === 'REFUNDED') return <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' }}>Reembolsado</span>;
    if (st === 'CANCELLED' || st === 'FAILED' || st === 'CANCELED') return <span className="badge badge-error">Cancelado</span>;
    return <span className="badge">{status}</span>;
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Vendas & Transações</h1>
          <p className="page-description">Acompanhe métricas, gerencie status e visualize todas as transações do sistema.</p>
        </div>
      </header>

      {statusMsg.text && (
        <div 
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            fontWeight: '500',
            background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            color: statusMsg.type === 'error' ? '#f87171' : '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusMsg.type === 'error' ? '❌' : '✅'} {statusMsg.text}
        </div>
      )}

      {/* Financial Metrics */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Receita Total (Aprovada)</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(metrics.totalRevenue)}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metrics.approvedCount} vendas confirmadas</span>
        </div>
        <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Vendas Pendentes</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24' }}>{metrics.pendingCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aguardando pagamento</span>
        </div>
        <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ticket Médio</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(metrics.averageTicket)}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Por venda aprovada</span>
        </div>
        <div className="glass-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Estornos / Cancelados</span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#f87171' }}>{metrics.refundedCount + metrics.cancelledCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metrics.refundedCount} reembolsos, {metrics.cancelledCount} cancelamentos</span>
        </div>
      </div>

      {/* Filters and List */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' }}>
          <div style={{ flexGrow: 1, minWidth: '250px' }}>
            <label className="form-label">Buscar Transação</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por ID, descrição, nome ou telefone do cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSales(true)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="ALL">Todos os Status</option>
              <option value="PAID">Aprovado (PAID)</option>
              <option value="PENDING">Pendente</option>
              <option value="REFUNDED">Reembolsado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => fetchSales(true)}>
            🔍 Pesquisar
          </button>
        </div>

        {fetching ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando transações...</div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            Nenhuma transação encontrada com os filtros selecionados.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Produto / Descrição</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>ID Externo</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id}>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(sale.createdAt)}</td>
                      <td>
                        {sale.contact ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{sale.contact.name || 'Desconhecido'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.contact.phone || '-'}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{sale.product ? sale.product.name : 'Venda Avulsa'}</span>
                          {sale.description && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.description}</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(sale.amount)}</td>
                      <td>{getStatusBadge(sale.status)}</td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {sale.externalId || sale.id.substring(0, 8) + '...'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', margin: 0 }}
                            onClick={() => openEditModal(sale)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', margin: 0, color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}
                            onClick={() => handleDeleteSale(sale.id)}
                            title="Apagar do banco de dados"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Mostrando página {pagination.page} de {pagination.totalPages} ({pagination.total} total)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button 
                    className="btn btn-secondary"
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingSale && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '16px' }}>Editar Venda</h3>
            
            <form onSubmit={handleUpdateSale}>
              <div className="form-group">
                <label className="form-label">ID da Venda (Interno)</label>
                <input type="text" className="form-input" value={editingSale.id} disabled style={{ opacity: 0.5 }} />
              </div>
              
              <div className="form-group">
                <label className="form-label">ID Externo (Gateway)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingSale.externalId || ''} 
                  onChange={(e) => setEditingSale({...editingSale, externalId: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  value={editingSale.amount} 
                  onChange={(e) => setEditingSale({...editingSale, amount: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pagamento</label>
                <select 
                  className="form-select"
                  value={editingSale.paymentMethod || 'pix'}
                  onChange={(e) => setEditingSale({...editingSale, paymentMethod: e.target.value})}
                >
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="boleto">Boleto</option>
                  <option value="free">Gratuito</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status da Transação</label>
                <select 
                  className="form-select"
                  value={editingSale.status}
                  onChange={(e) => setEditingSale({...editingSale, status: e.target.value})}
                >
                  <option value="PENDING">Pendente (PENDING)</option>
                  <option value="PAID">Aprovado (PAID)</option>
                  <option value="REFUNDED">Reembolsado (REFUNDED)</option>
                  <option value="CANCELLED">Cancelado (CANCELLED)</option>
                </select>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Nota: Alterar o status aqui atualiza as métricas, mas não dispara ações automáticas no gateway original (como estornar de fato no cartão).
                </small>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
