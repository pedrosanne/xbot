'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

// Inline SVG Icons
const ArrowLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SaveIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7-7m-7-7v18" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="h-8 w-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618-3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const StarIcon = () => (
  <svg className="h-3 w-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const iconMap = {
  Check: CheckIcon,
  ShieldCheck: ShieldCheckIcon,
  Lock: LockIcon,
  BookOpen: BookOpenIcon,
  TrendingUp: TrendingUpIcon
};

export default function PageBuilder({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { id } = params;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flows, setFlows] = useState([]);
  
  // Builder States
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [facebookPixelToken, setFacebookPixelToken] = useState('');
  const [status, setStatus] = useState('DRAFT');
  
  // UI States
  const [activeLeftTab, setActiveLeftTab] = useState('blocks'); // 'blocks' | 'settings'
  const [previewDevice, setPreviewDevice] = useState('mobile'); // 'mobile' | 'desktop'
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPage();
    fetchFlows();
  }, [id]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data);
        setBlocks(data.content || []);
        setTitle(data.title);
        setSlug(data.slug);
        setDescription(data.description || '');
        setFacebookPixelId(data.facebookPixelId || '');
        setFacebookPixelToken(data.facebookPixelToken || '');
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flows');
      if (res.ok) {
        const data = await res.json();
        setFlows(data);
      }
    } catch (err) {
      console.error('Error fetching flows:', err);
    }
  };

  const handleSavePage = async (publishedStatus = null) => {
    setSaving(true);
    setSaveStatus({ type: '', message: '' });

    const updatedStatus = publishedStatus !== null ? publishedStatus : status;

    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          description,
          status: updatedStatus,
          content: blocks,
          facebookPixelId,
          facebookPixelToken
        })
      });

      const data = await res.json();

      if (res.ok) {
        setPage(data);
        setStatus(updatedStatus);
        setSaveStatus({ type: 'success', message: 'Página salva com sucesso!' });
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'Erro ao salvar a página.' });
      }
    } catch (err) {
      console.error('Error saving page:', err);
      setSaveStatus({ type: 'error', message: 'Erro de conexão ao salvar a página.' });
    } finally {
      setSaving(false);
    }
  };

  // Block Management
  const addBlock = (type) => {
    let defaultSettings = {};

    if (type === 'hero') {
      defaultSettings = {
        badge: '🔒 Edição limitada',
        title: 'Título Principal da Página',
        highlightedTitle: 'Texto Destacado',
        subtitle: 'Subtítulo complementar explicativo da oferta.',
        badgeBg: 'rgba(255, 255, 255, 0.1)',
        badgeColor: '#a1a1aa',
        textColor: '#ffffff',
        bgColor: '#09090b'
      };
    } else if (type === 'vsl') {
      defaultSettings = {
        videoType: 'vturb',
        vturbId: '6a42bd1f54f5a89ef8601746',
        scriptUrl: 'https://scripts.converteai.net/adf170ce-1438-43d2-917b-e507e4056a4d/players/6a42bd1f54f5a89ef8601746/v4/player.js',
        youtubeUrl: '',
        vimeoUrl: '',
        bgColor: '#09090b'
      };
    } else if (type === 'button') {
      defaultSettings = {
        label: 'Falar no WhatsApp',
        destinationType: 'flow',
        flowId: flows[0]?.id || '',
        phoneNumber: '',
        whatsappText: 'Eu quero saber mais sobre a oferta!',
        pulse: true,
        bgColor: '#25D366',
        textColor: '#ffffff'
      };
    } else if (type === 'features') {
      defaultSettings = {
        title: 'Por que escolher a nossa oferta?',
        items: [
          { icon: 'ShieldCheck', text: 'Receba com total segurança.' },
          { icon: 'Lock', text: 'Privacidade de dados garantida.' }
        ],
        bgColor: '#09090b',
        textColor: '#ffffff'
      };
    } else if (type === 'text') {
      defaultSettings = {
        text: 'Insira seu text explicativo ou cópia de vendas aqui.'
      };
    } else if (type === 'faq') {
      defaultSettings = {
        title: 'Perguntas Frequentes',
        items: [
          { question: 'Como funciona o envio?', answer: 'O envio é imediato e 100% digital ou físico na entrega.' },
          { question: 'É seguro?', answer: 'Sim, usamos criptografia e intermediadores confiáveis.' }
        ]
      };
    } else if (type === 'testimonials') {
      defaultSettings = {
        title: 'O que dizem nossos clientes',
        items: [
          { name: 'João Silva', text: 'Excelente material! Recomendo a todos que querem ter resultados.' }
        ]
      };
    } else if (type === 'footer') {
      defaultSettings = {
        copyright: '© Todos os direitos reservados.',
        links: [
          { label: 'Termos de Uso', url: '#' },
          { label: 'Privacidade', url: '#' }
        ]
      };
    }

    const newBlock = {
      id: `${type}_${Date.now()}`,
      type,
      settings: defaultSettings
    };

    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    setBlocks(newBlocks);
  };

  const updateBlockSettings = (blockId, newSettings) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, settings: { ...b.settings, ...newSettings } };
      }
      return b;
    }));
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-zinc-300 gap-3">
        <LoaderIcon />
        <p className="text-sm">Carregando construtor visual...</p>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/p/${slug}`;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/60 px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/pages" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate">{title}</h1>
            <p className="text-[11px] text-zinc-500 truncate font-mono">{publicUrl}</p>
          </div>
        </div>

        {/* Save Status Notification */}
        {saveStatus.message && (
          <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold animate-fadeIn ${
            saveStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {saveStatus.message}
          </div>
        )}

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button 
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visualização Mobile"
            >
              <SmartphoneIcon />
            </button>
            <button 
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Visualização Desktop"
            >
              <MonitorIcon />
            </button>
          </div>

          <a 
            href={publicUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
          >
            <EyeIcon /> Ver Página
          </a>

          <button
            onClick={() => handleSavePage()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </header>

      {/* Main Builder Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Sidebar */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden shrink-0">
          <div className="flex border-b border-zinc-900 bg-zinc-900/20">
            <button
              onClick={() => setActiveLeftTab('blocks')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeLeftTab === 'blocks' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Blocos
            </button>
            <button
              onClick={() => setActiveLeftTab('settings')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeLeftTab === 'settings' ? 'border-emerald-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Página
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {activeLeftTab === 'blocks' ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Adicionar Elemento</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { type: 'hero', label: 'Cabeçalho (Hero)', desc: 'Título, subtítulo e emblema.' },
                    { type: 'vsl', label: 'VSL / Vídeo', desc: 'Player Vturb, YouTube ou Vimeo.' },
                    { type: 'button', label: 'Botão WhatsApp (CTA)', desc: 'Botão animado de contato.' },
                    { type: 'features', label: 'Lista de Benefícios', desc: 'Itens com ícones esmeralda.' },
                    { type: 'text', label: 'Bloco de Texto', desc: 'Conteúdo de texto livre.' },
                    { type: 'faq', label: 'Sanfona FAQ', desc: 'Perguntas e respostas.' },
                    { type: 'testimonials', label: 'Depoimentos', desc: 'Prova social de clientes.' },
                    { type: 'footer', label: 'Rodapé', desc: 'Direitos autorais e links.' }
                  ].map((b) => (
                    <button
                      key={b.type}
                      onClick={() => addBlock(b.type)}
                      className="flex flex-col items-start p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all text-left group active:scale-[0.99] w-full"
                    >
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        <PlusIcon /> {b.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-0.5">{b.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Definições da Página</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Título Interno</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Slug / Caminho</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição SEO</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Status de Publicação</label>
                  <div className="grid grid-cols-2 bg-zinc-900 border border-zinc-850 rounded-xl p-0.5">
                    <button
                      onClick={() => { setStatus('DRAFT'); handleSavePage('DRAFT'); }}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${status === 'DRAFT' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                      Rascunho
                    </button>
                    <button
                      onClick={() => { setStatus('PUBLISHED'); handleSavePage('PUBLISHED'); }}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                      Publicar
                    </button>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pt-4 border-t border-zinc-900 mt-6 mb-3">Facebook Pixel</h3>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Pixel ID</label>
                  <input
                    type="text"
                    placeholder="123456789012345"
                    value={facebookPixelId}
                    onChange={(e) => setFacebookPixelId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Access Token (API Conversões)</label>
                  <textarea
                    placeholder="EAAG..."
                    value={facebookPixelToken}
                    onChange={(e) => setFacebookPixelToken(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Live Preview */}
        <main className="flex-1 bg-zinc-900/40 p-6 flex items-center justify-center overflow-y-auto custom-scrollbar">
          <div className={`w-full transition-all duration-300 ${
            previewDevice === 'mobile' ? 'max-w-[420px] rounded-[36px] border-[8px] border-zinc-800 shadow-2xl overflow-hidden bg-black aspect-[9/19] max-h-[820px]' : 'max-w-4xl rounded-2xl border border-zinc-800 bg-black min-h-[600px] shadow-2xl'
          } flex flex-col overflow-y-auto custom-scrollbar`}>
            
            {previewDevice === 'mobile' && (
              <div className="h-6 bg-zinc-900/20 px-6 flex items-center justify-between text-[10px] text-zinc-500 shrink-0 select-none">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>
            )}

            {/* Inner Preview Content */}
            <div className="flex-1 p-5 min-h-[500px] bg-black">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center py-20">
                  <PlusIcon />
                  <p className="text-sm font-semibold">Sua página está em branco</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Adicione blocos pelo menu lateral esquerdo.</p>
                </div>
              ) : (
                blocks.map((block, idx) => (
                  <div 
                    key={block.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                    className={`relative group rounded-2xl transition-all cursor-pointer border-2 ${
                      selectedBlockId === block.id 
                        ? 'border-emerald-500 bg-zinc-950/30' 
                        : 'border-transparent hover:border-zinc-800/80 hover:bg-zinc-900/10'
                    } mb-3`}
                  >
                    {/* Block Toolbar */}
                    <div className="absolute -top-3.5 right-3 bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-0.5 hidden group-hover:flex items-center gap-1 z-20 shadow-lg">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }}
                        disabled={idx === 0}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUpIcon />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }}
                        disabled={idx === blocks.length - 1}
                        className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDownIcon />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        className="p-1 text-red-400/80 hover:text-red-400"
                        title="Excluir bloco"
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {/* Block Preview Content */}
                    <div className="pointer-events-none p-1">
                      {renderPreviewBlock(block)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* Right Inspector Panel */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden shrink-0">
          <div className="h-12 border-b border-zinc-900 bg-zinc-900/20 px-5 flex items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <SettingsIcon /> Inspetor de Propriedades
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {selectedBlock ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                  <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                    {selectedBlock.type}
                  </span>
                  <button
                    onClick={() => deleteBlock(selectedBlock.id)}
                    className="flex items-center gap-1 text-red-500/80 hover:text-red-400 text-[10px] font-bold uppercase"
                  >
                    <TrashIcon /> Excluir
                  </button>
                </div>

                {/* Render Block Inspector Fields */}
                {renderBlockInspector(selectedBlock)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center">
                <SettingsIcon />
                <p className="text-xs mt-1">Selecione um bloco na tela central para editar suas propriedades.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );

  // Helper: Render Block in Visual Preview
  function renderPreviewBlock(block) {
    switch (block.type) {
      case 'hero':
        return (
          <div 
            className="text-center py-6 px-4 rounded-2xl"
            style={{ backgroundColor: block.settings.bgColor || '#09090b', color: block.settings.textColor || '#ffffff' }}
          >
            {block.settings.badge && (
              <span 
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider mb-3 border border-white/5"
                style={{ backgroundColor: block.settings.badgeBg || 'rgba(255, 255, 255, 0.1)', color: block.settings.badgeColor || '#a1a1aa' }}
              >
                <LockIcon /> {block.settings.badge}
              </span>
            )}
            <h1 className="text-2xl font-black uppercase leading-tight tracking-tight mb-3">
              {block.settings.title}{' '}
              {block.settings.highlightedTitle && (
                <span
                  className="block mt-1.5 rounded-lg px-2.5 py-0.5 italic text-xs text-white"
                  style={{ backgroundImage: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                >
                  {block.settings.highlightedTitle}
                </span>
              )}
            </h1>
            {block.settings.subtitle && (
              <p className="text-xs text-zinc-400 font-medium">
                {block.settings.subtitle}
              </p>
            )}
          </div>
        );

      case 'vsl':
        return (
          <div 
            className="my-3 rounded-xl overflow-hidden aspect-video border border-zinc-800/50 bg-black flex flex-col items-center justify-center relative"
            style={{ backgroundColor: block.settings.bgColor || '#09090b' }}
          >
            <div className="absolute inset-0 bg-zinc-950/40 flex items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                Player VSL ({block.settings.videoType || 'Vturb'})
              </span>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="my-2 px-1">
            <div
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md`}
              style={{
                backgroundColor: block.settings.bgColor || '#25D366',
                color: block.settings.textColor || '#ffffff'
              }}
            >
              <MessageCircleIcon />
              {block.settings.label || 'Falar no WhatsApp'}
            </div>
          </div>
        );

      case 'features':
        return (
          <div 
            className="py-4 px-4 rounded-xl border border-zinc-900 bg-zinc-950/20"
            style={{ backgroundColor: block.settings.bgColor || '#09090b', color: block.settings.textColor || '#ffffff' }}
          >
            {block.settings.title && (
              <h3 className="text-xs font-bold mb-3.5 text-zinc-400 border-b border-zinc-900 pb-2">
                {block.settings.title}
              </h3>
            )}
            <ul className="space-y-2.5">
              {block.settings.items?.map((item, idx) => {
                const IconComp = iconMap[item.icon] || CheckIcon;
                return (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <IconComp className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11px] font-medium text-zinc-300 leading-relaxed">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );

      case 'text':
        return (
          <div className="py-2 px-2 text-zinc-400 text-[11px] leading-relaxed whitespace-pre-line">
            {block.settings.text}
          </div>
        );

      case 'faq':
        return (
          <div className="py-3">
            {block.settings.title && (
              <h3 className="text-xs font-bold mb-3 text-zinc-300 text-center">
                {block.settings.title}
              </h3>
            )}
            <div className="space-y-2">
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="border border-zinc-900 rounded-lg p-3 bg-zinc-950 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-300">{item.question}</span>
                  <ChevronDownIcon />
                </div>
              ))}
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="py-3">
            {block.settings.title && (
              <h3 className="text-xs font-bold mb-3 text-zinc-300 text-center">
                {block.settings.title}
              </h3>
            )}
            <div className="space-y-2">
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/20 text-[11px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold">
                      {item.name ? item.name.substring(0, 2) : 'U'}
                    </div>
                    <span className="font-bold text-zinc-300">{item.name}</span>
                  </div>
                  <p className="text-zinc-500 italic">"{item.text}"</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="py-4 border-t border-zinc-900 text-center text-[10px] text-zinc-500">
            <p>{block.settings.copyright || '© Todos os direitos reservados.'}</p>
          </div>
        );

      default:
        return null;
    }
  }

  // Helper: Render Block Inspector Fields
  function renderBlockInspector(block) {
    switch (block.type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Emblema Superior (Badge)</label>
              <input
                type="text"
                value={block.settings.badge || ''}
                onChange={(e) => updateBlockSettings(block.id, { badge: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Título</label>
              <textarea
                value={block.settings.title || ''}
                onChange={(e) => updateBlockSettings(block.id, { title: e.target.value })}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Título Destacado (Itálico com Gradiente)</label>
              <input
                type="text"
                value={block.settings.highlightedTitle || ''}
                onChange={(e) => updateBlockSettings(block.id, { highlightedTitle: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Subtítulo</label>
              <textarea
                value={block.settings.subtitle || ''}
                onChange={(e) => updateBlockSettings(block.id, { subtitle: e.target.value })}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Cor do Fundo</label>
              <input
                type="color"
                value={block.settings.bgColor || '#09090b'}
                onChange={(e) => updateBlockSettings(block.id, { bgColor: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1 h-9 focus:outline-none focus:border-zinc-700 cursor-pointer"
              />
            </div>
          </div>
        );

      case 'vsl':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo de Vídeo</label>
              <select
                value={block.settings.videoType || 'vturb'}
                onChange={(e) => updateBlockSettings(block.id, { videoType: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
              >
                <option value="vturb">Vturb (Smartplayer)</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>

            {block.settings.videoType === 'vturb' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Vturb ID</label>
                  <input
                    type="text"
                    placeholder="vid-..."
                    value={block.settings.vturbId || ''}
                    onChange={(e) => updateBlockSettings(block.id, { vturbId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Script URL da Vturb</label>
                  <textarea
                    placeholder="https://scripts.converteai.net/..."
                    value={block.settings.scriptUrl || ''}
                    onChange={(e) => updateBlockSettings(block.id, { scriptUrl: e.target.value })}
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono resize-none"
                  />
                </div>
              </>
            )}

            {block.settings.videoType === 'youtube' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Link do Vídeo no YouTube</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={block.settings.youtubeUrl || ''}
                  onChange={(e) => updateBlockSettings(block.id, { youtubeUrl: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
            )}

            {block.settings.videoType === 'vimeo' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Link do Vídeo no Vimeo</label>
                <input
                  type="text"
                  placeholder="https://vimeo.com/..."
                  value={block.settings.vimeoUrl || ''}
                  onChange={(e) => updateBlockSettings(block.id, { vimeoUrl: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Texto do Botão (CTA)</label>
              <input
                type="text"
                value={block.settings.label || ''}
                onChange={(e) => updateBlockSettings(block.id, { label: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Destino</label>
              <select
                value={block.settings.destinationType || 'flow'}
                onChange={(e) => updateBlockSettings(block.id, { destinationType: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
              >
                <option value="flow">Fluxo de Chatbot (Rotacionado)</option>
                <option value="phone">Número Fixo Específico</option>
              </select>
            </div>

            {block.settings.destinationType === 'flow' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Fluxo Vinculado</label>
                <select
                  value={block.settings.flowId || ''}
                  onChange={(e) => updateBlockSettings(block.id, { flowId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-200"
                >
                  <option value="">Selecione um fluxo...</option>
                  {flows.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Número do WhatsApp (com DDI)</label>
                <input
                  type="text"
                  placeholder="5562999999999"
                  value={block.settings.phoneNumber || ''}
                  onChange={(e) => updateBlockSettings(block.id, { phoneNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Mensagem Pré-preenchida</label>
              <textarea
                value={block.settings.whatsappText || ''}
                onChange={(e) => updateBlockSettings(block.id, { whatsappText: e.target.value })}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-xl">
              <span className="text-xs font-bold text-zinc-300">Animação de Pulso</span>
              <input
                type="checkbox"
                checked={block.settings.pulse !== false}
                onChange={(e) => updateBlockSettings(block.id, { pulse: e.target.checked })}
                className="h-4 w-4 accent-emerald-500 rounded border-zinc-700 bg-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Cor do Botão</label>
              <input
                type="color"
                value={block.settings.bgColor || '#25D366'}
                onChange={(e) => updateBlockSettings(block.id, { bgColor: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-1 h-9 focus:outline-none focus:border-zinc-700 cursor-pointer"
              />
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Título da Seção</label>
              <input
                type="text"
                value={block.settings.title || ''}
                onChange={(e) => updateBlockSettings(block.id, { title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase block">Itens da Lista</label>
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-2 relative">
                  <button
                    onClick={() => {
                      const newItems = [...block.settings.items];
                      newItems.splice(idx, 1);
                      updateBlockSettings(block.id, { items: newItems });
                    }}
                    className="absolute top-2 right-2 text-zinc-600 hover:text-red-400"
                    title="Excluir item"
                  >
                    <TrashIcon />
                  </button>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Ícone</label>
                    <select
                      value={item.icon}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].icon = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none text-zinc-300"
                    >
                      <option value="Check">Check ✔</option>
                      <option value="ShieldCheck">Escudo de Segurança 🛡</option>
                      <option value="Lock">Cadeado 🔒</option>
                      <option value="BookOpen">Livro 📖</option>
                      <option value="TrendingUp">Gráfico Alta 📈</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Texto</label>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].text = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-zinc-100"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItems = [...(block.settings.items || [])];
                  newItems.push({ icon: 'Check', text: 'Novo benefício.' });
                  updateBlockSettings(block.id, { items: newItems });
                }}
                className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <PlusIcon /> Adicionar Item
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Conteúdo do Texto</label>
              <textarea
                value={block.settings.text || ''}
                onChange={(e) => updateBlockSettings(block.id, { text: e.target.value })}
                rows={10}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100 font-sans resize-y"
              />
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Título da Seção</label>
              <input
                type="text"
                value={block.settings.title || ''}
                onChange={(e) => updateBlockSettings(block.id, { title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase block">Perguntas & Respostas</label>
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-2 relative">
                  <button
                    onClick={() => {
                      const newItems = [...block.settings.items];
                      newItems.splice(idx, 1);
                      updateBlockSettings(block.id, { items: newItems });
                    }}
                    className="absolute top-2 right-2 text-zinc-600 hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Pergunta</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].question = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-zinc-100 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Resposta</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].answer = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-zinc-300 resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItems = [...(block.settings.items || [])];
                  newItems.push({ question: 'Nova Pergunta?', answer: 'Resposta aqui.' });
                  updateBlockSettings(block.id, { items: newItems });
                }}
                className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <PlusIcon /> Adicionar Pergunta
              </button>
            </div>
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Título da Seção</label>
              <input
                type="text"
                value={block.settings.title || ''}
                onChange={(e) => updateBlockSettings(block.id, { title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-400 uppercase block">Depoimentos</label>
              {block.settings.items?.map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl space-y-2 relative">
                  <button
                    onClick={() => {
                      const newItems = [...block.settings.items];
                      newItems.splice(idx, 1);
                      updateBlockSettings(block.id, { items: newItems });
                    }}
                    className="absolute top-2 right-2 text-zinc-600 hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Nome do Cliente</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].name = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Texto do Depoimento</label>
                    <textarea
                      value={item.text}
                      onChange={(e) => {
                        const newItems = [...block.settings.items];
                        newItems[idx].text = e.target.value;
                        updateBlockSettings(block.id, { items: newItems });
                      }}
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-zinc-300 resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItems = [...(block.settings.items || [])];
                  newItems.push({ name: 'Cliente Satisfeito', text: 'Gostei muito do atendimento!' });
                  updateBlockSettings(block.id, { items: newItems });
                }}
                className="w-full flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <PlusIcon /> Adicionar Depoimento
              </button>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Texto de Copyright</label>
              <input
                type="text"
                value={block.settings.copyright || ''}
                onChange={(e) => updateBlockSettings(block.id, { copyright: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  }
}
