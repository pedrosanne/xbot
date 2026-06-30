'use client';

import React, { useState, useEffect } from 'react';

// Pure Inline SVG Icons
const FacebookIcon = () => (
  <svg className="h-6 w-6 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LoaderIcon = ({ className = "h-5 w-5 animate-spin" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const TrendingUpIcon = ({ className = "h-5 w-5 text-emerald-500" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const DollarIcon = ({ className = "h-5 w-5 text-zinc-400" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShieldAlertIcon = () => (
  <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m-3 3l-3-3" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

export default function TrafficRoiDashboard() {
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Connection states
  const [tokenInput, setTokenInput] = useState('');
  const [appIdInput, setAppIdInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [updatingAccount, setUpdatingAccount] = useState(false);

  // Dashboard states
  const [level, setLevel] = useState('campaign'); // 'campaign' | 'adset' | 'ad'
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [adsData, setAdsData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // Inline editing states
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [tempBudgetValue, setTempBudgetValue] = useState('');
  const [updatingBudget, setUpdatingBudget] = useState(false);

  // Status toggle states
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  useEffect(() => {
    fetchConfig();
    
    // Check if redirect has a Facebook access token in the hash
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        saveToken(accessToken);
        // Clean URL hash
        window.history.replaceState(null, null, window.location.pathname);
      }
    }
  }, []);

  const saveToken = async (token) => {
    setConnecting(true);
    setConnectError('');
    try {
      const res = await fetch('/api/facebook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token })
      });
      const data = await res.json();
      if (res.ok) {
        // Fetch ad accounts
        setLoadingAccounts(true);
        const accountsRes = await fetch('/api/facebook/accounts');
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAdAccounts(accountsData);
          setConfig({ hasConfig: true, id: data.id, adAccountId: '' });
        } else {
          const accountsErr = await accountsRes.json();
          setConnectError(accountsErr.error || 'Falha ao buscar contas de anúncios.');
        }
        setLoadingAccounts(false);
      } else {
        setConnectError(data.error || 'Falha ao conectar com o Facebook.');
      }
    } catch (err) {
      console.error('Error saving Facebook token:', err);
      setConnectError('Erro ao salvar token de acesso.');
    } finally {
      setConnecting(false);
    }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/facebook/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.hasConfig) {
          setSelectedAccountId(data.adAccountId);
          fetchAdsData(data.adAccountId, level, startDate, endDate);
        }
      }
    } catch (err) {
      console.error('Error fetching Facebook config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleConnectFacebook = async (e) => {
    e.preventDefault();
    if (!tokenInput) return;

    setConnecting(true);
    setConnectError('');

    try {
      const res = await fetch('/api/facebook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokenInput })
      });

      const data = await res.json();

      if (res.ok) {
        // Fetch ad accounts now
        setLoadingAccounts(true);
        const accountsRes = await fetch('/api/facebook/accounts');
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAdAccounts(accountsData);
          setConfig({ hasConfig: true, id: data.id, adAccountId: '' });
        } else {
          const accountsErr = await accountsRes.json();
          setConnectError(accountsErr.error || 'Falha ao buscar contas de anúncios.');
        }
        setLoadingAccounts(false);
      } else {
        setConnectError(data.error || 'Falha ao conectar com o Facebook.');
      }
    } catch (err) {
      console.error('Error connecting Facebook:', err);
      setConnectError('Erro de conexão com o servidor.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectAdAccount = async (accountId) => {
    setSelectedAccountId(accountId);
    setUpdatingAccount(true);

    try {
      const res = await fetch('/api/facebook/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: accountId })
      });

      if (res.ok) {
        setConfig(prev => ({ ...prev, adAccountId: accountId }));
        fetchAdsData(accountId, level, startDate, endDate);
      } else {
        alert('Erro ao selecionar conta de anúncios.');
      }
    } catch (err) {
      console.error('Error updating ad account:', err);
      alert('Erro de conexão.');
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm('Tem certeza que deseja desconectar o perfil do Facebook?')) return;

    try {
      const res = await fetch('/api/facebook/config', { method: 'DELETE' });
      if (res.ok) {
        setConfig(null);
        setAdAccounts([]);
        setAdsData([]);
        setTokenInput('');
        setSelectedAccountId('');
      }
    } catch (err) {
      console.error('Error disconnecting Facebook:', err);
    }
  };

  const fetchAdsData = async (accountId, currentLevel, start, end) => {
    if (!accountId) return;
    setLoadingData(true);
    setDataError('');

    try {
      const res = await fetch(`/api/facebook/campaigns?level=${currentLevel}&startDate=${start}&endDate=${end}`);
      const data = await res.json();

      if (res.ok) {
        setAdsData(data.data || []);
      } else {
        setDataError(data.error || 'Erro ao carregar dados de tráfego.');
      }
    } catch (err) {
      console.error('Error fetching ads data:', err);
      setDataError('Erro ao carregar dados de tráfego.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingStatusId(id);

    try {
      const res = await fetch(`/api/facebook/campaigns/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setAdsData(adsData.map(item => {
          if (item.id === id) {
            return { ...item, status: nextStatus };
          }
          return item;
        }));
      } else {
        const data = await res.json();
        alert(`Falha ao alterar status: ${data.error}`);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Erro de rede.');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleUpdateBudget = async (id) => {
    const parsedBudget = parseFloat(tempBudgetValue);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      alert('Por favor, digite um orçamento válido.');
      return;
    }

    setUpdatingBudget(true);

    try {
      const res = await fetch(`/api/facebook/campaigns/${id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: parsedBudget })
      });

      if (res.ok) {
        setAdsData(adsData.map(item => {
          if (item.id === id) {
            return { ...item, budget: parsedBudget };
          }
          return item;
        }));
        setEditingBudgetId(null);
      } else {
        const data = await res.json();
        alert(`Falha ao atualizar orçamento: ${data.error}`);
      }
    } catch (err) {
      console.error('Error updating budget:', err);
      alert('Erro de rede.');
    } finally {
      setUpdatingBudget(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Aggregated Period Metrics
  const totalSpend = adsData.reduce((sum, item) => sum + item.spend, 0);
  const totalRevenue = adsData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = totalRevenue - totalSpend;
  const totalSales = adsData.reduce((sum, item) => sum + item.salesCount, 0);
  const averageCpa = totalSales > 0 ? totalSpend / totalSales : 0;
  const globalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const globalRoi = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;

  const handleQuickDateFilter = (type) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let start = todayStr;
    let end = todayStr;

    if (type === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      start = yesterday.toISOString().split('T')[0];
      end = start;
    } else if (type === '7days') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      start = lastWeek.toISOString().split('T')[0];
    } else if (type === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      start = startOfMonth.toISOString().split('T')[0];
    }

    setStartDate(start);
    setEndDate(end);
    fetchAdsData(selectedAccountId, level, start, end);
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-300 gap-3">
        <LoaderIcon className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-sm">Carregando painel de tráfego...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tráfego & ROI</h1>
          <p className="text-zinc-400 text-sm mt-1">Monitore o retorno real das suas campanhas no Facebook Ads em tempo real.</p>
        </div>

        {config?.hasConfig && config.adAccountId && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdsData(selectedAccountId, level, startDate, endDate)}
              disabled={loadingData}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors shrink-0"
              title="Atualizar Dados"
            >
              {loadingData ? <LoaderIcon className="h-4 w-4 animate-spin text-zinc-400" /> : <RefreshIcon />}
            </button>
            
            <span className="text-xs text-zinc-500 font-mono">Conta: {selectedAccountId}</span>
            
            <button
              onClick={handleDisconnectFacebook}
              className="bg-zinc-900 hover:bg-red-950/20 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Desconectar Facebook
            </button>
          </div>
        )}
      </div>

      {/* Connection Screen (If no config) */}
      {!config?.hasConfig ? (
        <div className="max-w-xl mx-auto bg-zinc-900/20 border border-zinc-850 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <FacebookIcon />
            <h2 className="text-xl font-bold">Conectar Perfil do Facebook</h2>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed">
            Importe os gastos de anúncios e gerencie orçamentos e campanhas integrando sua conta. Escolha um dos métodos abaixo:
          </p>

          {connectError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-start gap-2 animate-pulse">
              <ShieldAlertIcon />
              <span>{connectError}</span>
            </div>
          )}

          {/* Option 1: Facebook Login button */}
          <div className="bg-zinc-950/40 border border-zinc-850/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300">Método A: Entrar com o Facebook (Recomendado)</span>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">ID do Aplicativo do Facebook (App ID)</label>
              <input
                type="text"
                placeholder="Insira o App ID do seu aplicativo do Facebook"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Para usar este método, você deve criar um aplicativo do tipo "Empresa" ou "Outro" em <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">developers.facebook.com</a> e configurar a URL de redirecionamento de Login como: <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">{typeof window !== 'undefined' ? `${window.location.origin}/traffic` : ''}</code>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!appIdInput) {
                  alert('Por favor, insira o ID do seu aplicativo do Facebook primeiro.');
                  return;
                }
                const redirectUri = encodeURIComponent(`${window.location.origin}/traffic`);
                const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appIdInput}&redirect_uri=${redirectUri}&scope=ads_read,ads_management,business_management&response_type=token`;
                window.location.href = oauthUrl;
              }}
              className="w-full bg-[#1877f2] hover:bg-[#166fe5] text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 text-xs"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Entrar com o Facebook
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-850"></div>
            <span className="flex-shrink mx-4 text-zinc-600 text-[10px] font-black tracking-wider">OU</span>
            <div className="flex-grow border-t border-zinc-850"></div>
          </div>

          {/* Option 2: Manual token form */}
          <div className="bg-zinc-950/20 border border-zinc-850/60 rounded-xl p-5 space-y-4">
            <span className="text-xs font-bold text-zinc-400">Método B: Conectar via Token de Acesso Manual</span>
            
            <form onSubmit={handleConnectFacebook} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">Token de Acesso do Usuário (Access Token)</label>
                <textarea
                  required
                  placeholder="Cole seu token de acesso manual (EAAQ...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {connecting ? <LoaderIcon /> : 'Conectar via Token'}
              </button>
            </form>
          </div>
        </div>
      ) : !config.adAccountId ? (
        /* Ad Account Selection Screen */
        <div className="max-w-md mx-auto bg-zinc-900/20 border border-zinc-850 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-lg">Selecione a Conta de Anúncios</h3>
          <p className="text-zinc-500 text-xs">Escolha qual conta de anúncios deseja monitorar neste painel.</p>
          
          {loadingAccounts ? (
            <div className="flex justify-center py-6">
              <LoaderIcon />
            </div>
          ) : (
            <div className="space-y-2.5">
              {adAccounts.length === 0 ? (
                <p className="text-zinc-500 text-xs text-center">Nenhuma conta de anúncios encontrada para este token.</p>
              ) : (
                adAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAdAccount(acc.id)}
                    disabled={updatingAccount}
                    className="w-full text-left p-4 bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 rounded-xl text-xs font-semibold transition-all flex justify-between items-center"
                  >
                    <div>
                      <p className="text-zinc-200">{acc.name}</p>
                      <p className="text-zinc-500 font-mono mt-0.5">{acc.id}</p>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">{acc.currency}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Connected Dashboard */
        <div className="space-y-6">
          {/* Controls & Filters Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/30 border border-zinc-850 rounded-2xl p-4">
            {/* Level Toggle */}
            <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-0.5 shrink-0">
              {[
                { id: 'campaign', label: 'Campanhas' },
                { id: 'adset', label: 'Conjuntos' },
                { id: 'ad', label: 'Anúncios' }
              ].map(lvl => (
                <button
                  key={lvl.id}
                  onClick={() => { setLevel(lvl.id); fetchAdsData(selectedAccountId, lvl.id, startDate, endDate); }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${level === lvl.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-zinc-950 border border-zinc-850 rounded-xl p-0.5">
                <button onClick={() => handleQuickDateFilter('today')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200">Hoje</button>
                <button onClick={() => handleQuickDateFilter('yesterday')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200">Ontem</button>
                <button onClick={() => handleQuickDateFilter('7days')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200">7 Dias</button>
                <button onClick={() => handleQuickDateFilter('month')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200">Mês</button>
              </div>

              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-zinc-200 focus:outline-none"
                />
                <span className="text-zinc-600">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-zinc-200 focus:outline-none"
                />
              </div>

              <button
                onClick={() => fetchAdsData(selectedAccountId, level, startDate, endDate)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
              >
                Filtrar
              </button>
            </div>
          </div>

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Faturamento</p>
              <h3 className="text-lg font-black text-zinc-100 mt-2 truncate">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Gastos Ads</p>
              <h3 className="text-lg font-black text-zinc-100 mt-2 truncate">{formatCurrency(totalSpend)}</h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Lucro Líquido</p>
              <h3 className={`text-lg font-black mt-2 truncate ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalProfit)}
              </h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ROAS Global</p>
              <h3 className="text-lg font-black text-zinc-100 mt-2">{globalRoas.toFixed(2)}x</h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ROI Global</p>
              <h3 className="text-lg font-black text-zinc-100 mt-2">{globalRoi.toFixed(1)}%</h3>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">CPA Médio</p>
              <h3 className="text-lg font-black text-zinc-100 mt-2 truncate">{formatCurrency(averageCpa)}</h3>
            </div>
          </div>

          {/* Table Container */}
          {dataError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2">
              <ShieldAlertIcon />
              <span>{dataError}</span>
            </div>
          ) : loadingData ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 border border-zinc-850 rounded-2xl bg-zinc-900/10">
              <LoaderIcon className="h-8 w-8 text-emerald-500 animate-spin" />
              <p className="text-zinc-400 text-xs">Sincronizando com o Facebook e calculando ROI...</p>
            </div>
          ) : adsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-900/10 px-4">
              <p className="text-zinc-500 text-sm font-semibold">Nenhuma campanha encontrada no período.</p>
              <p className="text-zinc-600 text-xs mt-1">Verifique o período selecionado ou se os anúncios estão ativos no Facebook.</p>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-850 bg-zinc-900/30 text-zinc-400 uppercase font-bold tracking-wider">
                      <th className="py-4 px-4 text-center w-12">Status</th>
                      <th className="py-4 px-4 min-w-[220px]">Campanha</th>
                      <th className="py-4 px-4 text-right w-36">Orçamento</th>
                      <th className="py-4 px-4 text-center w-16">Vendas</th>
                      <th className="py-4 px-4 text-right w-24">CPA</th>
                      <th className="py-4 px-4 text-right w-28">Gastos</th>
                      <th className="py-4 px-4 text-right w-28">Faturamento</th>
                      <th className="py-4 px-4 text-right w-28">Lucro</th>
                      <th className="py-4 px-4 text-center w-16">ROAS</th>
                      <th className="py-4 px-4 text-center w-16">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {adsData.map((item) => {
                      const isEditingBudget = editingBudgetId === item.id;

                      return (
                        <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                          {/* Toggle Status Switch */}
                          <td className="py-4 px-4 text-center">
                            {togglingStatusId === item.id ? (
                              <LoaderIcon className="h-3.5 w-3.5 animate-spin mx-auto text-zinc-500" />
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(item.id, item.status)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                  item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-zinc-800'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    item.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </td>

                          {/* Name & Breadcrumbs */}
                          <td className="py-4 px-4 font-semibold text-zinc-200">
                            <div className="truncate max-w-[280px]" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 flex flex-wrap gap-1.5 items-center">
                              <span>ID: {item.id}</span>
                              {item.campaign && (
                                <>
                                  <span className="text-zinc-700">•</span>
                                  <span className="truncate max-w-[120px]">Camp: {item.campaign.name}</span>
                                </>
                              )}
                              {item.adset && (
                                <>
                                  <span className="text-zinc-700">•</span>
                                  <span className="truncate max-w-[120px]">Conj: {item.adset.name}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Editable Budget */}
                          <td className="py-4 px-4 text-right font-medium text-zinc-300">
                            {isEditingBudget ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={tempBudgetValue}
                                  onChange={(e) => setTempBudgetValue(e.target.value)}
                                  className="w-20 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-right text-xs text-zinc-100 focus:outline-none"
                                  placeholder="0.00"
                                />
                                <button
                                  onClick={() => handleUpdateBudget(item.id)}
                                  disabled={updatingBudget}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                                  title="Confirmar"
                                >
                                  {updatingBudget ? <LoaderIcon className="h-3 w-3 animate-spin" /> : '✔'}
                                </button>
                                <button
                                  onClick={() => setEditingBudgetId(null)}
                                  className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400"
                                  title="Cancelar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div 
                                onClick={() => {
                                  setEditingBudgetId(item.id);
                                  setTempBudgetValue(item.budget.toString());
                                }}
                                className="group inline-flex items-center justify-end gap-1 cursor-pointer hover:text-white"
                                title="Clique para alterar o orçamento"
                              >
                                <span>{formatCurrency(item.budget)}</span>
                                <span className="text-[9px] text-zinc-500 lowercase">/{item.budgetType}</span>
                                <EditIcon />
                              </div>
                            )}
                          </td>

                          {/* Vendas */}
                          <td className="py-4 px-4 text-center font-bold text-zinc-300">
                            {item.salesCount}
                          </td>

                          {/* CPA */}
                          <td className="py-4 px-4 text-right font-medium text-zinc-400">
                            {item.salesCount > 0 ? formatCurrency(item.cpa) : 'N/A'}
                          </td>

                          {/* Gastos */}
                          <td className="py-4 px-4 text-right font-medium text-zinc-400">
                            {formatCurrency(item.spend)}
                          </td>

                          {/* Faturamento */}
                          <td className="py-4 px-4 text-right font-bold text-zinc-300">
                            {formatCurrency(item.revenue)}
                          </td>

                          {/* Lucro */}
                          <td className={`py-4 px-4 text-right font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(item.profit)}
                          </td>

                          {/* ROAS */}
                          <td className="py-4 px-4 text-center font-bold text-zinc-300">
                            {item.spend > 0 ? `${item.roas.toFixed(2)}x` : '0.00x'}
                          </td>

                          {/* ROI */}
                          <td className={`py-4 px-4 text-center font-bold ${item.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.spend > 0 ? `${item.roi.toFixed(0)}%` : '0%'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot>
                    <tr className="border-t border-zinc-850 bg-zinc-900/20 font-bold text-zinc-300">
                      <td className="py-4 px-4 text-center">N/A</td>
                      <td className="py-4 px-4 uppercase text-zinc-400">Total Geral</td>
                      <td className="py-4 px-4 text-right font-mono">N/A</td>
                      <td className="py-4 px-4 text-center text-zinc-100">{totalSales}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{formatCurrency(averageCpa)}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{formatCurrency(totalSpend)}</td>
                      <td className="py-4 px-4 text-right text-zinc-100">{formatCurrency(totalRevenue)}</td>
                      <td className={`py-4 px-4 text-right ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(totalProfit)}</td>
                      <td className="py-4 px-4 text-center">{globalRoas.toFixed(2)}x</td>
                      <td className={`py-4 px-4 text-center ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{globalRoi.toFixed(0)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
