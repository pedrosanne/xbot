'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ==========================================
// HELPER: Generate a unique short ID
// ==========================================
const uid = () => Math.random().toString(36).substr(2, 8);

export default function AgentsPage() {
  const [activeTab, setActiveTab] = useState('whatsapp');

  // ==========================================
  // STATE: WhatsApp & API Settings
  // ==========================================
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState('antigravity_token_123');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');

  // ==========================================
  // STATE: AI Agents
  // ==========================================
  const [agents, setAgents] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');
  const [agentModel, setAgentModel] = useState('gemini-2.5-flash');
  const [agentTemperature, setAgentTemperature] = useState(0.7);
  const [agentIsActive, setAgentIsActive] = useState(false);
  const [agentGeminiApiKey, setAgentGeminiApiKey] = useState('');
  const [agentElevenLabsApiKey, setAgentElevenLabsApiKey] = useState('');
  const [agentElevenLabsVoiceId, setAgentElevenLabsVoiceId] = useState('');
  const [agentConnectionId, setAgentConnectionId] = useState('');
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);

  // ==========================================
  // STATE: Chatbot Flows (List)
  // ==========================================
  const [flows, setFlows] = useState([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ==========================================
  // STATE: Visual Flow Builder Canvas
  // ==========================================
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [flowTrigger, setFlowTrigger] = useState('keyword');
  const [flowKeywords, setFlowKeywords] = useState('');
  const [flowAgentId, setFlowAgentId] = useState(null);
  const [flowConnectionId, setFlowConnectionId] = useState('');
  const [nodes, setNodes] = useState([]); // { id, x, y, text, media:{type,url,caption}, buttons:[] }
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // States for visual drag-to-connect
  const [connectingFrom, setConnectingFrom] = useState(null); // { nodeId, buttonId }
  const [connectingMousePos, setConnectingMousePos] = useState(null); // { x, y }

  // Canvas state
  const canvasRef = useRef(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 60, y: 80 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState(null); // { id, offsetX, offsetY }

  // ==========================================
  // STATE: Vapi.ai & Calls
  // ==========================================
  const [vapiApiKey, setVapiApiKey] = useState('');
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState('');
  const [vapiAssistantId, setVapiAssistantId] = useState('');
  const [vapiSaving, setVapiSaving] = useState(false);
  const [vapiSuccess, setVapiSuccess] = useState(false);
  const [calls, setCalls] = useState([]);
  const [callPhone, setCallPhone] = useState('');
  const [callFirstMsg, setCallFirstMsg] = useState('');
  const [callCustomPrompt, setCallCustomPrompt] = useState('');
  const [callMaxDuration, setCallMaxDuration] = useState('300');
  const [callLoading, setCallLoading] = useState(false);
  const [callResult, setCallResult] = useState(null);
  const [expandedCallId, setExpandedCallId] = useState(null);

  // ==========================================
  // STATE: WhatsApp Connections
  // ==========================================
  const [connections, setConnections] = useState([]);
  const [connectionName, setConnectionName] = useState('');
  const [connectionPhoneNumber, setConnectionPhoneNumber] = useState('');
  const [connectionToken, setConnectionToken] = useState('');
  const [connectionPhoneId, setConnectionPhoneId] = useState('');
  const [connectionVerifyToken, setConnectionVerifyToken] = useState('antigravity_token_123');
  const [connectionIsActive, setConnectionIsActive] = useState(true);
  const [editingConnectionId, setEditingConnectionId] = useState(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState(null);
  const [testResults, setTestResults] = useState({});

  // ==========================================
  // LIFECYCLE & DATA FETCHING
  // ==========================================
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setCallbackUrl(`${window.location.protocol}//${window.location.host}/api/webhook`);
    }
    fetchSettings();
    fetchConnections();
    fetchAgents();
    fetchFlows();
    fetchCalls();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setWhatsappToken(data.whatsappToken || '');
        setWhatsappPhoneId(data.whatsappPhoneId || '');
        setWhatsappVerifyToken(data.whatsappVerifyToken || 'antigravity_token_123');
        setGeminiApiKey(data.geminiApiKey || '');
        setElevenLabsApiKey(data.elevenLabsApiKey || '');
        setElevenLabsVoiceId(data.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM');
        setVapiApiKey(data.vapiApiKey || '');
        setVapiPhoneNumberId(data.vapiPhoneNumberId || '');
        setVapiAssistantId(data.vapiAssistantId || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) setConnections(await res.json());
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  const resetConnectionForm = () => {
    setEditingConnectionId(null);
    setConnectionName('');
    setConnectionPhoneNumber('');
    setConnectionToken('');
    setConnectionPhoneId('');
    setConnectionVerifyToken('antigravity_token_123');
    setConnectionIsActive(true);
    setShowConnectionForm(false);
  };

  const handleConnectionSubmit = async (e) => {
    e.preventDefault();
    if (!connectionName.trim() || !connectionPhoneId.trim()) return;
    setConnectionLoading(true);
    const payload = {
      name: connectionName,
      phoneNumber: connectionPhoneNumber,
      whatsappToken: connectionToken,
      whatsappPhoneId: connectionPhoneId,
      whatsappVerifyToken: connectionVerifyToken,
      isActive: connectionIsActive
    };
    try {
      let res;
      if (editingConnectionId) {
        res = await fetch('/api/connections', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingConnectionId, ...payload })
        });
      } else {
        res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        resetConnectionForm();
        fetchConnections();
      }
    } catch (err) {
      console.error('Error saving connection:', err);
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleToggleConnectionActive = async (conn) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: conn.id,
          name: conn.name,
          phoneNumber: conn.phoneNumber,
          whatsappToken: conn.whatsappToken,
          whatsappPhoneId: conn.whatsappPhoneId,
          whatsappVerifyToken: conn.whatsappVerifyToken,
          isActive: !conn.isActive
        })
      });
      if (res.ok) fetchConnections();
    } catch (err) {
      console.error('Error toggling connection active state:', err);
    }
  };

  const handleEditConnection = (conn) => {
    setEditingConnectionId(conn.id);
    setConnectionName(conn.name);
    setConnectionPhoneNumber(conn.phoneNumber);
    setConnectionToken(conn.whatsappToken);
    setConnectionPhoneId(conn.whatsappPhoneId);
    setConnectionVerifyToken(conn.whatsappVerifyToken);
    setConnectionIsActive(conn.isActive);
    setShowConnectionForm(true);
  };

  const handleDeleteConnection = async (id) => {
    if (!confirm('Deseja realmente excluir esta conexão?')) return;
    try {
      const res = await fetch(`/api/connections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchConnections();
        if (editingConnectionId === id) resetConnectionForm();
      }
    } catch (err) {
      console.error('Error deleting connection:', err);
    }
  };

  const handleTestConnection = async (conn) => {
    setTestingConnectionId(conn.id);
    setTestResults(prev => ({ ...prev, [conn.id]: { loading: true } }));
    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneId: conn.whatsappPhoneId,
          whatsappToken: conn.whatsappToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults(prev => ({ ...prev, [conn.id]: { success: true, message: 'Conectado!' } }));
      } else {
        setTestResults(prev => ({ ...prev, [conn.id]: { success: false, message: data.error || 'Erro na verificação' } }));
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [conn.id]: { success: false, message: 'Erro de conexão' } }));
    } finally {
      setTestingConnectionId(null);
      // clear after 5s
      setTimeout(() => {
        setTestResults(prev => {
          const next = { ...prev };
          delete next[conn.id];
          return next;
        });
      }, 5000);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);
    setSettingsError('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappToken, whatsappPhoneId, whatsappVerifyToken, geminiApiKey, elevenLabsApiKey, elevenLabsVoiceId })
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        setSettingsError('Falha ao atualizar configurações.');
      }
    } catch (err) {
      setSettingsError('Erro na conexão com a API.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // ==========================================
  // METHODS: AI AGENTS
  // ==========================================
  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) setAgents(await res.json());
    } catch (err) { console.error('Error fetching agents:', err); }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    if (!agentName.trim()) return;
    setAgentLoading(true);
    const payload = {
      name: agentName,
      description: agentDescription,
      systemPrompt: agentSystemPrompt,
      model: agentModel,
      temperature: parseFloat(agentTemperature),
      isActive: agentIsActive,
      geminiApiKey: agentGeminiApiKey,
      elevenLabsApiKey: agentElevenLabsApiKey,
      elevenLabsVoiceId: agentElevenLabsVoiceId,
      connectionId: agentConnectionId || null
    };
    try {
      let res;
      if (editingAgentId) {
        res = await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingAgentId, ...payload }) });
      } else {
        res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) { resetAgentForm(); fetchAgents(); }
    } catch (err) { console.error('Error saving agent:', err); }
    finally { setAgentLoading(false); }
  };

  const handleToggleAgentActive = async (agent) => {
    try {
      const res = await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, name: agent.name, description: agent.description, systemPrompt: agent.systemPrompt, model: agent.model, temperature: agent.temperature, isActive: !agent.isActive, connectionId: agent.connectionId }) });
      if (res.ok) fetchAgents();
    } catch (err) { console.error('Error toggling agent:', err); }
  };

  const handleEditAgent = (agent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentDescription(agent.description);
    setAgentSystemPrompt(agent.systemPrompt);
    setAgentModel(agent.model);
    setAgentTemperature(agent.temperature);
    setAgentIsActive(agent.isActive);
    setAgentGeminiApiKey(agent.geminiApiKey || '');
    setAgentElevenLabsApiKey(agent.elevenLabsApiKey || '');
    setAgentElevenLabsVoiceId(agent.elevenLabsVoiceId || '');
    setAgentConnectionId(agent.connectionId || '');
    setShowAgentForm(true);
  };

  const handleDeleteAgent = async (id) => {
    if (!confirm('Deseja realmente excluir este agente?')) return;
    try {
      const res = await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
      if (res.ok) { fetchAgents(); if (editingAgentId === id) resetAgentForm(); }
    } catch (err) { console.error('Error deleting agent:', err); }
  };

  const resetAgentForm = () => {
    setEditingAgentId(null);
    setAgentName('');
    setAgentDescription('');
    setAgentSystemPrompt('');
    setAgentModel('gemini-2.5-flash');
    setAgentTemperature(0.7);
    setAgentIsActive(false);
    setAgentGeminiApiKey('');
    setAgentElevenLabsApiKey('');
    setAgentElevenLabsVoiceId('');
    setAgentConnectionId('');
    setShowAgentForm(false);
  };

  // ==========================================
  // METHODS: CHATBOT FLOWS
  // ==========================================
  // ==========================================
  // METHODS: CALLS
  // ==========================================
  const fetchCalls = async () => {
    try {
      const res = await fetch('/api/calls');
      if (res.ok) setCalls(await res.json());
    } catch (err) { console.error('Error fetching calls:', err); }
  };

  const handleSaveVapiSettings = async () => {
    setVapiSaving(true);
    setVapiSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappToken, whatsappPhoneId, whatsappVerifyToken, geminiApiKey, elevenLabsApiKey, elevenLabsVoiceId, vapiApiKey, vapiPhoneNumberId, vapiAssistantId }),
      });
      if (res.ok) { setVapiSuccess(true); setTimeout(() => setVapiSuccess(false), 3000); }
    } catch (err) { console.error('Error saving Vapi settings:', err); }
    finally { setVapiSaving(false); }
  };

  const handleMakeCall = async () => {
    if (!callPhone.trim()) { alert('Informe o número de telefone.'); return; }
    setCallLoading(true);
    setCallResult(null);
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: callPhone,
          firstMessage: callFirstMsg || undefined,
          systemPrompt: callCustomPrompt || undefined,
          maxDuration: callMaxDuration || '300',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCallResult({ success: true, message: 'Chamada iniciada! A IA está ligando...' });
        setCallPhone(''); setCallFirstMsg(''); setCallCustomPrompt('');
        fetchCalls();
        setTimeout(() => setCallResult(null), 5000);
      } else {
        setCallResult({ success: false, message: data.error || 'Erro ao iniciar chamada.' });
      }
    } catch (err) {
      setCallResult({ success: false, message: 'Erro de conexão.' });
    } finally { setCallLoading(false); }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows');
      if (res.ok) setFlows(await res.json());
    } catch (err) { console.error('Error fetching flows:', err); }
  };

  const handleDeleteFlow = async (id) => {
    if (!confirm('Deseja realmente excluir este fluxo?')) return;
    try {
      const res = await fetch(`/api/flows?id=${id}`, { method: 'DELETE' });
      if (res.ok) { fetchFlows(); if (editingFlowId === id) closeBuilder(); }
    } catch (err) { console.error('Error deleting flow:', err); }
  };

  const handleToggleFlowActive = async (flow) => {
    try {
      const res = await fetch('/api/flows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: flow.id, isActive: !flow.isActive }) });
      if (res.ok) fetchFlows();
    } catch (err) { console.error('Error toggling flow:', err); }
  };

  // ==========================================
  // FLOW BUILDER: Open / Close / Save
  // ==========================================
  const openNewFlow = () => {
    setEditingFlowId(null);
    setFlowName('');
    setFlowTrigger('keyword');
    setFlowKeywords('');
    setFlowAgentId(null);
    setFlowConnectionId('');
    const startNode = {
      id: 'boas_vindas',
      x: 300,
      y: 100,
      text: 'Olá! Seja bem-vindo ao nosso atendimento. Escolha uma opção abaixo:',
      media: null,
      buttons: [
        { id: `btn_${uid()}`, title: 'Falar com IA 🤖', action: 'transfer_to_ia', targetStepId: '' },
        { id: `btn_${uid()}`, title: 'Atendimento Humano 👤', action: 'transfer_to_human', targetStepId: '' },
      ],
    };
    setNodes([startNode]);
    setSelectedNodeId(null);
    setCanvasOffset({ x: 60, y: 80 });
    setCanvasZoom(1);
    setBuilderOpen(true);
  };

  const openEditFlow = (flow) => {
    setEditingFlowId(flow.id);
    setFlowName(flow.name);
    setFlowTrigger(flow.trigger);
    setFlowKeywords(flow.keywords);
    setFlowAgentId(flow.agentId || null);
    setFlowConnectionId(flow.connectionId || '');
    let parsed = [];
    try { parsed = JSON.parse(flow.steps || '[]'); } catch { parsed = []; }
    // Add default x/y if missing
    const withPositions = parsed.map((s, i) => ({
      ...s,
      x: s.x ?? 100 + (i % 3) * 300,
      y: s.y ?? 100 + Math.floor(i / 3) * 250,
      media: s.media || null,
      buttons: s.buttons || [],
    }));
    setNodes(withPositions);
    setSelectedNodeId(null);
    setCanvasOffset({ x: 60, y: 80 });
    setCanvasZoom(1);
    setBuilderOpen(true);
  };

  const loadHybridTemplate = () => {
    setFlowName('Fluxo Híbrido Automático');
    setFlowTrigger('welcome');
    setFlowKeywords('');
    const templateNodes = [
      {
        id: 'step_boas_vindas', x: 300, y: 80,
        text: 'Olá! Como posso te ajudar hoje?\nEscolha uma opção:',
        media: null,
        buttons: [
          { id: `btn_${uid()}`, title: 'Assistente IA 🤖', action: 'transfer_to_ia', targetStepId: '' },
          { id: `btn_${uid()}`, title: 'Ver Serviços 💼', action: 'go_to_step', targetStepId: 'step_servicos' },
          { id: `btn_${uid()}`, title: 'Falar c/ Atendente', action: 'transfer_to_human', targetStepId: '' },
        ],
      },
      {
        id: 'step_servicos', x: 300, y: 380,
        text: 'Nossos serviços:\n1. Chatbots personalizados\n2. Integração de IA\n3. Sistemas sob medida',
        media: null,
        buttons: [
          { id: `btn_${uid()}`, title: 'Voltar ao Menu', action: 'go_to_step', targetStepId: 'step_boas_vindas' },
          { id: `btn_${uid()}`, title: 'Mais info (IA)', action: 'transfer_to_ia', targetStepId: '' },
        ],
      },
    ];
    setNodes(templateNodes);
    setSelectedNodeId(null);
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setEditingFlowId(null);
    setNodes([]);
    setSelectedNodeId(null);
    setIsFullScreen(false);
  };

  const handleSaveFlow = async () => {
    if (!flowName.trim()) { alert('Preencha o nome do fluxo.'); return; }
    if (nodes.length === 0) { alert('Adicione pelo menos uma etapa ao fluxo.'); return; }

    setFlowLoading(true);
    const payload = {
      name: flowName,
      trigger: flowTrigger,
      keywords: flowKeywords,
      steps: nodes,
      isActive: true,
      agentId: flowAgentId,
      connectionId: flowConnectionId || null
    };

    try {
      let res;
      if (editingFlowId) {
        res = await fetch('/api/flows', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingFlowId, ...payload }) });
      } else {
        res = await fetch('/api/flows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      if (res.ok) { closeBuilder(); fetchFlows(); }
      else { const err = await res.json(); alert(`Erro: ${err.error || 'Desconhecido'}`); }
    } catch (err) { console.error('Error saving flow:', err); }
    finally { setFlowLoading(false); }
  };

  // ==========================================
  // FLOW BUILDER: Node CRUD
  // ==========================================
  const addNode = () => {
    const newId = `etapa_${uid()}`;
    // Position near center of viewport
    const cx = (-canvasOffset.x + 400) / canvasZoom;
    const cy = (-canvasOffset.y + 300) / canvasZoom;
    setNodes(prev => [...prev, { id: newId, x: cx, y: cy, text: 'Nova etapa...', media: null, buttons: [] }]);
    setSelectedNodeId(newId);
  };

  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const duplicateNode = (nodeId) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newId = `etapa_${uid()}`;

    // Deep clone media if present
    const duplicatedMedia = nodeToDuplicate.media 
      ? { ...nodeToDuplicate.media }
      : null;

    // Deep clone buttons with new unique button IDs to avoid conflicts
    const duplicatedButtons = (nodeToDuplicate.buttons || []).map(btn => ({
      ...btn,
      id: `btn_${uid()}` // Regenerate button IDs
    }));

    const duplicatedNode = {
      ...nodeToDuplicate,
      id: newId,
      // Slightly offset coordinates to prevent perfect overlap
      x: nodeToDuplicate.x + 50,
      y: nodeToDuplicate.y + 50,
      media: duplicatedMedia,
      buttons: duplicatedButtons,
    };

    setNodes(prev => [...prev, duplicatedNode]);
    setSelectedNodeId(newId);
  };

  const updateNode = (nodeId, updates) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const updateNodeId = (oldId, newId) => {
    const cleanId = newId.replace(/\s+/g, '_').toLowerCase();
    if (!cleanId) return;
    // Update the node's id and all references
    setNodes(prev => prev.map(n => {
      let updated = { ...n };
      if (n.id === oldId) updated.id = cleanId;
      // Update button references
      updated.buttons = (n.buttons || []).map(b => ({
        ...b,
        targetStepId: b.targetStepId === oldId ? cleanId : b.targetStepId,
      }));
      return updated;
    }));
    if (selectedNodeId === oldId) setSelectedNodeId(cleanId);
  };

  const addButtonToNode = (nodeId) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const btns = n.buttons || [];
      if (btns.some(b => b.action === 'open_url')) {
        alert('Mensagens com botão de link (URL) podem conter apenas 1 botão.');
        return n;
      }
      if (btns.length >= 3) { alert('Máximo 3 botões por mensagem.'); return n; }
      return { ...n, buttons: [...btns, { id: `btn_${uid()}`, title: 'Novo Botão', action: 'go_to_step', targetStepId: '' }] };
    }));
  };

  const updateButton = (nodeId, btnIndex, field, value) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const btns = [...(n.buttons || [])];
      
      if (field === 'action' && value === 'open_url' && btns.length > 1) {
        alert('O WhatsApp permite apenas 1 botão de link por mensagem. Remova os outros botões para usar esta ação.');
        return n;
      }
      
      btns[btnIndex] = { ...btns[btnIndex], [field]: value };
      
      if (field === 'action' && value === 'open_url') {
        btns[btnIndex].url = btns[btnIndex].url || '';
        btns[btnIndex].targetStepId = ''; // Clear targetStepId for link button
      }
      
      return { ...n, buttons: btns };
    }));
  };

  const removeButton = (nodeId, btnIndex) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const btns = [...(n.buttons || [])];
      btns.splice(btnIndex, 1);
      return { ...n, buttons: btns };
    }));
  };

  const handleMediaUpload = async (e, nodeId, mediaType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Falha no upload');
      }

      const data = await res.json();
      if (data.success && data.url) {
        const currentNode = nodes.find(n => n.id === nodeId);
        updateNode(nodeId, {
          media: {
            type: mediaType,
            url: data.url,
            caption: currentNode?.media?.caption || ''
          }
        });
      } else {
        alert('Erro ao realizar upload do arquivo.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Ocorreu um erro ao enviar o arquivo.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // ==========================================
  // CANVAS: Pan & Zoom & Node Drag
  // ==========================================
  const handleCanvasMouseDown = (e) => {
    // Only pan if clicking on background (not a node)
    if (e.target.closest('.flow-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };

  const handleCanvasMouseMove = useCallback((e) => {
    if (isPanning) {
      setCanvasOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (dragNode) {
      const wrapperRect = canvasRef.current?.getBoundingClientRect();
      if (!wrapperRect) return;
      const mx = (e.clientX - wrapperRect.left - canvasOffset.x) / canvasZoom - dragNode.offsetX;
      const my = (e.clientY - wrapperRect.top - canvasOffset.y) / canvasZoom - dragNode.offsetY;
      updateNode(dragNode.id, { x: mx, y: my });
    }
    if (connectingFrom) {
      const wrapperRect = canvasRef.current?.getBoundingClientRect();
      if (!wrapperRect) return;
      const mx = (e.clientX - wrapperRect.left - canvasOffset.x) / canvasZoom;
      const my = (e.clientY - wrapperRect.top - canvasOffset.y) / canvasZoom;
      setConnectingMousePos({ x: mx, y: my });
    }
  }, [isPanning, panStart, dragNode, canvasOffset, canvasZoom, connectingFrom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragNode(null);
    setConnectingFrom(null);
    setConnectingMousePos(null);
  }, []);

  const handlePortMouseDown = (e, nodeId, buttonId = null) => {
    e.stopPropagation();
    e.preventDefault();
    const wrapperRect = canvasRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const mx = (e.clientX - wrapperRect.left - canvasOffset.x) / canvasZoom;
    const my = (e.clientY - wrapperRect.top - canvasOffset.y) / canvasZoom;
    setConnectingFrom({ nodeId, buttonId });
    setConnectingMousePos({ x: mx, y: my });
  };

  const handleNodeMouseUp = (e, targetNodeId) => {
    if (!connectingFrom) return;
    e.stopPropagation();

    if (targetNodeId !== connectingFrom.nodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id !== connectingFrom.nodeId) return n;

        if (connectingFrom.buttonId) {
          // Update button connection
          const updatedButtons = (n.buttons || []).map(b => {
            if (b.id !== connectingFrom.buttonId) return b;
            return { ...b, action: 'go_to_step', targetStepId: targetNodeId };
          });
          return { ...n, buttons: updatedButtons };
        } else {
          // Update direct fallback connection
          return { ...n, nextStepId: targetNodeId };
        }
      }));
    }

    setConnectingFrom(null);
    setConnectingMousePos(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    };
  }, [handleCanvasMouseMove, handleCanvasMouseUp]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setCanvasZoom(prev => Math.min(2, Math.max(0.3, prev + delta)));
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const wrapperRect = canvasRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const mx = (e.clientX - wrapperRect.left - canvasOffset.x) / canvasZoom;
    const my = (e.clientY - wrapperRect.top - canvasOffset.y) / canvasZoom;
    setDragNode({ id: nodeId, offsetX: mx - node.x, offsetY: my - node.y });
    setSelectedNodeId(nodeId);
  };

  const fitAllNodes = () => {
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + 260));
    const maxY = Math.max(...nodes.map(n => n.y + 180));
    const wrapperRect = canvasRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const w = wrapperRect.width;
    const h = wrapperRect.height;
    const range = { w: maxX - minX + 80, h: maxY - minY + 80 };
    const zoom = Math.min(w / range.w, h / range.h, 1.2);
    setCanvasZoom(Math.max(0.3, Math.min(zoom, 1.5)));
    setCanvasOffset({ x: -minX * zoom + 40, y: -minY * zoom + 60 });
  };

  const getConnections = () => {
    const conns = [];
    for (const node of nodes) {
      // 1. Button connections
      const btns = node.buttons || [];
      btns.forEach((btn, bi) => {
        if (btn.action === 'go_to_step' && btn.targetStepId) {
          const target = nodes.find(n => n.id === btn.targetStepId);
          if (target) {
            const h = getNodeHeight(node);
            const btnY = node.y + (h - (btns.length - bi) * 28) + 14;
            conns.push({
              type: 'button',
              fromId: node.id,
              toId: target.id,
              fromX: node.x + 260,
              fromY: btnY,
              toX: target.x + 130,
              toY: target.y
            });
          }
        }
      });
      // 2. Direct/fallback connection
      if (node.nextStepId) {
        const target = nodes.find(n => n.id === node.nextStepId);
        if (target) {
          conns.push({
            type: 'direct',
            fromId: node.id,
            toId: target.id,
            fromX: node.x + 130,
            fromY: node.y + getNodeHeight(node),
            toX: target.x + 130,
            toY: target.y
          });
        }
      }
    }
    return conns;
  };

  const getPortPosition = (nodeId, buttonId = null) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    if (buttonId) {
      const bi = (node.buttons || []).findIndex(b => b.id === buttonId);
      if (bi === -1) return null;
      const h = getNodeHeight(node);
      const btnY = node.y + (h - (node.buttons.length - bi) * 28) + 14;
      return { x: node.x + 260, y: btnY };
    } else {
      return { x: node.x + 130, y: node.y + getNodeHeight(node) };
    }
  };

  const getNodeHeight = (node) => {
    let h = 60; // header + body minimum
    if (node.text) h += Math.min(node.text.length / 3, 60);
    if (node.media) h += 28;
    h += (node.buttons || []).length * 28;
    return Math.max(h, 100);
  };

  // ==========================================
  // MINIMAP
  // ==========================================
  const renderMinimap = () => {
    if (nodes.length === 0) return null;
    const allX = nodes.map(n => n.x);
    const allY = nodes.map(n => n.y);
    const minX = Math.min(...allX) - 40;
    const minY = Math.min(...allY) - 40;
    const maxX = Math.max(...allX) + 300;
    const maxY = Math.max(...allY) + 220;
    const rangeW = maxX - minX || 1;
    const rangeH = maxY - minY || 1;
    const scale = Math.min(160 / rangeW, 100 / rangeH);

    const wrapperRect = canvasRef.current?.getBoundingClientRect();
    const vw = wrapperRect ? wrapperRect.width : 800;
    const vh = wrapperRect ? wrapperRect.height : 600;

    return (
      <div className="flow-minimap">
        {nodes.map(n => (
          <div key={n.id} className="flow-minimap-node" style={{
            left: (n.x - minX) * scale,
            top: (n.y - minY) * scale,
            width: 260 * scale,
            height: 60 * scale,
            background: selectedNodeId === n.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
        <div className="flow-minimap-viewport" style={{
          left: (-canvasOffset.x / canvasZoom - minX) * scale,
          top: (-canvasOffset.y / canvasZoom - minY) * scale,
          width: (vw / canvasZoom) * scale,
          height: (vh / canvasZoom) * scale,
        }} />
      </div>
    );
  };

  // ==========================================
  // COPY HELPER
  // ==========================================
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  };

  // ==========================================
  // SELECTED NODE reference
  // ==========================================
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // ==========================================
  // MEDIA TYPE ICONS
  // ==========================================
  const mediaIcons = {
    image: '🖼️',
    video: '🎬',
    audio: '🔊',
    document: '📄',
    link: '🔗',
  };

  // ==========================================
  // FLOW BUILDER ELEMENT (For React Portal Fullscreen support)
  // ==========================================
  const flowBuilderEl = activeTab === 'flows' && builderOpen ? (
    <div 
      style={isFullScreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#0b0f19',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxSizing: 'border-box'
      } : {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '16px',
        minHeight: 0
      }}
    >
      {/* Builder Top Config */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '10px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '16px', 
          flexWrap: 'nowrap',
          minHeight: '48px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          {/* Flow Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 250px', minWidth: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Fluxo:</span>
            <input 
              type="text" 
              className="form-input" 
              style={{ padding: '6px 10px', fontSize: '0.82rem', height: '32px', margin: 0 }} 
              placeholder="Ex: Boas Vindas" 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)} 
            />
          </div>

          {/* Trigger Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 180px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ativação:</span>
            <select 
              className="form-select" 
              style={{ padding: '6px 10px', fontSize: '0.82rem', height: '32px', margin: 0 }} 
              value={flowTrigger} 
              onChange={(e) => setFlowTrigger(e.target.value)}
            >
              <option value="keyword">Palavra-chave</option>
              <option value="welcome">Welcome Flow</option>
            </select>
          </div>

          {/* Keywords input (only if keyword activation is selected) */}
          {flowTrigger === 'keyword' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px', minWidth: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Palavras:</span>
              <input 
                type="text" 
                className="form-input" 
                style={{ padding: '6px 10px', fontSize: '0.82rem', height: '32px', margin: 0 }} 
                placeholder="oi, menu, ajuda" 
                value={flowKeywords} 
                onChange={(e) => setFlowKeywords(e.target.value)} 
              />
            </div>
          )}

          {/* AI Agent Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 220px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Agente IA:</span>
            <select 
              className="form-select" 
              style={{ padding: '6px 10px', fontSize: '0.82rem', height: '32px', margin: 0 }} 
              value={flowAgentId || ''} 
              onChange={(e) => setFlowAgentId(e.target.value || null)}
            >
              <option value="">Nenhum (Sem IA)</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp Connection Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 220px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Conexão WhatsApp:</span>
            <select 
              className="form-select" 
              style={{ padding: '6px 10px', fontSize: '0.82rem', height: '32px', margin: 0 }} 
              value={flowConnectionId} 
              onChange={(e) => setFlowConnectionId(e.target.value)}
            >
              <option value="">Qualquer Conexão (Global)</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)} 
            className="btn btn-secondary" 
            style={{ padding: '0 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            title={isFullScreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
          >
            {isFullScreen ? '🗗 Sair' : '🗖 Tela Cheia'}
          </button>
          <button 
            onClick={handleSaveFlow} 
            className="btn btn-primary" 
            style={{ padding: '0 16px', height: '32px', fontSize: '0.82rem', fontWeight: 600 }} 
            disabled={flowLoading}
          >
            {flowLoading ? 'Salvando...' : '💾 Salvar'}
          </button>
          <button 
            onClick={closeBuilder} 
            className="btn btn-secondary" 
            style={{ padding: '0 12px', height: '32px', fontSize: '0.82rem' }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Canvas + Sidebar */}
      <div className="flow-builder-container" style={{ flex: 1 }}>
        {/* Canvas Wrapper */}
        <div
          className="flow-canvas-wrapper"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          onClick={(e) => { if (!e.target.closest('.flow-node')) setSelectedNodeId(null); }}
        >
          {/* Dot grid background */}
          <div className="flow-canvas-bg" style={{
            backgroundPosition: `${canvasOffset.x % (24 * canvasZoom)}px ${canvasOffset.y % (24 * canvasZoom)}px`,
            backgroundSize: `${24 * canvasZoom}px ${24 * canvasZoom}px`,
          }} />

          {/* Toolbar */}
          <div className="flow-toolbar">
            <button className="tb-primary" onClick={addNode}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              Nó
            </button>
            <div className="tb-sep" />
            <button onClick={() => setCanvasZoom(z => Math.min(2, z + 0.15))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/></svg>
            </button>
            <span className="zoom-label">{Math.round(canvasZoom * 100)}%</span>
            <button onClick={() => setCanvasZoom(z => Math.max(0.3, z - 0.15))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
            </button>
            <div className="tb-sep" />
            <button onClick={fitAllNodes}>Encaixar</button>
          </div>

          {/* Transformed Canvas Layer */}
          <div className="flow-canvas" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})` }}>
            {/* SVG Connections */}
            <svg className="flow-connections-svg" width="6000" height="6000">
              {getConnections().map((conn, i) => {
                const dx = conn.toX - conn.fromX;
                const dy = conn.toY - conn.fromY;
                const cp = Math.abs(dy) * 0.5 + 40;
                const path = conn.type === 'button'
                  ? `M ${conn.fromX} ${conn.fromY} C ${conn.fromX + cp} ${conn.fromY}, ${conn.toX} ${conn.toY - cp}, ${conn.toX} ${conn.toY}`
                  : `M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${conn.fromY + cp}, ${conn.toX} ${conn.toY - cp}, ${conn.toX} ${conn.toY}`;
                const isHighlighted = selectedNodeId === conn.fromId || selectedNodeId === conn.toId;
                return (
                  <g key={i}>
                    <path 
                      d={path} 
                      className={`flow-connection-path animated ${isHighlighted ? 'highlighted' : ''}`} 
                      style={conn.type === 'direct' ? { stroke: 'rgba(96,165,250,0.5)', strokeDasharray: '4 4' } : undefined}
                    />
                    <circle cx={conn.toX} cy={conn.toY} r="3" fill={isHighlighted ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'} />
                  </g>
                );
              })}
              {connectingFrom && connectingMousePos && (() => {
                const startPos = getPortPosition(connectingFrom.nodeId, connectingFrom.buttonId);
                if (!startPos) return null;
                const dx = connectingMousePos.x - startPos.x;
                const dy = connectingMousePos.y - startPos.y;
                const cp = Math.abs(dy) * 0.5 + 40;
                const path = connectingFrom.buttonId
                  ? `M ${startPos.x} ${startPos.y} C ${startPos.x + cp} ${startPos.y}, ${connectingMousePos.x} ${connectingMousePos.y - cp}, ${connectingMousePos.x} ${connectingMousePos.y}`
                  : `M ${startPos.x} ${startPos.y} C ${startPos.x} ${startPos.y + cp}, ${connectingMousePos.x} ${connectingMousePos.y - cp}, ${connectingMousePos.x} ${connectingMousePos.y}`;
                return (
                  <path d={path} className="flow-connection-path preview-connection" style={{ strokeDasharray: '4 4', stroke: '#4ade80', strokeWidth: 2, fill: 'none' }} />
                );
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map((node, idx) => (
              <div
                key={node.id}
                className={`flow-node ${selectedNodeId === node.id ? 'selected' : ''}`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
              >
                {/* Input port */}
                <div className="flow-port port-in" onMouseUp={(e) => handleNodeMouseUp(e, node.id)} />

                {/* Header */}
                <div className="flow-node-header" onMouseUp={(e) => handleNodeMouseUp(e, node.id)}>
                  <span className={`flow-node-type-badge ${idx === 0 ? 'type-start' : (node.buttons || []).some(b => b.action === 'transfer_to_ia') ? 'type-ia' : (node.buttons || []).some(b => b.action === 'transfer_to_human') ? 'type-human' : 'type-message'}`}>
                    {idx === 0 ? 'Início' : (node.buttons || []).some(b => b.action === 'transfer_to_ia') ? 'IA' : (node.buttons || []).some(b => b.action === 'transfer_to_human') ? 'Humano' : 'Msg'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.id}</span>
                </div>

                {/* Body text */}
                <div className="flow-node-body" onMouseUp={(e) => handleNodeMouseUp(e, node.id)}>
                  {node.text || 'Sem texto...'}
                </div>

                {/* Media indicator */}
                {node.media && node.media.type && (
                  <div className="flow-node-media" onMouseUp={(e) => handleNodeMouseUp(e, node.id)}>
                    {mediaIcons[node.media.type] || '📎'} {node.media.type.toUpperCase()}
                    {node.media.url && <span style={{ opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>• {node.media.url.substring(0, 30)}...</span>}
                  </div>
                )}

                {/* Buttons preview */}
                {(node.buttons || []).length > 0 && (
                  <div className="flow-node-buttons">
                    {(node.buttons || []).map((btn, bi) => (
                      <div key={bi} className="flow-node-btn" style={{ position: 'relative' }}>
                        {btn.title}
                        {btn.action === 'go_to_step' && btn.targetStepId && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}> → {btn.targetStepId}</span>}
                        {btn.action === 'transfer_to_ia' && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}> → IA</span>}
                        {btn.action === 'transfer_to_human' && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}> → Humano</span>}
                        {btn.action === 'end_flow' && <span style={{ fontSize: '0.6rem', opacity: 0.5 }}> → Encerrar</span>}
                        
                        <div 
                          className="flow-port port-btn-out" 
                          style={{
                            position: 'absolute',
                            right: '-6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.4)',
                            border: '1.5px solid rgba(255,255,255,0.6)',
                            cursor: 'crosshair',
                            zIndex: 10
                          }}
                          onMouseDown={(e) => handlePortMouseDown(e, node.id, btn.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Output port */}
                <div className="flow-port port-out" onMouseDown={(e) => handlePortMouseDown(e, node.id)} />
              </div>
            ))}
          </div>

          {/* Minimap */}
          {renderMinimap()}
        </div>

        {/* Properties Sidebar */}
        {selectedNode && (
          <div className="flow-sidebar" key={selectedNodeId}>
            <div className="flow-sidebar-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Propriedades do Nó</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => duplicateNode(selectedNodeId)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>Duplicar</button>
                <button onClick={() => deleteNode(selectedNodeId)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Excluir</button>
                <button onClick={() => setSelectedNodeId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>✕</button>
              </div>
            </div>

            <div className="flow-sidebar-body">
              {/* Node ID */}
              <div className="flow-sidebar-section">
                <h4>Identificador</h4>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={selectedNode.id}
                  onChange={(e) => updateNodeId(selectedNodeId, e.target.value)}
                />
              </div>

              {/* Message Text */}
              <div className="flow-sidebar-section">
                <h4>Mensagem de Texto</h4>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '100px', fontSize: '0.85rem', padding: '10px' }}
                  value={selectedNode.text}
                  onChange={(e) => updateNode(selectedNodeId, { text: e.target.value })}
                  placeholder="Mensagem que o bot enviará..."
                />
              </div>

              {/* Delay & Fallback Step */}
              <div className="flow-sidebar-section" style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4>Delay (segundos)</h4>
                  <input
                    type="number"
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    min="0"
                    max="10"
                    placeholder="Sem delay"
                    value={selectedNode.delaySeconds || ''}
                    onChange={(e) => updateNode(selectedNodeId, { delaySeconds: parseInt(e.target.value) || null })}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <h4>Próxima Etapa (Fallback)</h4>
                  <select
                    className="form-select"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    value={selectedNode.nextStepId || ''}
                    onChange={(e) => updateNode(selectedNodeId, { nextStepId: e.target.value || null })}
                  >
                    <option value="">Nenhuma (Fim ou aguarda botão)</option>
                    {nodes.filter(n => n.id !== selectedNodeId).map(n => (
                      <option key={n.id} value={n.id}>{n.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Media */}
              <div className="flow-sidebar-section">
                <h4>Mídia Anexada</h4>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={selectedNode.media?.type || ''}
                  onChange={(e) => {
                    if (!e.target.value) { updateNode(selectedNodeId, { media: null }); }
                    else { updateNode(selectedNodeId, { media: { type: e.target.value, url: selectedNode.media?.url || '', caption: selectedNode.media?.caption || '' } }); }
                  }}
                >
                  <option value="">Nenhuma mídia</option>
                  <option value="image">🖼️ Imagem</option>
                  <option value="video">🎬 Vídeo</option>
                  <option value="audio">🔊 Áudio</option>
                  <option value="document">📄 Documento</option>
                  <option value="link">🔗 Link</option>
                </select>

                {selectedNode.media?.type && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {['image', 'video', 'audio', 'document'].includes(selectedNode.media.type) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="btn btn-secondary" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '8px', 
                          cursor: 'pointer',
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px dashed rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          textAlign: 'center'
                        }}>
                          {uploadingMedia ? '📤 Enviando...' : `📁 Escolher ${selectedNode.media.type === 'image' ? 'Imagem' : selectedNode.media.type === 'video' ? 'Vídeo' : selectedNode.media.type === 'audio' ? 'Áudio' : 'Documento'} do Dispositivo`}
                          <input
                            type="file"
                            accept={selectedNode.media.type === 'image' ? 'image/*' : selectedNode.media.type === 'video' ? 'video/*' : selectedNode.media.type === 'audio' ? 'audio/*' : undefined}
                            style={{ display: 'none' }}
                            disabled={uploadingMedia}
                            onChange={(e) => handleMediaUpload(e, selectedNodeId, selectedNode.media.type)}
                          />
                        </label>
                        {selectedNode.media.type === 'audio' && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 4px 0', lineHeight: '1.3' }}>
                            ⚠️ <strong>Dica Xbot:</strong> Para o áudio chegar como gravação nativa (humana), use arquivos no formato <strong>.ogg (codec Opus)</strong>.
                          </p>
                        )}
                      </div>
                    )}
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      placeholder={selectedNode.media.type === 'link' ? 'https://...' : 'URL da mídia (https://...)'}
                      value={selectedNode.media?.url || ''}
                      onChange={(e) => updateNode(selectedNodeId, { media: { ...selectedNode.media, url: e.target.value } })}
                    />
                    {selectedNode.media.type !== 'audio' && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        placeholder="Legenda (opcional)"
                        value={selectedNode.media?.caption || ''}
                        onChange={(e) => updateNode(selectedNodeId, { media: { ...selectedNode.media, caption: e.target.value } })}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flow-sidebar-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Botões Interativos (Máx. 3)</h4>
                  <button
                    onClick={() => addButtonToNode(selectedNodeId)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 10px', fontSize: '0.7rem' }}
                    disabled={(selectedNode.buttons || []).length >= 3}
                  >
                    + Botão
                  </button>
                </div>

                {(selectedNode.buttons || []).length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-glass)' }}>
                    Sem botões. O bot aguardará resposta aberta.
                  </div>
                )}

                {(selectedNode.buttons || []).map((btn, bi) => (
                  <div key={bi} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', margin: 0, flex: 1 }}
                        value={btn.title}
                        onChange={(e) => updateButton(selectedNodeId, bi, 'title', e.target.value)}
                        placeholder="Texto do botão"
                        maxLength={20}
                      />
                      <button onClick={() => removeButton(selectedNodeId, bi)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px', fontSize: '1rem' }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          className="form-select"
                          style={{ padding: '6px 8px', fontSize: '0.78rem', margin: 0, flex: 1 }}
                          value={btn.action}
                          onChange={(e) => updateButton(selectedNodeId, bi, 'action', e.target.value)}
                        >
                          <option value="go_to_step">Ir para Etapa</option>
                          <option value="open_url">Abrir Link (URL)</option>
                          <option value="transfer_to_ia">Ativar IA</option>
                          <option value="transfer_to_human">Transferir Humano</option>
                          <option value="end_flow">Finalizar Fluxo</option>
                        </select>
                        {btn.action === 'go_to_step' && (
                          <select
                            className="form-select"
                            style={{ padding: '6px 8px', fontSize: '0.78rem', margin: 0, flex: 1 }}
                            value={btn.targetStepId}
                            onChange={(e) => updateButton(selectedNodeId, bi, 'targetStepId', e.target.value)}
                          >
                            <option value="">-- Selecione --</option>
                            {nodes.filter(n => n.id !== selectedNodeId).map(n => (
                              <option key={n.id} value={n.id}>{n.id}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      {btn.action === 'open_url' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', margin: 0 }}
                            value={btn.url || ''}
                            onChange={(e) => updateButton(selectedNodeId, bi, 'url', e.target.value)}
                            placeholder="Link (ex: https://exemplo.com)"
                          />
                          <div style={{ fontSize: '0.7rem', color: '#ffb020', background: 'rgba(255, 176, 32, 0.05)', padding: '6px 8px', borderRadius: '4px', borderLeft: '2px solid #ffb020', marginTop: '2px', lineHeight: '1.2' }}>
                            ⚠️ O WhatsApp permite apenas 1 botão de link por mensagem, sem outros botões concomitantes.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="main-content">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="page-title">Gerenciador de Conexões e Fluxos</h1>
        <div className="tabs-scrollable" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => { setActiveTab('whatsapp'); closeBuilder(); }} className={`btn ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeTab === 'whatsapp' ? 'none' : undefined }}>
            Conexão WhatsApp &amp; APIs
          </button>
          <button onClick={() => { setActiveTab('agents'); closeBuilder(); }} className={`btn ${activeTab === 'agents' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeTab === 'agents' ? 'none' : undefined }}>
            Agentes de IA
          </button>
          <button onClick={() => { setActiveTab('flows'); }} className={`btn ${activeTab === 'flows' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeTab === 'flows' ? 'none' : undefined }}>
            Chatbot &amp; Fluxos
          </button>
          <button onClick={() => { setActiveTab('calls'); closeBuilder(); }} className={`btn ${activeTab === 'calls' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem', border: activeTab === 'calls' ? 'none' : undefined }}>
            📞 Central de Chamadas
          </button>
        </div>
      </header>

      <div className="page-body animate-fade-in" style={{ padding: '24px' }}>

        {/* =====================================================================
            TAB 1: WHATSAPP CONNECTION & APIS SETUP
            ===================================================================== */}
        {activeTab === 'whatsapp' && (
          <div className="integration-grid" style={{ alignItems: 'start' }}>
            {/* WhatsApp Connections and Global Settings Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* WhatsApp Connections CRUD */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Conexões WhatsApp</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                      Gerencie múltiplos números e conexões da API Oficial do WhatsApp.
                    </p>
                  </div>
                  {!showConnectionForm && (
                    <button onClick={() => { resetConnectionForm(); setShowConnectionForm(true); }} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      + Nova Conexão
                    </button>
                  )}
                </div>

                {/* Connection Add/Edit Form */}
                {showConnectionForm && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        {editingConnectionId ? '✏️ Editar Conexão' : '📞 Nova Conexão WhatsApp'}
                      </h3>
                      <button onClick={resetConnectionForm} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Fechar</button>
                    </div>

                    <form onSubmit={handleConnectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Nome da Conexão</label>
                        <input type="text" className="form-input" placeholder="Ex: Comercial, Suporte, Filial SP" value={connectionName} onChange={(e) => setConnectionName(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Número de Telefone</label>
                        <input type="text" className="form-input" placeholder="Ex: +5511999999999" value={connectionPhoneNumber} onChange={(e) => setConnectionPhoneNumber(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Phone Number ID (Meta)</label>
                        <input type="text" className="form-input" placeholder="Ex: 34892401824901" value={connectionPhoneId} onChange={(e) => setConnectionPhoneId(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Access Token (Meta)</label>
                        <input type="password" className="form-input" placeholder="EAAGz..." value={connectionToken} onChange={(e) => setConnectionToken(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Webhook Verify Token</label>
                        <input type="text" className="form-input" value={connectionVerifyToken} onChange={(e) => setConnectionVerifyToken(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className="switch">
                          <input type="checkbox" checked={connectionIsActive} onChange={(e) => setConnectionIsActive(e.target.checked)} />
                          <span className="slider"></span>
                        </label>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ativar esta conexão</span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={resetConnectionForm} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center' }} disabled={connectionLoading}>
                          {connectionLoading ? 'Salvando...' : editingConnectionId ? 'Salvar Alterações' : 'Adicionar'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                 {/* Connections List */}
                {connections.length === 0 && !whatsappPhoneId ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>Nenhuma conexão WhatsApp configurada.</p>
                    <button onClick={() => { resetConnectionForm(); setShowConnectionForm(true); }} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      Configurar Primeira Conexão
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Render Fallback System Connection if configured */}
                    {whatsappPhoneId && (
                      <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>Padrão do Sistema (Configurações Gerais)</h4>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                              Ativo
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>ID: {whatsappPhoneId}</span>
                          </div>
                          {testResults['system'] && (
                            <div style={{ fontSize: '0.78rem', marginTop: '6px', fontWeight: 500, color: testResults['system'].success ? '#4ade80' : 'var(--color-error)' }}>
                              {testResults['system'].loading ? '⌛ Testando...' : `${testResults['system'].success ? '✓' : '✗'} ${testResults['system'].message}`}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => handleTestConnection({ id: 'system', whatsappPhoneId, whatsappToken })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} disabled={testingConnectionId === 'system'}>
                            Testar
                          </button>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                            ℹ️ Editar nas Configurações Gerais
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Render Custom Connections */}
                    {connections.map((conn) => (
                      <div key={conn.id} className="glass-panel" style={{ padding: '16px', border: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>{conn.name}</h4>
                            <span className={`badge ${conn.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                              {conn.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {conn.phoneNumber && <span style={{ marginRight: '12px' }}>📞 {conn.phoneNumber}</span>}
                            <span>ID: {conn.whatsappPhoneId}</span>
                          </div>
                          {testResults[conn.id] && (
                            <div style={{ fontSize: '0.78rem', marginTop: '6px', fontWeight: 500, color: testResults[conn.id].success ? '#4ade80' : 'var(--color-error)' }}>
                              {testResults[conn.id].loading ? '⌛ Testando...' : `${testResults[conn.id].success ? '✓' : '✗'} ${testResults[conn.id].message}`}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => handleTestConnection(conn)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} disabled={testingConnectionId === conn.id}>
                            Testar
                          </button>
                          <button onClick={() => handleEditConnection(conn)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteConnection(conn.id)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--color-error)' }}>
                            🗑️
                          </button>
                          <label className="switch" style={{ marginLeft: '4px' }}>
                            <input type="checkbox" checked={conn.isActive} onChange={() => handleToggleConnectionActive(conn)} />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Global AI & Speech Settings */}
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>Configurações Globais de IA</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Configure chaves de API globais para inteligência artificial e modulação de voz.
                </p>
                {settingsSuccess && (
                  <div style={{ padding: '12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>✓ Configurações salvas com sucesso!</div>
                )}
                {settingsError && (
                  <div style={{ padding: '12px', background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-error)', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>✗ {settingsError}</div>
                )}
                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Google Gemini API Key</label>
                      <input type="password" className="form-input" placeholder="AIzaSy..." value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">ElevenLabs API Key (Voz)</label>
                      <input type="password" className="form-input" placeholder="Sua chave ElevenLabs" value={elevenLabsApiKey} onChange={(e) => setElevenLabsApiKey(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">ElevenLabs Voice ID</label>
                      <input type="text" className="form-input" value={elevenLabsVoiceId} onChange={(e) => setElevenLabsVoiceId(e.target.value)} />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '12px', justifyContent: 'center', fontWeight: 600, fontSize: '0.95rem', marginTop: '10px' }} disabled={settingsLoading}>
                    {settingsLoading ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
                </form>
              </div>

            </div>

            {/* Info Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Configuração do Webhook</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px' }}>Configure no Meta Developer Console:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>URL de Callback:</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-input" value={callbackUrl} readOnly style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)' }} />
                      <button onClick={() => copyToClipboard(callbackUrl)} className="btn btn-secondary" style={{ padding: '0 12px' }}>Copiar</button>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Token de Verificação (Padrão):</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" className="form-input" value={whatsappVerifyToken} readOnly style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)' }} />
                      <button onClick={() => copyToClipboard(whatsappVerifyToken)} className="btn btn-secondary" style={{ padding: '0 12px' }}>Copiar</button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px', lineHeight: '1.4' }}>
                      💡 Nota: Se configurou múltiplos números, utilize o <strong>Webhook Verify Token</strong> cadastrado em cada respectiva conexão.
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  ℹ <strong>Lembrete:</strong> Assine os campos <strong>messages</strong> no Webhook do Meta.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Status das APIs</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Fallback WhatsApp', ok: whatsappToken && whatsappPhoneId },
                    ...connections.map(c => ({ label: `WhatsApp: ${c.name}`, ok: c.isActive && c.whatsappToken && c.whatsappPhoneId })),
                    { label: 'Gemini AI', ok: !!geminiApiKey },
                    { label: 'ElevenLabs Voz', ok: !!elevenLabsApiKey },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`led-indicator ${item.ok ? 'active' : 'inactive'}`} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span className={`badge ${item.ok ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                        {item.ok ? 'Conectado' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: AI AGENTS (PREMIUM DESIGN)
            ===================================================================== */}
        {activeTab === 'agents' && (
          <div>
            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px' }}>Agentes de Inteligência Artificial</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Configure a persona e comportamento da IA que atenderá seus clientes.</p>
              </div>
              <button onClick={() => { resetAgentForm(); setShowAgentForm(true); }} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                + Novo Agente
              </button>
            </div>

            {/* Agent Form Modal */}
            {showAgentForm && (
              <div className="glass-panel animate-fade-in" style={{ padding: '28px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {editingAgentId ? '✏️ Editar Agente' : '🤖 Criar Novo Agente'}
                  </h3>
                  <button onClick={resetAgentForm} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Fechar</button>
                </div>

                <form onSubmit={handleAgentSubmit} className="integration-grid" style={{ gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nome do Agente</label>
                    <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex: Lara - Suporte Comercial" className="form-input" required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Descrição</label>
                    <input type="text" value={agentDescription} onChange={(e) => setAgentDescription(e.target.value)} placeholder="Ex: Focada em qualificação de leads" className="form-input" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Modelo de IA</label>
                    <select value={agentModel} onChange={(e) => setAgentModel(e.target.value)} className="form-select">
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Avançado)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Conexão WhatsApp (Escopo)</label>
                    <select value={agentConnectionId} onChange={(e) => setAgentConnectionId(e.target.value)} className="form-select">
                      <option value="">Qualquer Conexão (Global)</option>
                      {connections.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber || 'Sem número'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Temperatura</label>
                      <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>{agentTemperature}</span>
                    </div>
                    <input type="range" min="0.1" max="1.0" step="0.05" value={agentTemperature} onChange={(e) => setAgentTemperature(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#4ade80' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Preciso (0.1)</span><span>Criativo (1.0)</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Instrução do Sistema (Persona)</label>
                    <textarea value={agentSystemPrompt} onChange={(e) => setAgentSystemPrompt(e.target.value)} placeholder="Defina o comportamento da IA..." className="form-textarea" style={{ minHeight: '120px' }} required />
                  </div>

                  {/* Credentials settings section */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed var(--border-glass)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔑 Credenciais Específicas do Agente <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(Opcional - Substitui as configurações globais)</span>
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Chave de API do Gemini (Google)</label>
                        <input 
                          type="password" 
                          value={agentGeminiApiKey} 
                          onChange={(e) => setAgentGeminiApiKey(e.target.value)} 
                          placeholder="Usar chave global..." 
                          className="form-input" 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Chave de API ElevenLabs</label>
                        <input 
                          type="password" 
                          value={agentElevenLabsApiKey} 
                          onChange={(e) => setAgentElevenLabsApiKey(e.target.value)} 
                          placeholder="Usar chave global..." 
                          className="form-input" 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Voice ID da ElevenLabs</label>
                        <input 
                          type="text" 
                          value={agentElevenLabsVoiceId} 
                          onChange={(e) => setAgentElevenLabsVoiceId(e.target.value)} 
                          placeholder="Usar voz global..." 
                          className="form-input" 
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label className="switch">
                        <input type="checkbox" checked={agentIsActive} onChange={(e) => setAgentIsActive(e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ativar agente</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={resetAgentForm} className="btn btn-secondary">Cancelar</button>
                      <button type="submit" className="btn btn-primary" disabled={agentLoading}>
                        {agentLoading ? 'Salvando...' : editingAgentId ? 'Salvar' : 'Criar Agente'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Agent Cards Grid */}
            {agents.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤖</div>
                <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Nenhum agente criado</p>
                <p style={{ fontSize: '0.85rem' }}>Crie seu primeiro agente de IA para começar a atender clientes automaticamente.</p>
              </div>
            ) : (
              <div className="integration-grid" style={{ gap: '16px' }}>
                {agents.map((agent) => (
                  <div key={agent.id} className={`agent-card-premium ${agent.isActive ? 'card-active' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="agent-avatar">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{agent.name}</h3>
                            <span className={`led-indicator ${agent.isActive ? 'active' : 'inactive'}`} />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{agent.description || 'Sem descrição'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instrução da Persona</div>
                      <p style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                        {agent.systemPrompt}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                          {agent.model}
                        </span>
                        <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                          T: {agent.temperature}
                        </span>
                        {connections.find(c => c.id === agent.connectionId) ? (
                          <span style={{ padding: '3px 8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }} title={`Conectado a: ${connections.find(c => c.id === agent.connectionId).name}`}>
                            📞 {connections.find(c => c.id === agent.connectionId).name}
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', borderRadius: '6px', border: '1px solid var(--border-glass)' }} title="Disponível globalmente para todas conexões">
                            🌐 Global
                          </span>
                        )}
                        {agent.geminiApiKey && (
                          <span style={{ padding: '3px 8px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.3)' }} title="Gemini customizado">
                            🔑 Gemini
                          </span>
                        )}
                        {(agent.elevenLabsApiKey || agent.elevenLabsVoiceId) && (
                          <span style={{ padding: '3px 8px', background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.3)' }} title="ElevenLabs customizado">
                            🗣️ TTS
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEditAgent(agent)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Editar</button>
                        <button onClick={() => handleToggleAgentActive(agent)} className={`btn ${agent.isActive ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                          {agent.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => handleDeleteAgent(agent.id)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                          <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 3: CHATBOT & FLOWS (Visual Builder)
            ===================================================================== */}
        {activeTab === 'flows' && !builderOpen && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px' }}>Chatbot &amp; Fluxos Híbridos</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Crie fluxos visuais de atendimento com arrastar e conectar.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { openNewFlow(); loadHybridTemplate(); }} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
                  📋 Modelo Híbrido
                </button>
                <button onClick={openNewFlow} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                  + Novo Fluxo Visual
                </button>
              </div>
            </div>

            {flows.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔀</div>
                <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)' }}>Nenhum fluxo criado</p>
                <p style={{ fontSize: '0.85rem' }}>Crie seu primeiro fluxo de chatbot usando o editor visual.</p>
              </div>
            ) : (
              <div className="integration-grid" style={{ gap: '16px' }}>
                {flows.map((flow) => {
                  let parsedSteps = [];
                  try { parsedSteps = JSON.parse(flow.steps || '[]'); } catch { parsedSteps = []; }
                  return (
                    <div key={flow.id} className={`agent-card-premium ${flow.isActive ? 'card-active' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="agent-avatar">🔀</div>
                          <div>
                            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{flow.name}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', fontSize: '0.72rem' }}>
                              <span className={`badge ${flow.trigger === 'welcome' ? 'badge-success' : 'badge-warning'}`}>
                                {flow.trigger === 'welcome' ? 'Entrada Principal' : 'Por Palavra-chave'}
                              </span>
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                                {parsedSteps.length} etapas
                              </span>
                              {connections.find(c => c.id === flow.connectionId) ? (
                                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                  📞 {connections.find(c => c.id === flow.connectionId).name}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                                  🌐 Global
                                </span>
                              )}
                              {agents.find(a => a.id === flow.agentId) ? (
                                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                  🤖 IA: {agents.find(a => a.id === flow.agentId).name}
                                </span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                                  Sem IA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`led-indicator ${flow.isActive ? 'active' : 'inactive'}`} />
                      </div>

                      {flow.trigger === 'keyword' && flow.keywords && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px', padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <strong>Palavras-chave:</strong> {flow.keywords}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
                        <button onClick={() => openEditFlow(flow)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', flex: 1 }}>
                          Abrir no Editor Visual
                        </button>
                        <button onClick={() => handleToggleFlowActive(flow)} className={`btn ${flow.isActive ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                          {flow.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={() => handleDeleteFlow(flow.id)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                          <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISUAL FLOW BUILDER CANVAS (Full-screen overlay within page)
            ===================================================================== */}
        {/* =====================================================================
            VISUAL FLOW BUILDER CANVAS (Full-screen overlay within page)
            ===================================================================== */}
        {activeTab === 'flows' && builderOpen && (
          isFullScreen && mounted ? createPortal(flowBuilderEl, document.body) : flowBuilderEl
        )}

        {/* =====================================================================
            TAB 4: CENTRAL DE CHAMADAS
            ===================================================================== */}
        {activeTab === 'calls' && (
          <div className="integration-grid" style={{ alignItems: 'start' }}>

            {/* Config Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Vapi.ai Configuration */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="section-title-line"><h3>⚙️ Configuração do Vapi.ai</h3></div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px', lineHeight: '1.5' }}>
                  Configure sua conta do <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#4ade80', textDecoration: 'underline' }}>Vapi.ai</a> para habilitar chamadas com IA conversacional em tempo real.
                </p>

                {vapiSuccess && (
                  <div style={{ padding: '10px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px', fontWeight: 500 }}>✓ Configurações Vapi.ai salvas!</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">API Key do Vapi.ai</label>
                    <input type="password" className="form-input" placeholder="vapi_xxxxxxxx" value={vapiApiKey} onChange={(e) => setVapiApiKey(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone Number ID (Número Vapi)</label>
                    <input type="text" className="form-input" placeholder="ID do número no dashboard Vapi" value={vapiPhoneNumberId} onChange={(e) => setVapiPhoneNumberId(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Assistant ID (opcional - usa agente IA ativo se vazio)</label>
                    <input type="text" className="form-input" placeholder="ID do assistente pré-configurado no Vapi" value={vapiAssistantId} onChange={(e) => setVapiAssistantId(e.target.value)} />
                  </div>
                  <button onClick={handleSaveVapiSettings} className="btn btn-primary" style={{ justifyContent: 'center', padding: '10px' }} disabled={vapiSaving}>
                    {vapiSaving ? 'Salvando...' : 'Salvar Configurações Vapi.ai'}
                  </button>
                </div>

                {/* Status */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <span className={`led-indicator ${vapiApiKey && vapiPhoneNumberId ? 'active' : 'inactive'}`} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {vapiApiKey && vapiPhoneNumberId ? 'Vapi.ai conectado e pronto' : 'Configure a API Key e Phone Number ID'}
                  </span>
                </div>

                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  <strong>Webhook URL para o Vapi.ai:</strong><br/>
                  <code style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{callbackUrl ? callbackUrl.replace('/api/webhook', '/api/calls/webhook') : '...'}</code>
                  <br/>Configure esta URL no dashboard do Vapi.ai em "Server URL" para receber transcrições e eventos.
                </div>
              </div>

              {/* Make Call Panel */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="section-title-line"><h3>📞 Realizar Chamada</h3></div>

                {callResult && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, marginBottom: '12px',
                    background: callResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(255,92,92,0.08)',
                    border: `1px solid ${callResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(255,92,92,0.2)'}`,
                    color: callResult.success ? '#4ade80' : '#ff5c5c',
                  }}>
                    {callResult.success ? '✓' : '✗'} {callResult.message}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Número do Telefone (com DDD e código do país)</label>
                    <input type="text" className="form-input" placeholder="5511999999999" value={callPhone} onChange={(e) => setCallPhone(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Primeira mensagem da IA (saudação)</label>
                    <input type="text" className="form-input" placeholder="Olá! Aqui é a assistente virtual da empresa..." value={callFirstMsg} onChange={(e) => setCallFirstMsg(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Prompt personalizado (opcional - usa agente ativo se vazio)</label>
                    <textarea className="form-textarea" style={{ minHeight: '80px' }} placeholder="Instruções específicas para esta chamada..." value={callCustomPrompt} onChange={(e) => setCallCustomPrompt(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Duração máxima (segundos)</label>
                    <input type="number" className="form-input" value={callMaxDuration} onChange={(e) => setCallMaxDuration(e.target.value)} min="30" max="1800" />
                  </div>
                  <button onClick={handleMakeCall} className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem', fontWeight: 600 }} disabled={callLoading || !vapiApiKey}>
                    {callLoading ? '⏳ Iniciando Chamada...' : '📞 Ligar Agora'}
                  </button>
                </div>
              </div>
            </div>

            {/* Call History */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="section-title-line" style={{ marginBottom: 0, flex: 1 }}><h3>📋 Histórico de Chamadas</h3></div>
                <button onClick={fetchCalls} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>↻ Atualizar</button>
              </div>

              {calls.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📞</div>
                  <p style={{ fontSize: '0.9rem' }}>Nenhuma chamada registrada.</p>
                  <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>Realize sua primeira chamada pelo painel ao lado.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
                  {calls.map((call) => {
                    const isExpanded = expandedCallId === call.id;
                    const statusColors = {
                      'completed': { bg: 'rgba(74,222,128,0.08)', color: '#4ade80', label: 'Concluída' },
                      'in-progress': { bg: 'rgba(96,165,250,0.08)', color: '#60a5fa', label: 'Em andamento' },
                      'queued': { bg: 'rgba(251,191,36,0.08)', color: '#fbbf24', label: 'Na fila' },
                      'ringing': { bg: 'rgba(251,191,36,0.08)', color: '#fbbf24', label: 'Chamando' },
                      'failed': { bg: 'rgba(255,92,92,0.08)', color: '#ff5c5c', label: 'Falhou' },
                      'no-answer': { bg: 'rgba(255,92,92,0.08)', color: '#ff5c5c', label: 'Sem resposta' },
                      'busy': { bg: 'rgba(255,92,92,0.08)', color: '#ff5c5c', label: 'Ocupado' },
                    };
                    const st = statusColors[call.status] || statusColors['queued'];

                    return (
                      <div key={call.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', cursor: 'pointer', transition: 'var(--transition-smooth)' }} onClick={() => setExpandedCallId(isExpanded ? null : call.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="agent-avatar" style={{ width: '36px', height: '36px', fontSize: '1rem', borderRadius: '10px' }}>📞</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{call.contact?.name || call.contactId}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(call.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                {call.duration > 0 && ` • ${formatDuration(call.duration)}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {call.cost > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>${call.cost.toFixed(3)}</span>}
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {call.summary && (
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Resumo da IA</div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{call.summary}</p>
                              </div>
                            )}
                            {call.transcript && (
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Transcrição</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                                  {call.transcript}
                                </div>
                              </div>
                            )}
                            {call.recordingUrl && (
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Gravação</div>
                                <audio src={call.recordingUrl} controls style={{ width: '100%', height: '36px' }} />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {call.endedReason && <span>Motivo: {call.endedReason}</span>}
                              {call.vapiCallId && <span>Vapi ID: {call.vapiCallId.substring(0, 12)}...</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
