'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Inline SVG Icons
const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const CheckIcon = ({ className = "h-3.5 w-3.5 text-emerald-500" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-12 w-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="h-8 w-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default function PagesDashboard() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTemplate, setNewTemplate] = useState('none');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (err) {
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    if (!newTitle || !newSlug) {
      setCreateError('Título e link/slug são obrigatórios.');
      return;
    }

    setCreateError('');
    setIsCreating(true);

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          slug: newSlug,
          description: newDescription,
          template: newTemplate
        })
      });

      const data = await res.json();

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewSlug('');
        setNewDescription('');
        setNewTemplate('none');
        fetchPages();
        window.location.href = `/pages/builder/${data.id}`;
      } else {
        setCreateError(data.error || 'Erro ao criar página.');
      }
    } catch (err) {
      console.error('Error creating page:', err);
      setCreateError('Erro de conexão ao criar página.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePage = async (id, title) => {
    if (!confirm(`Tem certeza que deseja excluir a página "${title}"?`)) return;

    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPages(pages.filter(p => p.id !== id));
      } else {
        alert('Falha ao excluir a página.');
      }
    } catch (err) {
      console.error('Error deleting page:', err);
      alert('Erro ao excluir a página.');
    }
  };

  const handleCopyLink = (slug, id) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/p/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Páginas de Vendas</h1>
          <p className="text-zinc-400 text-sm mt-1">Crie e edite suas landing pages no-code integradas com chatbots e UTMs.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-md active:scale-95 text-sm shrink-0"
        >
          <PlusIcon /> Nova Página
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar páginas pelo título ou link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>

      {/* Pages List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <LoaderIcon />
          <p className="text-zinc-400 text-sm">Carregando suas páginas...</p>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 px-4">
          <FileTextIcon />
          <h3 className="text-lg font-semibold text-zinc-300">Nenhuma página encontrada</h3>
          <p className="text-zinc-500 text-sm mt-1 max-w-sm">
            {searchQuery ? 'Experimente buscar por outros termos.' : 'Crie sua primeira página de vendas com o construtor arrasta e solta!'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Começar Agora
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const publicUrl = `${origin}/p/${page.slug}`;

            return (
              <div 
                key={page.id}
                className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-all group hover:bg-zinc-900/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                      {page.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      page.status === 'PUBLISHED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                    }`}>
                      {page.status === 'PUBLISHED' ? 'No Ar' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-1 line-clamp-2 h-8">
                    {page.description || 'Sem descrição cadastrada.'}
                  </p>
                  
                  {/* Public Link */}
                  <div className="mt-4 flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-[11px] text-zinc-400 font-mono">
                    <span className="truncate flex-1">{publicUrl}</span>
                    <button
                      onClick={() => handleCopyLink(page.slug, page.id)}
                      className="text-zinc-500 hover:text-zinc-300 shrink-0"
                      title="Copiar Link"
                    >
                      {copiedId === page.id ? <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> : <CopyIcon />}
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/pages/builder/${page.id}`}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <EditIcon /> Editar
                    </Link>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center h-8 w-8 bg-zinc-800/40 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors border border-zinc-800"
                      title="Visualizar Página"
                    >
                      <ExternalLinkIcon />
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeletePage(page.id, page.title)}
                    className="h-8 w-8 flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir Página"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800/80 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-900">
              <h3 className="text-xl font-bold text-zinc-100">Criar Nova Página</h3>
              <p className="text-zinc-500 text-xs mt-1">Preencha as informações básicas para iniciar.</p>
            </div>

            <form onSubmit={handleCreatePage} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">
                  {createError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Título Interno</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Segredos do Trade - Oferta Pix"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug || newSlug === newTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }
                  }}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Link da Página (Slug)</label>
                <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-700">
                  <span className="bg-zinc-900 px-3 py-2.5 text-xs text-zinc-500 border-r border-zinc-800 font-mono">/p/</span>
                  <input
                    type="text"
                    required
                    placeholder="segredos-trade"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Descrição (Opcional)</label>
                <textarea
                  placeholder="Uma breve descrição da oferta para controle interno."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-100 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Template Inicial</label>
                <select
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-700 text-zinc-200"
                >
                  <option value="none">Página em Branco (Sem Blocos)</option>
                  <option value="presell">Página Presell WhatsApp (Segredos do Trade)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isCreating ? 'Criando...' : 'Criar e Editar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
