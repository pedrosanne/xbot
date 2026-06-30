'use client';

import { useState, useEffect } from 'react';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'offers', 'bumps', 'upsells', 'pixels'
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [bumps, setBumps] = useState([]);
  const [upsells, setUpsells] = useState([]);
  const [pixels, setPixels] = useState([]);

  // Common Loading & Status States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // 1. Product Form States
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodType, setProdType] = useState('DIGITAL');
  const [prodPrice, setProdPrice] = useState('0.00');
  const [prodImage, setProdImage] = useState('');
  const [prodPostSaleFlowId, setProdPostSaleFlowId] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [flows, setFlows] = useState([]);

  // 2. Offer Form States
  const [offProductId, setOffProductId] = useState('');
  const [offName, setOffName] = useState('');
  const [offPrice, setOffPrice] = useState('0.00');
  const [offDesc, setOffDesc] = useState('');
  const [offCode, setOffCode] = useState('');
  const [editingOffer, setEditingOffer] = useState(null);

  // 3. Order Bump Form States
  const [bumpProductId, setBumpProductId] = useState('');
  const [bumpTargetProductId, setBumpTargetProductId] = useState('');
  const [bumpTitle, setBumpTitle] = useState('');
  const [bumpDesc, setBumpDesc] = useState('');
  const [bumpPrice, setBumpPrice] = useState('0.00');

  // 4. Upsell Form States
  const [upProductId, setUpProductId] = useState('');
  const [upTargetProductId, setUpTargetProductId] = useState('');
  const [upTitle, setUpTitle] = useState('');
  const [upDesc, setUpDesc] = useState('');
  const [upPrice, setUpPrice] = useState('0.00');

  // 5. Pixel Form States
  const [pixProductId, setPixProductId] = useState('');
  const [pixPlatform, setPixPlatform] = useState('facebook');
  const [pixPixelId, setPixPixelId] = useState('');
  const [pixToken, setPixToken] = useState('');
  const [pixTestCode, setPixTestCode] = useState('');

  // Initial Data Load
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setFetching(true);
    try {
      const [resProd, resOff, resBump, resUp, resPix, resFlows] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/offers'),
        fetch('/api/products/bumps'),
        fetch('/api/products/upsells'),
        fetch('/api/products/pixels'),
        fetch('/api/flows')
      ]);

      if (resProd.ok) setProducts(await resProd.json());
      if (resOff.ok) setOffers(await resOff.json());
      if (resBump.ok) setBumps(await resBump.json());
      if (resUp.ok) setUpsells(await resUp.json());
      if (resPix.ok) setPixels(await resPix.json());
      if (resFlows.ok) setFlows(await resFlows.json());
    } catch (err) {
      console.error('Error loading data:', err);
      setStatusMsg({ type: 'error', text: 'Falha ao conectar com o banco de dados.' });
    } finally {
      setFetching(false);
    }
  };

  // Helper to show brief status message
  const triggerStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  // ==========================================
  // PRODUCTS CRUD
  // ==========================================
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          description: prodDesc,
          type: prodType,
          price: parseFloat(prodPrice) || 0.0,
          imageUrl: prodImage,
          postSaleFlowId: prodPostSaleFlowId || null
        })
      });

      if (res.ok) {
        triggerStatus('success', `Produto "${prodName}" criado com sucesso!`);
        setProdName('');
        setProdDesc('');
        setProdType('DIGITAL');
        setProdPrice('0.00');
        setProdImage('');
        setProdPostSaleFlowId('');
        // Reload
        const prodData = await fetch('/api/products').then(r => r.json());
        setProducts(prodData);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao criar produto.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão ao criar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductUpdate = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editingProduct.name,
          description: editingProduct.description,
          type: editingProduct.type,
          price: parseFloat(editingProduct.price) || 0.0,
          imageUrl: editingProduct.imageUrl,
          postSaleFlowId: editingProduct.postSaleFlowId || null
        })
      });

      if (res.ok) {
        triggerStatus('success', `Produto "${editingProduct.name}" atualizado!`);
        setEditingProduct(null);
        // Reload
        const prodData = await fetch('/api/products').then(r => r.json());
        setProducts(prodData);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao atualizar.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão ao atualizar.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductDelete = async (id, name) => {
    if (!confirm(`Excluir o produto "${name}"? Todas as ofertas e configurações vinculadas a ele serão apagadas.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerStatus('success', `Produto "${name}" excluído.`);
        fetchData(); // Reload all to cascade clean local lists
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao excluir.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão ao excluir.');
    }
  };

  // ==========================================
  // OFFERS CRUD
  // ==========================================
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (!offProductId) {
      triggerStatus('error', 'Selecione um produto.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/products/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: offProductId,
          name: offName,
          price: parseFloat(offPrice) || 0.0,
          description: offDesc,
          code: offCode
        })
      });

      if (res.ok) {
        triggerStatus('success', `Oferta "${offName}" adicionada com sucesso!`);
        setOffName('');
        setOffPrice('0.00');
        setOffDesc('');
        setOffCode('');
        // Reload
        const data = await fetch('/api/products/offers').then(r => r.json());
        setOffers(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao criar oferta.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferUpdate = async (e) => {
    e.preventDefault();
    if (!editingOffer) return;
    setLoading(true);
    try {
      const res = await fetch('/api/products/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOffer.id,
          productId: editingOffer.productId,
          name: editingOffer.name,
          price: parseFloat(editingOffer.price) || 0.0,
          description: editingOffer.description,
          code: editingOffer.code
        })
      });

      if (res.ok) {
        triggerStatus('success', `Oferta "${editingOffer.name}" atualizada!`);
        setEditingOffer(null);
        // Reload
        const data = await fetch('/api/products/offers').then(r => r.json());
        setOffers(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao atualizar.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferDelete = async (id, name) => {
    if (!confirm(`Excluir a oferta "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/offers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerStatus('success', `Oferta "${name}" excluída.`);
        const data = await fetch('/api/products/offers').then(r => r.json());
        setOffers(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao excluir.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    }
  };

  // ==========================================
  // ORDER BUMPS CRUD
  // ==========================================
  const handleBumpSubmit = async (e) => {
    e.preventDefault();
    if (!bumpProductId || !bumpTargetProductId) {
      triggerStatus('error', 'Selecione os produtos.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/products/bumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: bumpProductId,
          targetProductId: bumpTargetProductId,
          title: bumpTitle,
          description: bumpDesc,
          price: parseFloat(bumpPrice) || 0.0
        })
      });

      if (res.ok) {
        triggerStatus('success', `Order bump "${bumpTitle}" adicionado!`);
        setBumpTitle('');
        setBumpDesc('');
        setBumpPrice('0.00');
        setBumpTargetProductId('');
        // Reload
        const data = await fetch('/api/products/bumps').then(r => r.json());
        setBumps(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao criar.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleBumpDelete = async (id, title) => {
    if (!confirm(`Excluir o order bump "${title}"?`)) return;
    try {
      const res = await fetch(`/api/products/bumps?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerStatus('success', `Order bump excluído.`);
        const data = await fetch('/api/products/bumps').then(r => r.json());
        setBumps(data);
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    }
  };

  // ==========================================
  // UPSELLS CRUD
  // ==========================================
  const handleUpsellSubmit = async (e) => {
    e.preventDefault();
    if (!upProductId || !upTargetProductId) {
      triggerStatus('error', 'Selecione os produtos.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/products/upsells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: upProductId,
          targetProductId: upTargetProductId,
          title: upTitle,
          description: upDesc,
          price: parseFloat(upPrice) || 0.0
        })
      });

      if (res.ok) {
        triggerStatus('success', `Upsell "${upTitle}" adicionado!`);
        setUpTitle('');
        setUpDesc('');
        setUpPrice('0.00');
        setUpTargetProductId('');
        // Reload
        const data = await fetch('/api/products/upsells').then(r => r.json());
        setUpsells(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao criar.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpsellDelete = async (id, title) => {
    if (!confirm(`Excluir o upsell "${title}"?`)) return;
    try {
      const res = await fetch(`/api/products/upsells?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerStatus('success', `Upsell excluído.`);
        const data = await fetch('/api/products/upsells').then(r => r.json());
        setUpsells(data);
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    }
  };

  // ==========================================
  // PIXELS CRUD
  // ==========================================
  const handlePixelSubmit = async (e) => {
    e.preventDefault();
    if (!pixProductId || !pixPixelId) {
      triggerStatus('error', 'Preencha os campos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/products/pixels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: pixProductId,
          platform: pixPlatform,
          pixelId: pixPixelId,
          token: pixToken,
          testCode: pixTestCode
        })
      });

      if (res.ok) {
        triggerStatus('success', `Pixel adicionado com sucesso!`);
        setPixPixelId('');
        setPixToken('');
        setPixTestCode('');
        // Reload
        const data = await fetch('/api/products/pixels').then(r => r.json());
        setPixels(data);
      } else {
        const data = await res.json();
        triggerStatus('error', data.error || 'Erro ao criar.');
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handlePixelDelete = async (id) => {
    if (!confirm('Excluir este pixel de rastreamento?')) return;
    try {
      const res = await fetch(`/api/products/pixels?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerStatus('success', `Pixel excluído.`);
        const data = await fetch('/api/products/pixels').then(r => r.json());
        setPixels(data);
      }
    } catch (err) {
      triggerStatus('error', 'Falha na conexão.');
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">📦 Gestão de Produtos & Ofertas</h1>
      </header>

      <div className="page-body animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px', paddingBottom: '8px', overflowX: 'auto' }}>
          {[
            { id: 'products', name: '📦 Produtos' },
            { id: 'offers', name: '🏷️ Ofertas' },
            { id: 'bumps', name: '⚡ Order Bumps' },
            { id: 'upsells', name: '🚀 Upsells' },
            { id: 'pixels', name: '📊 Pixels' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusMsg({ type: '', text: '' });
              }}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', borderColor: activeTab === tab.id ? 'white' : 'transparent' }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Global Notifications */}
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

        {fetching ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
            Carregando painel de produtos...
          </div>
        ) : (
          <div>
            {/* ========================================================
                TAB 1: PRODUCTS
               ======================================================== */}
            {activeTab === 'products' && (
              <div>
                {/* Product Edit Overlay */}
                {editingProduct && (
                  <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary-hover)' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>
                      Editar Produto: {editingProduct.name}
                    </h3>
                    <form onSubmit={handleProductUpdate} className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome do Produto</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Preço Base (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tipo do Produto</label>
                        <select
                          value={editingProduct.type}
                          onChange={(e) => setEditingProduct({ ...editingProduct, type: e.target.value })}
                          className="form-input"
                         
                        >
                          <option value="DIGITAL">Digital (Infoproduto)</option>
                          <option value="PHYSICAL">Físico</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">URL da Imagem (Opcional)</label>
                        <input
          type="text"
                          value={editingProduct.imageUrl}
                          onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                          placeholder="https://exemplo.com/imagem.png"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label">Descrição</label>
                        <textarea
                          rows={2}
                          value={editingProduct.description}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label">Fluxo de Pós-Venda (Chatbot)</label>
                        <select
                          value={editingProduct.postSaleFlowId || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, postSaleFlowId: e.target.value || null })}
                          className="form-input"
                        >
                          <option value="">Nenhum (Disparar fluxos genéricos de pagamento confirmado)</option>
                          {flows.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
                          {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="dashboard-split-layout">
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Produtos</h3>
                    {products.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Nenhum produto cadastrado. Crie o seu primeiro produto ao lado.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {products.map(p => (
                          <div 
                            key={p.id} 
                            className="responsive-list-row"
                            style={{ 
                              padding: '16px', 
                              background: 'rgba(255,255,255,0.01)', 
                              border: '1px solid var(--border-glass)', 
                              borderRadius: '8px',
                              display: 'flex',
                              gap: '16px',
                              alignItems: 'center'
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-glass)' }} />
                            ) : (
                              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '1.2rem' }}>
                                📦
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</span>
                                <span style={{ fontSize: '0.68rem', padding: '1px 5px', background: p.type === 'DIGITAL' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(46, 204, 113, 0.1)', color: p.type === 'DIGITAL' ? '#3498db' : '#2ecc71', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                  {p.type === 'DIGITAL' ? 'Digital' : 'Físico'}
                                </span>
                              </div>
                              <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {p.description || 'Sem descrição.'}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                                R$ {p.price.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <button onClick={() => setEditingProduct(p)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                Editar
                              </button>
                              <button onClick={() => handleProductDelete(p.id, p.name)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Adicionar Produto</h3>
                    <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome do Produto</label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => setProdName(e.target.value)}
                          placeholder="Ex: Método Vendas Rápidas"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Preço Base (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tipo do Produto</label>
                        <select
                          value={prodType}
                          onChange={(e) => setProdType(e.target.value)}
                          className="form-input"
                         
                        >
                          <option value="DIGITAL">Digital (Infoproduto)</option>
                          <option value="PHYSICAL">Físico</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">URL da Imagem (Opcional)</label>
                        <input
                          type="text"
                          value={prodImage}
                          onChange={(e) => setProdImage(e.target.value)}
                          placeholder="https://exemplo.com/imagem.png"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Descrição</label>
                        <textarea
                          rows={2}
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          placeholder="Breve descrição do produto."
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Fluxo de Pós-Venda (Chatbot)</label>
                        <select
                          value={prodPostSaleFlowId}
                          onChange={(e) => setProdPostSaleFlowId(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Nenhum (Disparar fluxos genéricos de pagamento confirmado)</option>
                          {flows.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }} disabled={loading}>
                        {loading ? 'Criando...' : 'Adicionar Produto'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 2: OFFERS
               ======================================================== */}
            {activeTab === 'offers' && (
              <div>
                {editingOffer && (
                  <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', border: '1px solid var(--color-primary-hover)' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>
                      Editar Oferta: {editingOffer.name}
                    </h3>
                    <form onSubmit={handleOfferUpdate} className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Produto Vinculado</label>
                        <select
                          value={editingOffer.productId}
                          onChange={(e) => setEditingOffer({ ...editingOffer, productId: e.target.value })}
                          className="form-input"
                         
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome da Oferta</label>
                        <input
                          type="text"
                          required
                          value={editingOffer.name}
                          onChange={(e) => setEditingOffer({ ...editingOffer, name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Preço da Oferta (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingOffer.price}
                          onChange={(e) => setEditingOffer({ ...editingOffer, price: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Slug / Código de Checkout (Opcional)</label>
                        <input
                          type="text"
                          value={editingOffer.code}
                          onChange={(e) => setEditingOffer({ ...editingOffer, code: e.target.value })}
                          placeholder="Ex: oferta-black-friday"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label">Descrição</label>
                        <textarea
                          rows={2}
                          value={editingOffer.description}
                          onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
                          {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button type="button" onClick={() => setEditingOffer(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="dashboard-split-layout">
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Ofertas Configuradas</h3>
                    {offers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Nenhuma oferta configurada. Adicione uma oferta ao lado.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        {offers.map(o => (
                          <div 
                            key={o.id} 
                            className="responsive-list-row"
                            style={{ 
                              padding: '16px', 
                              background: 'rgba(255,255,255,0.01)', 
                              border: '1px solid var(--border-glass)', 
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem', marginRight: '8px' }}>{o.name}</span>
                              <span style={{ fontSize: '0.72rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                {o.product?.name || 'Produto Removido'}
                              </span>
                              {o.code && (
                                <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#ffa500', marginTop: '4px' }}>
                                  Checkout: {o.code}
                                </span>
                              )}
                              <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {o.description || 'Sem descrição.'}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>
                                R$ {o.price.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => setEditingOffer(o)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                Editar
                              </button>
                              <button onClick={() => handleOfferDelete(o.id, o.name)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Adicionar Oferta</h3>
                    <form onSubmit={handleOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Produto Vinculado</label>
                        <select
                          value={offProductId}
                          onChange={(e) => setOffProductId(e.target.value)}
                          className="form-input"
                         
                          required
                        >
                          <option value="">Selecione o produto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome da Oferta</label>
                        <input
                          type="text"
                          required
                          value={offName}
                          onChange={(e) => setOffName(e.target.value)}
                          placeholder="Ex: Oferta Especial 50% OFF"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Preço da Oferta (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={offPrice}
                          onChange={(e) => setOffPrice(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Slug / Código de Checkout (Opcional)</label>
                        <input
                          type="text"
                          value={offCode}
                          onChange={(e) => setOffCode(e.target.value)}
                          placeholder="Ex: black-friday-2026"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Descrição</label>
                        <textarea
                          rows={2}
                          value={offDesc}
                          onChange={(e) => setOffDesc(e.target.value)}
                          placeholder="Regras de checkout ou detalhes."
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }} disabled={loading}>
                        {loading ? 'Criando...' : 'Adicionar Oferta'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 3: ORDER BUMPS
               ======================================================== */}
            {activeTab === 'bumps' && (
              <div className="dashboard-split-layout">
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Bumps Ativos</h3>
                  {bumps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Nenhum order bump configurado. Vincule um novo bump ao lado.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      {bumps.map(b => (
                        <div 
                          key={b.id} 
                          className="responsive-list-row"
                          style={{ 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{b.title}</span>
                            <div style={{ display: 'flex', gap: '6px', margin: '4px 0', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 5px', background: 'var(--color-success-bg)', color: 'var(--text-secondary)', borderRadius: '4px' }}>
                                Principal: {b.product?.name}
                              </span>
                              <span style={{ fontSize: '0.68rem', padding: '2px 5px', background: 'rgba(255, 165, 0, 0.08)', color: '#ffa500', borderRadius: '4px' }}>
                                Bump: {b.targetProduct?.name}
                              </span>
                            </div>
                            <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {b.description || 'Sem descrição.'}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>
                              Preço Bump: R$ {b.price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <button onClick={() => handleBumpDelete(b.id, b.title)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Adicionar Order Bump</h3>
                  <form onSubmit={handleBumpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Produto Principal</label>
                      <select
                        value={bumpProductId}
                        onChange={(e) => setBumpProductId(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="">Selecione o produto principal...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Produto Oferecido no Bump</label>
                      <select
                        value={bumpTargetProductId}
                        onChange={(e) => setBumpTargetProductId(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="">Selecione o bump...</option>
                        {products.filter(p => p.id !== bumpProductId).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Título da Chamada</label>
                      <input
                        type="text"
                        required
                        value={bumpTitle}
                        onChange={(e) => setBumpTitle(e.target.value)}
                        placeholder="Ex: Adicionar E-book por apenas R$ 9,90"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Preço Promocional Bump (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={bumpPrice}
                        onChange={(e) => setBumpPrice(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Descrição (Opcional)</label>
                      <textarea
                        rows={2}
                        value={bumpDesc}
                        onChange={(e) => setBumpDesc(e.target.value)}
                        placeholder="Descrição curta que aparece no card do Bump."
                        className="form-input"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }} disabled={loading}>
                      {loading ? 'Adicionando...' : 'Adicionar Order Bump'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 4: UPSELLS
               ======================================================== */}
            {activeTab === 'upsells' && (
              <div className="dashboard-split-layout">
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Upsells Ativos</h3>
                  {upsells.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Nenhum upsell configurado. Adicione um upsell pós-compra ao lado.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      {upsells.map(u => (
                        <div 
                          key={u.id} 
                          className="responsive-list-row"
                          style={{ 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.title}</span>
                            <div style={{ display: 'flex', gap: '6px', margin: '4px 0', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', padding: '2px 5px', background: 'var(--color-success-bg)', color: 'var(--text-secondary)', borderRadius: '4px' }}>
                                Pág. Agradecimento de: {u.product?.name}
                              </span>
                              <span style={{ fontSize: '0.68rem', padding: '2px 5px', background: 'rgba(52, 152, 219, 0.08)', color: '#3498db', borderRadius: '4px' }}>
                                Upsell: {u.targetProduct?.name}
                              </span>
                            </div>
                            <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {u.description || 'Sem descrição.'}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>
                              Preço Upsell: R$ {u.price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <button onClick={() => handleUpsellDelete(u.id, u.title)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Adicionar Upsell pós-compra</h3>
                  <form onSubmit={handleUpsellSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Produto da Compra Principal</label>
                      <select
                        value={upProductId}
                        onChange={(e) => setUpProductId(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="">Selecione o produto principal...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Produto Oferecido como Upsell</label>
                      <select
                        value={upTargetProductId}
                        onChange={(e) => setUpTargetProductId(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="">Selecione o produto do upsell...</option>
                        {products.filter(p => p.id !== upProductId).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Título da Oferta de Upsell</label>
                      <input
                        type="text"
                        required
                        value={upTitle}
                        onChange={(e) => setUpTitle(e.target.value)}
                        placeholder="Ex: Leve a versão Premium por apenas R$ 47"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Preço Promocional do Upsell (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={upPrice}
                        onChange={(e) => setUpPrice(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Descrição da Oferta (Opcional)</label>
                      <textarea
                        rows={2}
                        value={upDesc}
                        onChange={(e) => setUpDesc(e.target.value)}
                        placeholder="Chamada persuasiva para o upsell de um clique."
                        className="form-input"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }} disabled={loading}>
                      {loading ? 'Adicionando...' : 'Adicionar Upsell'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================
                TAB 5: PIXELS
               ======================================================== */}
            {activeTab === 'pixels' && (
              <div className="dashboard-split-layout">
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Pixels de Rastreamento</h3>
                  {pixels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Nenhum pixel cadastrado. Crie um pixel de rastreamento ao lado.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      {pixels.map(pix => (
                        <div 
                          key={pix.id} 
                          className="responsive-list-row"
                          style={{ 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{pix.pixelId}</span>
                              <span style={{ 
                                fontSize: '0.68rem', 
                                padding: '2px 6px', 
                                textTransform: 'uppercase', 
                                background: pix.platform === 'facebook' ? 'rgba(59, 89, 152, 0.15)' : (pix.platform === 'google' ? 'rgba(219, 68, 85, 0.15)' : 'rgba(255,255,255,0.08)'), 
                                color: pix.platform === 'facebook' ? '#3b5998' : (pix.platform === 'google' ? '#db4437' : '#eee'), 
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                {pix.platform}
                              </span>
                            </div>
                            <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Produto: {pix.product?.name}
                            </span>
                            {pix.token && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '380px', marginTop: '2px' }}>
                                Token API: {pix.token.substring(0, 15)}...
                              </span>
                            )}
                            {pix.testCode && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Cód. Teste CAPI: {pix.testCode}
                              </span>
                            )}
                          </div>
                          <button onClick={() => handlePixelDelete(pix.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.05rem', fontWeight: 600 }}>Adicionar Pixel</h3>
                  <form onSubmit={handlePixelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Produto</label>
                      <select
                        value={pixProductId}
                        onChange={(e) => setPixProductId(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="">Selecione o produto...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Plataforma</label>
                      <select
                        value={pixPlatform}
                        onChange={(e) => setPixPlatform(e.target.value)}
                        className="form-input"
                       
                        required
                      >
                        <option value="facebook">Meta / Facebook Pixel</option>
                        <option value="google">Google Analytics / Ads</option>
                        <option value="tiktok">TikTok Ads</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">ID do Pixel / Rastreamento</label>
                      <input
                        type="text"
                        required
                        value={pixPixelId}
                        onChange={(e) => setPixPixelId(e.target.value)}
                        placeholder="Ex: 1234567890"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Token de API de Conversões (Opcional - Facebook)</label>
                      <input
                        type="password"
                        value={pixToken}
                        onChange={(e) => setPixToken(e.target.value)}
                        placeholder="Ex: Token do Meta CAPI"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Código de Teste de Eventos (Opcional - Facebook)</label>
                      <input
                        type="text"
                        value={pixTestCode}
                        onChange={(e) => setPixTestCode(e.target.value)}
                        placeholder="Ex: TEST12345"
                        className="form-input"
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }} disabled={loading}>
                      {loading ? 'Adicionando...' : 'Adicionar Pixel'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
