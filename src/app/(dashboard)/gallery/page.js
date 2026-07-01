'use client';

import { useState, useEffect } from 'react';

export default function GalleryPage() {
  const [uploads, setUploads] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'image', 'video', 'audio', 'document'
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [copiedFilename, setCopiedFilename] = useState('');
  
  // Preview modal states
  const [previewMedia, setPreviewMedia] = useState(null); // { filename, mimeType }

  useEffect(() => {
    fetchUploads();
  }, [activeTab]);

  // Fetch uploads from API
  async function fetchUploads() {
    setFetching(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const categoryParam = activeTab === 'all' ? '' : `category=${activeTab}`;
      const searchParam = search ? `search=${encodeURIComponent(search)}` : '';
      const params = [categoryParam, searchParam].filter(Boolean).join('&');
      
      const res = await fetch(`/api/uploads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao carregar mídias da galeria.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    } finally {
      setFetching(false);
    }
  }

  // Handle direct file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMsg({ type: '', text: '' });

    try {
      // For very large files, we'll try signed URLs or direct uploads.
      // The backend POST /api/uploads handles standard uploads, while Flow Builder uses sign for Supabase.
      // For general dashboard usage, standard upload works great. If the file is > 4.5MB, it might fail on Vercel,
      // so let's implement the robust client-side direct upload via /api/uploads/sign for files > 4MB!
      if (file.size > 4 * 1024 * 1024) {
        setStatusMsg({ type: 'info', text: 'Arquivo grande detectado. Preparando upload direto...' });
        
        // 1. Get signed URL
        const signRes = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimeType: file.type })
        });
        
        if (!signRes.ok) {
          throw new Error('Falha ao assinar upload para arquivos grandes.');
        }
        
        const { signedUrl, localUrl, filename } = await signRes.json();
        
        // 2. Direct PUT to Supabase storage
        const putRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        
        if (!putRes.ok) {
          throw new Error('Falha no upload direto para o servidor.');
        }

        setStatusMsg({ type: 'success', text: `Mídia "${file.name}" de grande porte enviada com sucesso!` });
      } else {
        // Standard upload for normal files
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          setStatusMsg({ type: 'success', text: `Mídia "${file.name}" enviada com sucesso!` });
        } else {
          const err = await res.json();
          setStatusMsg({ type: 'error', text: err.error || 'Erro ao enviar mídia.' });
        }
      }
      
      // Refresh list
      fetchUploads();
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Erro de conexão ao enviar arquivo.' });
    } finally {
      setUploading(false);
      // Reset input element
      e.target.value = '';
    }
  };

  // Handle delete upload
  const handleDeleteUpload = async (upload) => {
    if (upload.isRoot) {
      alert("Atenção: Este arquivo é RAIZ (está sendo usado em um fluxo ou produto) e não pode ser apagado para não quebrar o sistema.");
      return;
    }
    if (!confirm(`Tem certeza de que deseja excluir permanentemente o arquivo "${getFriendlyName(upload.filename)}"?`)) {
      return;
    }

    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch(`/api/uploads?id=${upload.id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Mídia excluída com sucesso da galeria e do servidor.' });
        setUploads(prev => prev.filter(u => u.id !== upload.id));
        if (previewMedia && previewMedia.id === upload.id) {
          setPreviewMedia(null);
        }
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao excluir mídia.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    }
  };

  // Handle delete ALL uploads
  const handleDeleteAll = async () => {
    if (!confirm('🚨 ATENÇÃO: Tem certeza de que deseja apagar TODOS os arquivos (exceto os RAIZES) da galeria e do servidor?')) {
      return;
    }

    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch(`/api/uploads?id=all`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Os arquivos (exceto raizes) foram excluídos com sucesso!' });
        fetchUploads(); // Recarregar para mostrar apenas os raizes restantes
        setPreviewMedia(null);
      } else {
        const err = await res.json();
        setStatusMsg({ type: 'error', text: err.error || 'Erro ao excluir todas as mídias.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Erro ao conectar com o servidor.' });
    }
  };

  // Helper to format dates nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to clean up filenames for display
  const getFriendlyName = (filename) => {
    if (!filename) return '';
    if (filename.includes('___')) {
      const parts = filename.split('___');
      const namePart = parts[0];
      const ext = filename.substring(filename.lastIndexOf('.'));
      return `${namePart}${ext}`;
    }
    return filename;
  };

  // Helper to get category label
  const getCategoryIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🔊';
    return '📄';
  };

  // Copy local URL to clipboard
  const handleCopyLink = (filename) => {
    const relativeUrl = `/api/uploads/${filename}`;
    navigator.clipboard.writeText(relativeUrl);
    setCopiedFilename(filename);
    setTimeout(() => setCopiedFilename(''), 2000);
  };

  return (
    <div className="page-body">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Galeria de Mídias</h1>
          <p className="page-description">Gerencie, filtre e reutilize imagens, vídeos e documentos recebidos ou carregados no sistema.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {uploads.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', margin: 0 }}
            >
              🗑️ Apagar Tudo
            </button>
          )}

          <label 
            htmlFor="gallery-file-upload" 
            className={`btn btn-primary ${uploading ? 'disabled' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
          >
            {uploading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Enviando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Fazer Upload de Mídia
              </>
            )}
          </label>
          <input 
            id="gallery-file-upload"
            type="file"
            onChange={handleFileUpload}
            style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}
            disabled={uploading}
          />
        </div>
      </div>

      {statusMsg.text && (
        <div 
          className={`status-message ${statusMsg.type === 'error' ? 'error' : statusMsg.type === 'info' ? 'info' : 'success'}`}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.88rem',
            fontWeight: '500',
            background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : statusMsg.type === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : statusMsg.type === 'info' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            color: statusMsg.type === 'error' ? '#f87171' : statusMsg.type === 'info' ? '#60a5fa' : '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusMsg.type === 'error' ? '❌' : statusMsg.type === 'info' ? 'ℹ️' : '✅'} {statusMsg.text}
        </div>
      )}

      {/* Filter and Search Bar Row */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--border-glass)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tudo' },
            { key: 'image', label: 'Imagens' },
            { key: 'video', label: 'Vídeos' },
            { key: 'audio', label: 'Áudios' },
            { key: 'document', label: 'Documentos' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                borderRadius: '8px',
                margin: 0,
                background: activeTab === tab.key ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                border: activeTab === tab.key ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.06)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUploads()}
            style={{ padding: '8px 12px', fontSize: '0.85rem', margin: 0 }}
          />
          <button 
            className="btn btn-secondary" 
            onClick={fetchUploads}
            style={{ padding: '8px 12px', fontSize: '0.85rem', margin: 0 }}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {fetching ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Buscando arquivos na galeria...</span>
        </div>
      ) : uploads.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '60px 20px', 
            borderRadius: '12px', 
            textAlign: 'center', 
            border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
          <h3>Nenhuma mídia encontrada</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Esta pasta está vazia ou nenhum arquivo corresponde aos seus critérios de busca.</p>
        </div>
      ) : (
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          {uploads.map((upload) => {
            const friendlyName = getFriendlyName(upload.filename);
            const isImg = upload.mimeType.startsWith('image/');
            const isVid = upload.mimeType.startsWith('video/');
            const isAud = upload.mimeType.startsWith('audio/');
            
            return (
              <div 
                key={upload.id}
                className="glass-card"
                style={{ 
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  background: 'rgba(12, 12, 12, 0.95)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {/* Media Preview Box */}
                <div 
                  style={{
                    height: '140px',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => setPreviewMedia(upload)}
                  title="Clique para visualizar em tela cheia"
                >
                  {isImg ? (
                    <img 
                      src={`/api/uploads/${upload.filename}`} 
                      alt={friendlyName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : isVid ? (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '2.2rem' }}>🎬</span>
                      <div 
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1.5px solid rgba(255,255,255,0.8)'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', color: '#fff', marginLeft: '2px' }}>▶</span>
                      </div>
                    </div>
                  ) : isAud ? (
                    <div style={{ textAlign: 'center', width: '100%', padding: '0 16px' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔊</span>
                      <audio 
                        src={`/api/uploads/${upload.filename}`} 
                        controls 
                        style={{ width: '100%', scale: '0.85', height: '32px' }} 
                        onClick={(e) => e.stopPropagation()} 
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block' }}>📄</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{upload.mimeType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}</span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span 
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {getCategoryIcon(upload.mimeType)} {upload.mimeType.split('/')[0]?.toUpperCase()}
                  </span>

                  {upload.isRoot && (
                    <span 
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(59, 130, 246, 0.8)', // Blue for root
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: '600',
                        color: '#fff'
                      }}
                      title="Arquivo Raiz: Em uso no fluxo ou produto"
                    >
                      🛡️ RAIZ
                    </span>
                  )}
                  {upload.isDuplicate && (
                    <span 
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(245, 158, 11, 0.8)', // Orange for duplicate
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '0.68rem',
                        fontWeight: '600',
                        color: '#fff'
                      }}
                      title="Cópia Repetida"
                    >
                      ⚠️ CÓPIA
                    </span>
                  )}
                </div>

                {/* Media Details */}
                <div style={{ padding: '14px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <span 
                    style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600', 
                      color: 'var(--text-primary)',
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      display: 'block',
                      marginBottom: '4px'
                    }}
                    title={friendlyName}
                  >
                    {friendlyName}
                  </span>
                  
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                    🗓️ Enviado em {formatDate(upload.createdAt)}
                  </span>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      onClick={() => handleCopyLink(upload.filename)}
                      className="btn btn-secondary"
                      style={{ 
                        flex: 1, 
                        padding: '6px 0', 
                        fontSize: '0.75rem', 
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        background: copiedFilename === upload.filename ? 'var(--color-success-bg)' : undefined,
                        borderColor: copiedFilename === upload.filename ? '#2ed573' : undefined,
                        color: copiedFilename === upload.filename ? '#2ed573' : undefined
                      }}
                    >
                      {copiedFilename === upload.filename ? (
                        <>✅ Copiado!</>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          Copiar Link
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setPreviewMedia(upload)}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '0.75rem', 
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Visualizar em Tela Cheia"
                    >
                      👁️
                    </button>

                    <button
                      onClick={() => handleDeleteUpload(upload)}
                      className={`btn ${upload.isRoot ? 'disabled' : ''}`}
                      disabled={upload.isRoot}
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '0.75rem', 
                        margin: 0,
                        background: upload.isRoot ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.08)',
                        border: upload.isRoot ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239,68,68,0.2)',
                        color: upload.isRoot ? 'var(--text-muted)' : '#f87171',
                        opacity: upload.isRoot ? 0.5 : 1,
                        cursor: upload.isRoot ? 'not-allowed' : 'pointer'
                      }}
                      title={upload.isRoot ? "Não é possível excluir um arquivo raiz" : "Excluir Mídia"}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal Overlay */}
      {previewMedia && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setPreviewMedia(null)}
        >
          <div 
            className="glass-panel"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: 'rgba(10, 10, 10, 0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setPreviewMedia(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '16px', paddingRight: '40px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getFriendlyName(previewMedia.filename)}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tipo: {previewMedia.mimeType} • Enviado em {formatDate(previewMedia.createdAt)}
              </span>
            </div>

            {/* Modal Body (Content Box) */}
            <div 
              style={{
                flexGrow: 1,
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#040404',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {previewMedia.mimeType.startsWith('image/') ? (
                <img 
                  src={`/api/uploads/${previewMedia.filename}`} 
                  alt={previewMedia.filename}
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                />
              ) : previewMedia.mimeType.startsWith('video/') ? (
                <video 
                  src={`/api/uploads/${previewMedia.filename}`} 
                  controls 
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                />
              ) : previewMedia.mimeType.startsWith('audio/') ? (
                <div style={{ width: '80%', textAlign: 'center' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🔊</span>
                  <audio 
                    src={`/api/uploads/${previewMedia.filename}`} 
                    controls 
                    autoPlay
                    style={{ width: '100%' }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <span style={{ fontSize: '4rem', display: 'block', marginBottom: '12px' }}>📄</span>
                  <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Este arquivo é um documento e não pode ser visualizado diretamente no navegador.</p>
                  <a 
                    href={`/api/uploads/${previewMedia.filename}`} 
                    download
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                  >
                    📥 Baixar Documento
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => handleCopyLink(previewMedia.filename)}
                className="btn btn-secondary"
                style={{ 
                  margin: 0,
                  fontSize: '0.8rem',
                  background: copiedFilename === previewMedia.filename ? 'var(--color-success-bg)' : undefined,
                  borderColor: copiedFilename === previewMedia.filename ? '#2ed573' : undefined,
                  color: copiedFilename === previewMedia.filename ? '#2ed573' : undefined
                }}
              >
                {copiedFilename === previewMedia.filename ? '✅ Link Copiado!' : '🔗 Copiar Link'}
              </button>
              
              <button
                onClick={() => handleDeleteUpload(previewMedia)}
                className={`btn ${previewMedia.isRoot ? 'disabled' : ''}`}
                disabled={previewMedia.isRoot}
                style={{ 
                  margin: 0, 
                  fontSize: '0.8rem',
                  background: previewMedia.isRoot ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.08)',
                  border: previewMedia.isRoot ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239,68,68,0.2)',
                  color: previewMedia.isRoot ? 'var(--text-muted)' : '#f87171',
                  opacity: previewMedia.isRoot ? 0.5 : 1,
                  cursor: previewMedia.isRoot ? 'not-allowed' : 'pointer'
                }}
                title={previewMedia.isRoot ? "Arquivo Raiz não pode ser apagado" : "Excluir permanentemente"}
              >
                🗑️ Excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
