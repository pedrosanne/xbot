'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logToDb } from '@/lib/log';

export default function CRMPage() {
  const [activeSubTab, setActiveSubTab] = useState('crm'); // 'crm', 'broadcasts', or 'emails'
  
  // Data States
  const [contacts, setContacts] = useState([]);
  const [flows, setFlows] = useState([]);
  const [connections, setConnections] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [emailCampaigns, setEmailCampaigns] = useState([]);
  
  // Loading States
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [loadingEmailCampaigns, setLoadingEmailCampaigns] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'AUTO', 'MANUAL'
  const [tagFilter, setTagFilter] = useState('');
  
  // Selection States
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  
  // Broadcast Creation Form States
  const [campaignName, setCampaignName] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignFlowId, setCampaignFlowId] = useState('');
  const [selectedSenderIds, setSelectedSenderIds] = useState([]);
  const [minDelay, setMinDelay] = useState(5);
  const [maxDelay, setMaxDelay] = useState(15);
  const [targetType, setTargetType] = useState('selected'); // 'selected' or 'all'
  
  // Active Running Broadcast Queue
  const [runningCampaign, setRunningCampaign] = useState(null); // { id, contactIds, currentIndex }
  const runningCampaignRef = useRef(null);

  // Email Marketing States
  const [emailConfig, setEmailConfig] = useState(null);
  const [emailProvider, setEmailProvider] = useState('resend');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailSender, setEmailSender] = useState('');
  const [emailCampaignName, setEmailCampaignName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTargetType, setEmailTargetType] = useState('all'); // 'all', 'selected', 'tag'
  const [emailTagFilter, setEmailTagFilter] = useState('');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [runningEmailCampaign, setRunningEmailCampaign] = useState(null); // { id, contactIds, currentIndex }
  const runningEmailCampaignRef = useRef(null);

  useEffect(() => {
    fetchContacts();
    fetchFlows();
    fetchConnections();
    fetchBroadcasts();
    fetchEmailConfig();
    fetchEmailCampaigns();
  }, []);

  // Sync ref with state for the async loop
  useEffect(() => {
    runningCampaignRef.current = runningCampaign;
  }, [runningCampaign]);

  // Bulk Sender Loop (Client-Side Queue Processor)
  useEffect(() => {
    if (!runningCampaign) return;

    let timeoutId;
    let isAborted = false;

    async function processNext() {
      const current = runningCampaignRef.current;
      if (!current || isAborted) return;

      const { id, contactIds, currentIndex } = current;

      if (currentIndex >= contactIds.length) {
        // Queue finished!
        await updateCampaignStatus(id, 'COMPLETED');
        setRunningCampaign(null);
        fetchBroadcasts();
        return;
      }

      const contactId = contactIds[currentIndex];
      
      try {
        // Send single item
        const res = await fetch('/api/broadcasts/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broadcastId: id, contactId })
        });
        
        if (res.ok) {
          // Success or logged failure
        }
      } catch (err) {
        console.error('Error processing broadcast item:', err);
      }

      // Refresh list to show updated counters
      fetchBroadcasts();

      // Schedule next item with random delay
      const delayMs = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000;
      
      if (!isAborted && runningCampaignRef.current?.id === id) {
        setRunningCampaign(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }));
        timeoutId = setTimeout(processNext, delayMs);
      }
    }

    // Start the loop
    timeoutId = setTimeout(processNext, 1000);

    return () => {
      isAborted = true;
      clearTimeout(timeoutId);
    };
  }, [runningCampaign, minDelay, maxDelay]);

  // Sync ref with state for the email async loop
  useEffect(() => {
    runningEmailCampaignRef.current = runningEmailCampaign;
  }, [runningEmailCampaign]);

  // Bulk Email Sender Loop (Client-Side Queue Processor)
  useEffect(() => {
    if (!runningEmailCampaign) return;

    let timeoutId;
    let isAborted = false;

    async function processNextEmail() {
      const current = runningEmailCampaignRef.current;
      if (!current || isAborted) return;

      const { id, contactIds, currentIndex } = current;

      if (currentIndex >= contactIds.length) {
        // Campaign finished!
        await updateEmailCampaignStatus(id, 'COMPLETED');
        setRunningEmailCampaign(null);
        fetchEmailCampaigns();
        return;
      }

      const contactId = contactIds[currentIndex];

      try {
        await fetch('/api/emails/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: id, contactId })
        });
      } catch (err) {
        console.error('Error processing email campaign item:', err);
      }

      // Refresh list to show updated counters
      fetchEmailCampaigns();

      // Schedule next item with a short delay (e.g. 200ms) since email sending is fast
      if (!isAborted && runningEmailCampaignRef.current?.id === id) {
        setRunningEmailCampaign(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }));
        timeoutId = setTimeout(processNextEmail, 200);
      }
    }

    // Start the loop
    timeoutId = setTimeout(processNextEmail, 1000);

    return () => {
      isAborted = true;
      clearTimeout(timeoutId);
    };
  }, [runningEmailCampaign]);

  // Fetch Functions
  async function fetchContacts() {
    setLoadingContacts(true);
    try {
      const res = await fetch('/api/chat'); // Fetches contacts list
      if (res.ok) {
        const data = await res.json();
        setContacts(data || []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function fetchFlows() {
    try {
      const res = await fetch('/api/flows');
      if (res.ok) setFlows(await res.json());
    } catch (err) {
      console.error('Error fetching flows:', err);
    }
  }

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.filter(c => c.isActive) || []);
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  }

  async function fetchEmailConfig() {
    try {
      const res = await fetch('/api/emails/config');
      if (res.ok) {
        const data = await res.json();
        setEmailConfig(data);
        if (data.hasConfig) {
          setEmailProvider(data.provider || 'resend');
          setEmailSender(data.sender || '');
          setEmailApiKey(data.apiKey || '');
        }
      }
    } catch (err) {
      console.error('Error fetching email config:', err);
    }
  }

  async function fetchEmailCampaigns() {
    setLoadingEmailCampaigns(true);
    try {
      const res = await fetch('/api/emails/campaigns');
      if (res.ok) {
        const data = await res.json();
        setEmailCampaigns(data || []);

        // Resume running email campaign if found in DB
        const activeDbCampaign = data.find(c => c.status === 'RUNNING');
        if (activeDbCampaign && !runningEmailCampaignRef.current) {
          // Fetch full campaign details with logs to find remaining
          const detailRes = await fetch(`/api/emails/campaigns?campaignId=${activeDbCampaign.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const processedContactIds = new Set(detailData.logs.map(l => l.contactId));
            
            // Re-evaluate target list (contacts with emails)
            const allTargetIds = contacts.filter(c => c.email).map(c => c.id);
            const remainingIds = allTargetIds.filter(id => !processedContactIds.has(id));

            setRunningEmailCampaign({
              id: activeDbCampaign.id,
              contactIds: remainingIds,
              currentIndex: 0
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching email campaigns:', err);
    } finally {
      setLoadingEmailCampaigns(false);
    }
  }

  const handleSaveEmailConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/emails/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: emailProvider,
          apiKey: emailApiKey,
          sender: emailSender
        })
      });

      if (res.ok) {
        alert('Configurações de e-mail salvas com sucesso!');
        fetchEmailConfig();
      } else {
        const data = await res.json();
        alert(`Erro ao salvar: ${data.error}`);
      }
    } catch (err) {
      console.error('Error saving email config:', err);
      alert('Erro de conexão.');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      alert('Digite o e-mail do destinatário.');
      return;
    }

    setSendingTestEmail(true);
    try {
      const res = await fetch('/api/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: emailProvider,
          apiKey: emailApiKey,
          sender: emailSender,
          to: testEmailRecipient
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'E-mail de teste enviado com sucesso!');
      } else {
        alert(`Falha no envio: ${data.error}`);
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      alert('Erro de conexão.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleCreateEmailCampaign = async (e) => {
    e.preventDefault();
    if (!emailCampaignName.trim() || !emailSubject.trim() || !emailBody.trim()) {
      alert('Preencha todos os campos obrigatórios da campanha.');
      return;
    }

    let targetContactIds = [];
    if (emailTargetType === 'selected') {
      if (selectedContactIds.length === 0) {
        alert('Nenhum contato selecionado no CRM.');
        return;
      }
      targetContactIds = selectedContactIds;
    }

    try {
      const res = await fetch('/api/emails/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: emailCampaignName,
          subject: emailSubject,
          body: emailBody,
          targetType: emailTargetType,
          targetContactIds,
          tagFilter: emailTagFilter
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Clear form
        setEmailCampaignName('');
        setEmailSubject('');
        setEmailBody('');
        
        alert('Campanha de e-mail criada com sucesso! O progresso será exibido abaixo.');
        
        // Start campaign sending immediately
        await updateEmailCampaignStatus(data.campaign.id, 'RUNNING');
        setRunningEmailCampaign({
          id: data.campaign.id,
          contactIds: data.recipientIds,
          currentIndex: 0
        });
        
        fetchEmailCampaigns();
      } else {
        alert(`Erro ao criar campanha: ${data.error}`);
      }
    } catch (err) {
      console.error('Error creating email campaign:', err);
      alert('Erro de conexão.');
    }
  };

  const updateEmailCampaignStatus = async (campaignId, status) => {
    try {
      await fetch('/api/emails/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status })
      });
    } catch (err) {
      console.error('Error updating email campaign status:', err);
    }
  };

  const handleStartEmailCampaign = async (campaign) => {
    // Fetch logs for this campaign to see who already received it
    let processedContactIds = new Set();
    try {
      const detailRes = await fetch(`/api/emails/campaigns?campaignId=${campaign.id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        processedContactIds = new Set(detailData.logs.map(l => l.contactId));
      }
    } catch (e) {
      console.error('Error fetching campaign logs for resume:', e);
    }

    // Get all targets
    let targetIds = [];
    const allTargets = contacts.filter(c => c.email).map(c => c.id);
    const remainingIds = allTargets.filter(id => !processedContactIds.has(id));

    await updateEmailCampaignStatus(campaign.id, 'RUNNING');
    setRunningEmailCampaign({
      id: campaign.id,
      contactIds: remainingIds,
      currentIndex: 0
    });
    fetchEmailCampaigns();
  };

  const handlePauseEmailCampaign = async (campaignId) => {
    await updateEmailCampaignStatus(campaignId, 'PAUSED');
    setRunningEmailCampaign(null);
    fetchEmailCampaigns();
  };

  const handleDeleteEmailCampaign = async (campaignId) => {
    if (!confirm('Deseja excluir permanentemente esta campanha de e-mail?')) return;
    try {
      const res = await fetch(`/api/emails/campaigns?campaignId=${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        if (runningEmailCampaign?.id === campaignId) {
          setRunningEmailCampaign(null);
        }
        fetchEmailCampaigns();
      }
    } catch (err) {
      console.error('Error deleting email campaign:', err);
    }
  };

  async function fetchBroadcasts() {
    setLoadingBroadcasts(true);
    try {
      const res = await fetch('/api/broadcasts');
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data || []);
        
        // If there is a campaign running in the DB, but not in state, resume it!
        const activeDbCampaign = data.find(b => b.status === 'RUNNING');
        if (activeDbCampaign && !runningCampaignRef.current) {
          // Find which contacts haven't been processed yet
          const processedContactIds = new Set(activeDbCampaign.logs.map(l => l.contactId));
          
          // Re-evaluate target list
          let allTargetIds = [];
          if (activeDbCampaign.totalLeads === contacts.length) {
            allTargetIds = contacts.map(c => c.id);
          } else {
            // Fallback: if we can't easily map, we fetch all remaining from DB
            allTargetIds = contacts.map(c => c.id); 
          }

          const remainingIds = allTargetIds.filter(id => !processedContactIds.has(id));

          setRunningCampaign({
            id: activeDbCampaign.id,
            contactIds: remainingIds,
            currentIndex: 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  }

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    } else {
      setSelectedContactIds([]);
    }
  };

  const handleSelectContact = (id) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddTagBulk = async () => {
    const tagName = prompt('Digite o nome da tag a ser adicionada:');
    if (!tagName) return;

    try {
      for (const id of selectedContactIds) {
        const contact = contacts.find(c => c.id === id);
        let tagsList = contact.tags ? contact.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        if (!tagsList.includes(tagName)) {
          tagsList.push(tagName);
          await fetch('/api/chat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: id, tags: tagsList.join(', ') })
          });
        }
      }
      alert('Tags adicionadas com sucesso!');
      fetchContacts();
      setSelectedContactIds([]);
    } catch (err) {
      console.error('Error adding bulk tags:', err);
    }
  };

  const handleRemoveTagBulk = async () => {
    const tagName = prompt('Digite o nome da tag a ser removida:');
    if (!tagName) return;

    try {
      for (const id of selectedContactIds) {
        const contact = contacts.find(c => c.id === id);
        let tagsList = contact.tags ? contact.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        if (tagsList.includes(tagName)) {
          tagsList = tagsList.filter(t => t !== tagName);
          await fetch('/api/chat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId: id, tags: tagsList.join(', ') })
          });
        }
      }
      alert('Tags removidas com sucesso!');
      fetchContacts();
      setSelectedContactIds([]);
    } catch (err) {
      console.error('Error removing bulk tags:', err);
    }
  };

  const handleDeleteBulk = async () => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente os ${selectedContactIds.length} contatos selecionados?`)) return;

    try {
      for (const id of selectedContactIds) {
        await fetch(`/api/chat?contactId=${id}`, { method: 'DELETE' });
      }
      alert('Contatos excluídos com sucesso!');
      fetchContacts();
      setSelectedContactIds([]);
    } catch (err) {
      console.error('Error deleting bulk contacts:', err);
    }
  };

  // Broadcast Actions
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName.trim() || !campaignMessage.trim() || selectedSenderIds.length === 0) {
      alert('Preencha todos os campos obrigatórios e selecione pelo menos um número remetente.');
      return;
    }

    let targetIds = [];
    if (targetType === 'selected') {
      if (selectedContactIds.length === 0) {
        alert('Nenhum contato selecionado. Vá na aba CRM, selecione os contatos e clique em Disparar em Massa.');
        return;
      }
      targetIds = selectedContactIds;
    } else {
      targetIds = contacts.map(c => c.id);
    }

    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          message: campaignMessage,
          flowId: campaignFlowId || null,
          senderIds: selectedSenderIds,
          contactIds: targetIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Save running state
        setRunningCampaign({
          id: data.broadcast.id,
          contactIds: data.contactIds,
          currentIndex: 0
        });

        // Trigger RUNNING status in DB
        await updateCampaignStatus(data.broadcast.id, 'RUNNING');

        // Reset form
        setCampaignName('');
        setCampaignMessage('');
        setCampaignFlowId('');
        setSelectedSenderIds([]);
        
        alert('Campanha iniciada com sucesso! O progresso será exibido abaixo.');
        fetchBroadcasts();
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const updateCampaignStatus = async (id, status) => {
    try {
      await fetch('/api/broadcasts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
    } catch (err) {
      console.error('Error updating campaign status:', err);
    }
  };

  const handleStartCampaign = async (campaign) => {
    // Determine remaining contacts
    const processedContactIds = new Set(campaign.logs.map(l => l.contactId));
    let allTargetIds = [];
    if (campaign.totalLeads === contacts.length) {
      allTargetIds = contacts.map(c => c.id);
    } else {
      allTargetIds = contacts.map(c => c.id); // Fallback mapping
    }
    const remainingIds = allTargetIds.filter(id => !processedContactIds.has(id));

    await updateCampaignStatus(campaign.id, 'RUNNING');
    setRunningCampaign({
      id: campaign.id,
      contactIds: remainingIds,
      currentIndex: 0
    });
    fetchBroadcasts();
  };

  const handlePauseCampaign = async (campaignId) => {
    await updateCampaignStatus(campaignId, 'PAUSED');
    setRunningCampaign(null);
    fetchBroadcasts();
  };

  const handleCancelCampaign = async (campaignId) => {
    await updateCampaignStatus(campaignId, 'CANCELLED');
    setRunningCampaign(null);
    fetchBroadcasts();
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Deseja excluir permanentemente o histórico desta campanha?')) return;
    try {
      const res = await fetch(`/api/broadcasts?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        if (runningCampaign?.id === campaignId) {
          setRunningCampaign(null);
        }
        fetchBroadcasts();
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  // Filter Logic
  const filteredContacts = contacts.filter(c => {
    const nameMatch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = (c.clientPhone || c.id || '').includes(searchQuery);
    
    let statusMatch = true;
    if (statusFilter !== 'ALL') {
      statusMatch = c.status === statusFilter;
    }

    let tagMatch = true;
    if (tagFilter) {
      const tagsList = c.tags ? c.tags.split(',').map(t => t.trim().toLowerCase()) : [];
      tagMatch = tagsList.includes(tagFilter.toLowerCase());
    }

    return (nameMatch || phoneMatch) && statusMatch && tagMatch;
  });

  // Get all unique tags from contacts
  const allTags = Array.from(
    new Set(
      contacts
        .map(c => c.tags ? c.tags.split(',').map(t => t.trim()) : [])
        .flat()
        .filter(Boolean)
    )
  );

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="page-title">CRM &amp; Disparos em Massa</h1>
        <div className="tabs-scrollable" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '4px', borderRadius: '12px', display: 'flex', gap: '4px' }}>
          <button onClick={() => setActiveSubTab('crm')} className={`btn ${activeSubTab === 'crm' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeSubTab === 'crm' ? 'none' : undefined }}>
            👤 Gestão de Leads (CRM)
          </button>
          <button onClick={() => setActiveSubTab('broadcasts')} className={`btn ${activeSubTab === 'broadcasts' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeSubTab === 'broadcasts' ? 'none' : undefined }}>
            📢 Disparos WhatsApp
          </button>
          <button onClick={() => setActiveSubTab('emails')} className={`btn ${activeSubTab === 'emails' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeSubTab === 'emails' ? 'none' : undefined }}>
            ✉️ Disparos E-mail
          </button>
        </div>
      </header>

      <div className="page-body animate-fade-in" style={{ padding: '24px' }}>
        
        {/* =====================================================================
            CRM (CONTACTS LIST) TAB
            ===================================================================== */}
        {activeSubTab === 'crm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Filters Bar */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Buscar por nome ou número..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ maxWidth: '280px', margin: 0 }}
                />
                
                <select 
                  className="form-select" 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ maxWidth: '160px', margin: 0 }}
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="AUTO">Robô Ativo (AUTO)</option>
                  <option value="MANUAL">Humano (MANUAL)</option>
                </select>

                <select 
                  className="form-select" 
                  value={tagFilter} 
                  onChange={(e) => setTagFilter(e.target.value)}
                  style={{ maxWidth: '160px', margin: 0 }}
                >
                  <option value="">Todas as Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Exibindo {filteredContacts.length} de {contacts.length} contatos
              </div>
            </div>

            {/* Bulk Actions Floating Bar */}
            {selectedContactIds.length > 0 && (
              <div className="glass-panel" style={{ 
                padding: '12px 24px', 
                background: 'rgba(59, 130, 246, 0.12)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                animation: 'slide-up 0.2s ease'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#60a5fa' }}>
                  {selectedContactIds.length} contatos selecionados
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={handleAddTagBulk} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    🏷️ Add Tag
                  </button>
                  <button onClick={handleRemoveTagBulk} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    ❌ Remover Tag
                  </button>
                  <button 
                    onClick={() => {
                      setTargetType('selected');
                      setActiveSubTab('broadcasts');
                    }} 
                    className="btn btn-primary" 
                    style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                  >
                    📢 Disparar em Massa
                  </button>
                  <button onClick={handleDeleteBulk} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            )}

            {/* Contacts Table */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              {loadingContacts ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Carregando contatos...</div>
              ) : filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Nenhum contato encontrado com os filtros selecionados.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '16px 20px', width: '40px' }}>
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAll}
                            checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                          />
                        </th>
                        <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Nome / Perfil</th>
                        <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Número WhatsApp</th>
                        <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                        <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Fluxo Ativo</th>
                        <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map(contact => (
                        <tr 
                          key={contact.id} 
                          style={{ 
                            borderBottom: '1px solid var(--border-glass)',
                            background: selectedContactIds.includes(contact.id) ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={() => handleSelectContact(contact.id)}
                            />
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 500 }}>
                            {contact.name || contact.profileName || 'Sem Nome'}
                          </td>
                          <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {contact.clientPhone || contact.id.split(':').pop()}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span className={`badge ${contact.status === 'AUTO' ? 'badge-success' : 'badge-warning'}`}>
                              {contact.status === 'AUTO' ? 'Robô' : 'Manual'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {flows.find(f => f.id === contact.activeFlowId)?.name || <span style={{ color: 'var(--text-muted)' }}>Nenhum</span>}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {contact.tags ? contact.tags.split(',').map(tag => (
                                <span key={tag} className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                  {tag.trim()}
                                </span>
                              )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>}
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
        )}

        {/* =====================================================================
            BROADCAST (MASS SEND) TAB
            ===================================================================== */}
        {activeSubTab === 'broadcasts' && (
          <div className="integration-grid" style={{ alignItems: 'start', gap: '24px' }}>
            
            {/* Left: Create Campaign Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>📢 Criar Nova Campanha de Disparo</h2>
              
              <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nome da Campanha *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ex: Oferta Relâmpago de Segunda" 
                    value={campaignName} 
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mensagem de Disparo *</label>
                  <textarea 
                    className="form-input" 
                    rows="6"
                    placeholder="Escreva sua mensagem...&#10;Dica: Use {{nome}} para personalizar com o nome do cliente.&#10;Spintax: {Oi|Olá|E aí} tudo bem?" 
                    value={campaignMessage} 
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    style={{ resize: 'vertical' }}
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                    O Spintax varia o texto a cada envio para evitar o algoritmo de spam da Meta. Ex: <code>{"{Oi|Olá} {{nome}}!"}</code>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ativar Fluxo de Chatbot (Opcional)</label>
                  <select 
                    className="form-select" 
                    value={campaignFlowId} 
                    onChange={(e) => setCampaignFlowId(e.target.value)}
                  >
                    <option value="">Nenhum (Apenas envia a mensagem de texto)</option>
                    {flows.map(flow => (
                      <option key={flow.id} value={flow.id}>{flow.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Se selecionado, o robô assumirá a conversa na etapa inicial deste fluxo logo após o envio da mensagem.
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Números Remetentes (Rotação de Canais) *</label>
                  {connections.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#ff5c5c', padding: '10px', background: 'rgba(255,92,92,0.05)', borderRadius: '8px', border: '1px solid rgba(255,92,92,0.1)' }}>
                      Nenhum número de WhatsApp ativo encontrado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                      {connections.map(conn => (
                        <label key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', padding: '4px 0' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedSenderIds.includes(conn.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSenderIds(prev => [...prev, conn.id]);
                              } else {
                                setSelectedSenderIds(prev => prev.filter(id => id !== conn.id));
                              }
                            }}
                          />
                          <span>{conn.name} ({conn.phoneNumber})</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Selecione múltiplos números para rotacionar os disparos e reduzir as chances de bloqueio.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Intervalo Mín. (segundos)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="3"
                      value={minDelay} 
                      onChange={(e) => setMinDelay(Math.max(3, parseInt(e.target.value) || 3))}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Intervalo Máx. (segundos)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="4"
                      value={maxDelay} 
                      onChange={(e) => setMaxDelay(Math.max(minDelay + 1, parseInt(e.target.value) || minDelay + 1))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Público Alvo *</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="target" 
                        value="selected" 
                        checked={targetType === 'selected'} 
                        onChange={() => setTargetType('selected')}
                      />
                      <span>Selecionados no CRM ({selectedContactIds.length})</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="target" 
                        value="all" 
                        checked={targetType === 'all'} 
                        onChange={() => setTargetType('all')}
                      />
                      <span>Todos os Contatos ({contacts.length})</span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ justifyContent: 'center', padding: '12px', fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}
                  disabled={runningCampaign !== null}
                >
                  {runningCampaign !== null ? 'Disparo em Andamento...' : '🚀 Iniciar Disparos'}
                </button>
              </form>
            </div>

            {/* Right: History and Progress of Campaigns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Active Running status card */}
              {runningCampaign && (
                <div className="glass-panel" style={{ 
                  padding: '20px', 
                  border: '1px solid rgba(59, 130, 246, 0.4)', 
                  background: 'rgba(59, 130, 246, 0.08)' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="led-indicator active" />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Fila de Disparo Ativa</h3>
                    </div>
                    <button 
                      onClick={() => handlePauseCampaign(runningCampaign.id)} 
                      className="btn" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                    >
                      Pausar
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Processando contato <strong>{runningCampaign.currentIndex}</strong> de <strong>{runningCampaign.contactIds.length}</strong> restantes
                  </div>
                  
                  {/* Progress bar */}
                  {runningCampaign.contactIds.length > 0 && (
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.round((runningCampaign.currentIndex / runningCampaign.contactIds.length) * 100)}%`, 
                          background: '#3b82f6',
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </div>
                  )}
                </div>
              )}

              {/* History list */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Histórico de Campanhas</h3>
                
                {loadingBroadcasts ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Carregando campanhas...</div>
                ) : broadcasts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Nenhum disparo realizado ainda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {broadcasts.map(camp => {
                      const totalProcessed = camp.sentLeads + camp.failedLeads;
                      const pct = camp.totalLeads > 0 ? Math.round((totalProcessed / camp.totalLeads) * 100) : 0;
                      
                      const statusStyles = {
                        'PENDING': { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: 'Aguardando' },
                        'RUNNING': { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', label: 'Enviando' },
                        'PAUSED': { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pausado' },
                        'COMPLETED': { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Finalizado' },
                        'CANCELLED': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Cancelado' }
                      };
                      const st = statusStyles[camp.status] || statusStyles['PENDING'];

                      return (
                        <div 
                          key={camp.id} 
                          style={{ 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{camp.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Criado em {new Date(camp.createdAt).toLocaleDateString('pt-BR')} • {camp.totalLeads} contatos
                              </div>
                            </div>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </div>

                          {/* Progress indicators */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Progresso: {pct}%</span>
                            <span>{camp.sentLeads} enviados • {camp.failedLeads} falhas</span>
                          </div>
                          
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: camp.status === 'COMPLETED' ? '#4ade80' : camp.status === 'CANCELLED' ? '#f87171' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
                            {camp.status === 'PAUSED' && (
                              <button 
                                onClick={() => handleStartCampaign(camp)} 
                                className="btn btn-primary" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                disabled={runningCampaign !== null}
                              >
                                Retomar
                              </button>
                            )}
                            {camp.status === 'RUNNING' && (
                              <button 
                                onClick={() => handlePauseCampaign(camp.id)} 
                                className="btn" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                              >
                                Pausar
                              </button>
                            )}
                            {(camp.status === 'RUNNING' || camp.status === 'PAUSED') && (
                              <button 
                                onClick={() => handleCancelCampaign(camp.id)} 
                                className="btn" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              >
                                Cancelar
                              </button>
                            )}
                            {(camp.status === 'COMPLETED' || camp.status === 'CANCELLED' || camp.status === 'PENDING') && (
                              <button 
                                onClick={() => handleDeleteCampaign(camp.id)} 
                                className="btn" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* =====================================================================
            EMAIL MARKETING TAB
            ===================================================================== */}
        {activeSubTab === 'emails' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Configuration Panel */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚙️</span> Configuração do Provedor de E-mail
              </h3>
              
              <form onSubmit={handleSaveEmailConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Provedor de E-mail</label>
                  <select 
                    className="form-select" 
                    value={emailProvider} 
                    onChange={(e) => setEmailProvider(e.target.value)}
                    style={{ margin: 0, width: '100%' }}
                  >
                    <option value="resend">Resend (3.000 grátis/mês)</option>
                    <option value="brevo">Brevo / Sendinblue (300 grátis/dia)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Chave de API (API Key)</label>
                  <input 
                    type="password" 
                    placeholder="Cole a chave de API..." 
                    className="form-input" 
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    style={{ margin: 0, width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>E-mail do Remetente (Verificado)</label>
                  <input 
                    type="email" 
                    placeholder="ex: contato@seu-dominio.com" 
                    className="form-input" 
                    value={emailSender}
                    onChange={(e) => setEmailSender(e.target.value)}
                    style={{ margin: 0, width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '38px' }}>
                    Salvar Configurações
                  </button>
                </div>
              </form>

              {/* Send Test Email Section */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Enviar E-mail de Teste:</span>
                <input 
                  type="email" 
                  placeholder="Seu e-mail de teste..." 
                  className="form-input"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  style={{ maxWidth: '240px', margin: 0, height: '32px', fontSize: '0.78rem' }}
                />
                <button 
                  type="button" 
                  onClick={handleSendTestEmail} 
                  className="btn btn-secondary" 
                  style={{ height: '32px', padding: '0 16px', fontSize: '0.75rem' }}
                  disabled={sendingTestEmail}
                >
                  {sendingTestEmail ? 'Enviando...' : 'Testar Conexão'}
                </button>
              </div>
            </div>

            {/* 2. Create Campaign & Campaigns History */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
              
              {/* Creator Form */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✉️</span> Nova Campanha de E-mail
                </h3>

                <form onSubmit={handleCreateEmailCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nome da Campanha (Interno)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Pós-Venda - Clientes Pix" 
                      className="form-input"
                      value={emailCampaignName}
                      onChange={(e) => setEmailCampaignName(e.target.value)}
                      style={{ margin: 0, width: '100%' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Assunto do E-mail</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Olá {primeiro_nome}, seu acesso foi liberado! 🎉" 
                      className="form-input"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      style={{ margin: 0, width: '100%' }}
                      required
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corpo do E-mail (HTML Suportado)</label>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Variáveis: <code>{`{nome}`}</code>, <code>{`{primeiro_nome}`}</code>, <code>{`{email}`}</code></span>
                    </div>
                    <textarea 
                      placeholder="Escreva a mensagem em texto ou HTML..." 
                      className="form-textarea"
                      rows={8}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      style={{ margin: 0, width: '100%', fontFamily: 'monospace', fontSize: '0.78rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Alvo do Disparo</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="radio" name="emailTarget" checked={emailTargetType === 'all'} onChange={() => setEmailTargetType('all')} />
                        Todos os Leads
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="radio" name="emailTarget" checked={emailTargetType === 'tag'} onChange={() => setEmailTargetType('tag')} />
                        Filtrar por Tag
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="radio" name="emailTarget" checked={emailTargetType === 'selected'} onChange={() => setEmailTargetType('selected')} />
                        Contatos Selecionados ({selectedContactIds.length})
                      </label>
                    </div>

                    {emailTargetType === 'tag' && (
                      <select 
                        className="form-select"
                        value={emailTagFilter}
                        onChange={(e) => setEmailTagFilter(e.target.value)}
                        style={{ margin: 0, width: '100%', maxWidth: '280px' }}
                        required
                      >
                        <option value="">Selecione uma tag...</option>
                        {allTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700 }}
                    disabled={runningEmailCampaign !== null}
                  >
                    ✉️ Criar e Iniciar Disparos
                  </button>
                </form>
              </div>

              {/* History List */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📊</span> Histórico de Campanhas
                </h3>

                {loadingEmailCampaigns && emailCampaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando campanhas...</div>
                ) : emailCampaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhuma campanha de e-mail criada ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {emailCampaigns.map((camp) => {
                      const pct = camp.totalRecipients > 0 ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalRecipients) * 100) : 0;
                      
                      const statusStyles = {
                        'PENDING': { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: 'Aguardando' },
                        'RUNNING': { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', label: 'Enviando' },
                        'PAUSED': { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Pausado' },
                        'COMPLETED': { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', label: 'Finalizado' },
                        'FAILED': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'Falhou' }
                      };
                      const st = statusStyles[camp.status] || statusStyles['PENDING'];

                      return (
                        <div 
                          key={camp.id} 
                          style={{ 
                            padding: '16px', 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--border-glass)', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{camp.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Assunto: <span style={{ color: 'var(--text-secondary)' }}>{camp.subject}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Criada em {new Date(camp.createdAt).toLocaleDateString('pt-BR')} • {camp.totalRecipients} destinatários
                              </div>
                            </div>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>Progresso: {pct}%</span>
                            <span>{camp.sentCount} enviados • {camp.failedCount} falhas</span>
                          </div>
                          
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: camp.status === 'COMPLETED' ? '#4ade80' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
                            {camp.status === 'PAUSED' && (
                              <button 
                                onClick={() => handleStartEmailCampaign(camp)} 
                                className="btn btn-primary" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                disabled={runningEmailCampaign !== null}
                              >
                                Retomar
                              </button>
                            )}
                            {camp.status === 'RUNNING' && (
                              <button 
                                onClick={() => handlePauseEmailCampaign(camp.id)} 
                                className="btn" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
                              >
                                Pausar
                              </button>
                            )}
                            {(camp.status === 'COMPLETED' || camp.status === 'FAILED' || camp.status === 'PENDING' || camp.status === 'PAUSED') && (
                              <button 
                                onClick={() => handleDeleteEmailCampaign(camp.id)} 
                                className="btn" 
                                style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)' }}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
