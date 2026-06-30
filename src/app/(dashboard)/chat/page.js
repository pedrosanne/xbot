'use client';

import { useState, useEffect, useRef } from 'react';

// Custom Audio Player for voice messages
function CustomAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatDuration = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="custom-audio-player">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="metadata"
      />
      <button type="button" onClick={togglePlay} className="audio-play-btn">
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="audio-progress-container">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="audio-slider"
        />
        <div className="audio-time-row">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      <div className="audio-avatar-indicator">
        🎙️
      </div>
    </div>
  );
}

// Clean date formatting headers
const formatDateHeader = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const checkDate = new Date(date);

  if (checkDate.toDateString() === today.toDateString()) {
    return 'Hoje';
  }
  if (checkDate.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  }
  
  if (checkDate.getFullYear() === today.getFullYear()) {
    return checkDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  }
  
  return checkDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Render ticks for message delivery confirmation
const renderTicks = (status) => {
  if (status === 'read' || status === 'played') {
    return (
      <svg className="tick-icon blue" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5.25 7.69l6.47-6.47a.75.75 0 0 1 1.06 0z"/>
        <path d="M15.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 5.97-5.97a.75.75 0 0 1 1.06 0z"/>
      </svg>
    );
  }
  if (status === 'delivered') {
    return (
      <svg className="tick-icon grey" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5.25 7.69l6.47-6.47a.75.75 0 0 1 1.06 0z"/>
        <path d="M15.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l.97.97 5.97-5.97a.75.75 0 0 1 1.06 0z"/>
      </svg>
    );
  }
  if (status === 'sent') {
    return (
      <svg className="tick-icon grey" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5.25 7.69l6.47-6.47a.75.75 0 0 1 1.06 0z"/>
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <span style={{ color: '#ff5c5c', marginLeft: '4px', fontWeight: 'bold', fontSize: '0.85rem' }} title="Falha ao enviar">⚠️</span>
    );
  }
  return (
    <svg className="tick-icon grey" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.78 1.22a.75.75 0 0 1 0 1.06l-7 7a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5.25 7.69l6.47-6.47a.75.75 0 0 1 1.06 0z"/>
    </svg>
  );
};

export default function ChatPage() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Collaborators and logged user states
  const [collaborators, setCollaborators] = useState([]);
  const [loggedUser, setLoggedUser] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState('ALL'); // 'ALL', 'ME', 'UNASSIGNED'
  
  // Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callFirstMessage, setCallFirstMessage] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const [callResult, setCallResult] = useState(null); // { success, message }
  
  // Simulated Client states
  const [simName, setSimName] = useState('João Silva');
  const [simPhone, setSimPhone] = useState('5511999999999');
  const [simText, setSimText] = useState('Olá, gostaria de saber se vocês têm o produto em estoque?');
  const [simType, setSimType] = useState('text');
  const [simMediaId, setSimMediaId] = useState('wamid_test_media_123');
  const [simConnectionPhoneId, setSimConnectionPhoneId] = useState('sim_phone_id');

  // Simulator Drawer and Contact Search/Filters
  const [showSimulator, setShowSimulator] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'AUTO', 'MANUAL'

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessagesLengthRef = useRef(0);
  const lastContactIdRef = useRef(null);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [useVoiceChanger, setUseVoiceChanger] = useState(true);
  const [recorder, setRecorder] = useState(null);
  const [nativeRecorder, setNativeRecorder] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const onStopCallbackRef = useRef(null);

  // Advanced Message Actions States
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editInputText, setEditInputText] = useState('');
  
  // Forward Modal State
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Floating Context Menu for long-press / click on mobile
  const [activeMenuMessage, setActiveMenuMessage] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // iOS Attachment menu sheet state
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  useEffect(() => {
    // Only load mic-recorder-to-mp3 on the client side
    import('mic-recorder-to-mp3').then((module) => {
      const MicRecorder = module.default;
      setRecorder(new MicRecorder({ bitRate: 128 }));
    }).catch(err => console.error('Failed to load mic-recorder-to-mp3', err));
  }, []);

  // File Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef(null);

  // Lead Profile Detail states
  const [rightPanelTab, setRightPanelTab] = useState('profile'); // 'profile' or 'simulator'
  const [editProfileMode, setEditProfileMode] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileEmailInput, setProfileEmailInput] = useState('');
  const [profileTagsInput, setProfileTagsInput] = useState('');
  const [profileNotesInput, setProfileNotesInput] = useState('');
  const [profileAvatarInput, setProfileAvatarInput] = useState('');

  const [connections, setConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('all');

  // Manual Payment states
  const [products, setProducts] = useState([]);
  const [flows, setFlows] = useState([]);
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [manualProductId, setManualProductId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualSilent, setManualSilent] = useState(false);
  const [registeringManualPay, setRegisteringManualPay] = useState(false);

  async function fetchCollaborators() {
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) {
        setCollaborators(await res.json());
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    }
  };

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }

  async function fetchFlows() {
    try {
      const res = await fetch('/api/flows');
      if (res.ok) {
        setFlows(await res.json());
      }
    } catch (err) {
      console.error('Error fetching flows:', err);
    }
  }

  const handleRegisterManualPayment = async (e) => {
    e.preventDefault();
    if (!selectedContact || !manualAmount) return;

    setRegisteringManualPay(true);
    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          productId: manualProductId || null,
          amount: manualAmount,
          silent: manualSilent
        })
      });

      if (res.ok) {
        alert('Venda manual registrada com sucesso!');
        setShowManualPayModal(false);
        setManualProductId('');
        setManualAmount('');
        setManualSilent(false);
        fetchMessages(selectedContact.id);
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || 'Falha ao registrar'}`);
      }
    } catch (err) {
      console.error('Error registering manual payment:', err);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setRegisteringManualPay(false);
    }
  };

  async function fetchLoggedUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setLoggedUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching logged user:', err);
    }
  };

  // Fetch all WhatsApp Connections
  async function fetchConnections() {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  };

  // 1. Fetch Contact List (with connection scoping filter)
  async function fetchContacts(connId = selectedConnectionId) {
    try {
      const url = connId && connId !== 'all' ? `/api/chat?connectionId=${connId}` : '/api/chat';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  // 2. Fetch Messages for Selected Contact
  async function fetchMessages(contactId) {
    try {
      const res = await fetch(`/api/chat?contactId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setMessages(data.messages || []);
          if (data.contact) {
            setSelectedContact(prev => {
              if (!prev) return data.contact;
              return { ...prev, ...data.contact };
            });
          }
        } else {
          setMessages(data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchConnections();
      fetchCollaborators();
      fetchLoggedUser();
      fetchProducts();
      fetchFlows();
    });
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchContacts(selectedConnectionId);
    });
  }, [selectedConnectionId]);

  useEffect(() => {
    if (selectedContact) {
      Promise.resolve().then(() => {
        setProfileNameInput(selectedContact.name || '');
        setProfileEmailInput(selectedContact.email || '');
        setProfileTagsInput(selectedContact.tags || '');
        setProfileNotesInput(selectedContact.notes || '');
        setProfileAvatarInput(selectedContact.avatarUrl || '');
      });
    } else {
      Promise.resolve().then(() => {
        setEditProfileMode(false);
      });
    }
  }, [selectedContact]);

  useEffect(() => {
    const load = async () => {
      await fetchContacts(selectedConnectionId);
    };
    load();
    const interval = setInterval(async () => {
      await fetchContacts(selectedConnectionId);
      if (selectedContact) {
        await fetchMessages(selectedContact.id);
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      clearInterval(recordingTimerRef.current);
    };
  }, [selectedContact?.id, selectedConnectionId]);

  // Scroll to bottom only when contact changes or a new message arrives and the user is near the bottom
  useEffect(() => {
    if (!selectedContact) return;

    const container = messagesContainerRef.current;
    const contactChanged = lastContactIdRef.current !== selectedContact.id;
    const messagesCountChanged = lastMessagesLengthRef.current !== messages.length;

    lastContactIdRef.current = selectedContact.id;
    lastMessagesLengthRef.current = messages.length;

    if (contactChanged) {
      // Scroll to bottom immediately on contact change
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    } else if (messagesCountChanged) {
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        const lastMsg = messages[messages.length - 1];
        const isOutgoing = lastMsg && lastMsg.direction === 'OUTGOING';

        if (isNearBottom || isOutgoing) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, selectedContact?.id]);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuMessage(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle Contact Select
  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
    setSelectedMessageIds([]);
    setIsSelectMode(false);
    setReplyingTo(null);
    setEditingMessage(null);
  };

  // Toggle Bot Status (AUTO / MANUAL)
  const handleToggleStatus = async () => {
    if (!selectedContact) return;
    const newStatus = selectedContact.status === 'AUTO' ? 'MANUAL' : 'AUTO';
    
    try {
      const res = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact.id, status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedContact(updated);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error toggling bot status:', err);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Try native OGG Opus recording if supported
    if (typeof window !== 'undefined' && window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMediaStream(stream);
        audioChunksRef.current = [];
        const options = { mimeType: 'audio/ogg; codecs=opus' };
        const mediaRec = new window.MediaRecorder(stream, options);
        
        mediaRec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRec.onstop = () => {
          if (onStopCallbackRef.current) {
            onStopCallbackRef.current();
          }
        };

        mediaRec.start();
        setNativeRecorder(mediaRec);
        return;
      } catch (err) {
        console.error('Error starting native OGG recording, falling back:', err);
      }
    }

    // Fallback to mic-recorder-to-mp3
    if (!recorder) {
      alert('Gravador de áudio não inicializado.');
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      return;
    }
    try {
      await recorder.start();
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Não foi possível acessar o microfone.');
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  }

  // Stop recording audio
  function stopRecording(shouldSend = true) {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (nativeRecorder) {
      const rec = nativeRecorder;
      setNativeRecorder(null);
      
      onStopCallbackRef.current = async () => {
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
          setMediaStream(null);
        }

        if (shouldSend) {
          try {
            setLoading(true);
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
            const audioFile = new File([audioBlob], 'recorded_voice.ogg', { type: 'audio/ogg' });
            
            const formData = new FormData();
            formData.append('file', audioFile);

            const uploadRes = await fetch('/api/uploads', {
              method: 'POST',
              body: formData,
            });

            if (!uploadRes.ok) throw new Error('Upload failed');
            const uploadData = await uploadRes.json();

            const sendRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId: selectedContact.id,
                type: 'audio',
                mediaUrl: uploadData.url,
                useVoiceChanger: useVoiceChanger,
              }),
            });

            const data = await sendRes.json();
            if (!sendRes.ok || data.sendError) {
              alert(`Aviso: Ocorreu um erro ao enviar áudio para o WhatsApp: ${data.error || data.sendError || 'Erro desconhecido'}`);
            }
            
            fetchMessages(selectedContact.id);
            fetchContacts();
          } catch (err) {
            console.error('Failed to upload/send audio:', err);
            alert('Falha ao enviar mensagem de voz.');
          } finally {
            setLoading(false);
          }
        }
      };
      
      rec.stop();
      return;
    }

    // Fallback to mic-recorder-to-mp3 stop flow
    if (!recorder) return;
    
    if (shouldSend) {
      recorder.stop().getMp3().then(async ([buffer, blob]) => {
        const audioFile = new File(buffer, 'recorded_voice.mp3', { type: 'audio/mpeg' });
        
        const formData = new FormData();
        formData.append('file', audioFile);

        try {
          setLoading(true);
          const uploadRes = await fetch('/api/uploads', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) throw new Error('Upload failed');
          const uploadData = await uploadRes.json();

          const sendRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: selectedContact.id,
              type: 'audio',
              mediaUrl: uploadData.url,
              useVoiceChanger: useVoiceChanger,
            }),
          });

          const data = await sendRes.json();
          if (!sendRes.ok || data.sendError) {
            alert(`Aviso: Ocorreu um erro ao enviar áudio para o WhatsApp: ${data.error || data.sendError || 'Erro desconhecido'}`);
          }
          
          fetchMessages(selectedContact.id);
          fetchContacts();
        } catch (err) {
          console.error('Error uploading/sending audio:', err);
          alert('Erro ao gravar ou enviar áudio.');
        } finally {
          setLoading(false);
        }
      }).catch((err) => {
        console.error('Error getting MP3 buffer:', err);
        alert('Erro ao processar áudio gravado.');
      });
    } else {
      recorder.stop();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const convertWebPToPNG = (file) => {
    return new Promise((resolve) => {
      const isWebP = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
      if (!isWebP) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const newName = `${baseName}.png`;
            const convertedFile = new File([blob], newName, { type: 'image/png' });
            resolve(convertedFile);
          }, 'image/png');
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    let mediaType = getMediaType(file.type);
    if (mediaType === 'image') {
      file = await convertWebPToPNG(file);
      mediaType = getMediaType(file.type);
    }

    let limitBytes = 100 * 1024 * 1024; // Default to document limit (100MB)
    let limitLabel = "100 MB";

    if (mediaType === 'image') {
      limitBytes = 5 * 1024 * 1024;
      limitLabel = "5 MB";
    } else if (mediaType === 'video') {
      limitBytes = 16 * 1024 * 1024;
      limitLabel = "16 MB";
    } else if (mediaType === 'audio') {
      limitBytes = 16 * 1024 * 1024;
      limitLabel = "16 MB";
    }

    if (file.size > limitBytes) {
      alert(`O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(2)} MB) excede o limite máximo permitido pelo WhatsApp para ${
        mediaType === 'image' ? 'imagens' : mediaType === 'video' ? 'vídeos' : mediaType === 'audio' ? 'áudios' : 'documentos'
      }, que é de ${limitLabel}. Por favor, selecione um arquivo menor.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadProgress(true);
    setShowAttachMenu(false);

    try {
      // 1. Get signed upload URL from backend
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type })
      });

      if (!signRes.ok) {
        throw new Error('Falha ao gerar URL de upload assinado.');
      }

      const signData = await signRes.json();
      const { signedUrl, localUrl } = signData;

      // 2. Upload file directly to Supabase Storage (PUT request bypasses Vercel payload limit)
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadRes.ok) {
        let details = '';
        try {
          const errData = await uploadRes.json();
          details = errData.message || errData.error || JSON.stringify(errData);
        } catch (e) {
          try {
            details = await uploadRes.text();
          } catch (e2) {}
        }
        throw new Error(`Falha ao enviar arquivo para o armazenamento: ${details || uploadRes.statusText} (Status: ${uploadRes.status})`);
      }

      setUploadFile({
        name: file.name,
        url: localUrl,
        type: mediaType
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      alert(err.message || 'Erro ao fazer upload do arquivo.');
    } finally {
      setUploadProgress(false);
    }
  };

  const getMediaType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Save edited profile details
  const handleSaveProfile = async () => {
    if (!selectedContact) return;
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          name: profileNameInput,
          email: profileEmailInput,
          notes: profileNotesInput,
          tags: profileTagsInput,
          avatarUrl: profileAvatarInput
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedContact(updated);
        setEditProfileMode(false);
        fetchContacts();
        fetchMessages(selectedContact.id);
      } else {
        alert('Falha ao salvar detalhes do perfil.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Send Manual Message (Human Agent)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !uploadFile) return;

    setLoading(true);
    const textToSend = inputText;
    const currentUpload = uploadFile;
    const currentReplyTo = replyingTo;
    
    setInputText('');
    setUploadFile(null);
    setReplyingTo(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          type: currentUpload ? currentUpload.type : 'text',
          content: textToSend, // used as caption for media
          mediaUrl: currentUpload ? currentUpload.url : undefined,
          replyToId: currentReplyTo ? currentReplyTo.id : undefined,
          replyToContent: currentReplyTo ? (currentReplyTo.content || currentReplyTo.type) : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || data.sendError) {
        const errMessage = data.error || data.sendError || 'Erro de envio.';
        alert(`Aviso: Ocorreu um erro no envio para o WhatsApp, mas a mensagem foi gravada localmente. Erro: ${errMessage}`);
      }
      
      fetchMessages(selectedContact.id);
      fetchContacts();
    } catch (err) {
      console.error('Error sending manual message:', err);
      alert('Erro de conexão ao enviar mensagem.');
    } finally {
      setLoading(false);
    }
  };

  // React to a message
  const handleReactToMessage = async (msgId, emoji) => {
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          messageId: msgId,
          emoji,
          senderType: 'HUMAN'
        })
      });
      if (res.ok) {
        fetchMessages(selectedContact.id);
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  };

  // Edit message
  const handleEditMessageSubmit = async (e) => {
    e.preventDefault();
    if (!editingMessage || !editInputText.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          messageId: editingMessage.id,
          newContent: editInputText
        })
      });
      if (res.ok) {
        setEditingMessage(null);
        setEditInputText('');
        fetchMessages(selectedContact.id);
      } else {
        const data = await res.json();
        alert(`Erro ao editar: ${data.error || 'Desconhecido'}`);
      }
    } catch (err) {
      console.error('Error editing message:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId, deleteType) => {
    if (!confirm(deleteType === 'everyone' ? 'Apagar esta mensagem para TODOS?' : 'Apagar esta mensagem para mim?')) return;
    try {
      const res = await fetch(`/api/chat/messages?messageId=${msgId}&deleteType=${deleteType}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMessages(selectedContact.id);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Forward message(s)
  const handleForwardSubmit = async (targetContactId) => {
    if (!messageToForward) return;
    try {
      setLoading(true);
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetContactIds: [targetContactId],
          messageId: messageToForward.id
        })
      });
      if (res.ok) {
        setShowForwardModal(false);
        setMessageToForward(null);
        alert('Mensagem encaminhada com sucesso!');
      } else {
        alert('Erro ao encaminhar mensagem.');
      }
    } catch (err) {
      console.error('Error forwarding message:', err);
    } finally {
      setLoading(false);
    }
  };

  // Forward multiple selected messages
  const handleForwardSelectedSubmit = async (targetContactId) => {
    if (selectedMessageIds.length === 0) return;
    try {
      setLoading(true);
      for (const msgId of selectedMessageIds) {
        await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetContactIds: [targetContactId],
            messageId: msgId
          })
        });
      }
      setShowForwardModal(false);
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      alert('Mensagens encaminhadas com sucesso!');
    } catch (err) {
      console.error('Error forwarding messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete multiple selected messages
  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    if (!confirm(`Apagar as ${selectedMessageIds.length} mensagens selecionadas para você?`)) return;

    try {
      setLoading(true);
      for (const msgId of selectedMessageIds) {
        await fetch(`/api/chat/messages?messageId=${msgId}&deleteType=me`, {
          method: 'DELETE'
        });
      }
      setSelectedMessageIds([]);
      setIsSelectMode(false);
      fetchMessages(selectedContact.id);
    } catch (err) {
      console.error('Error deleting messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initiate AI Voice Call via Vapi.ai
  const handleInitiateCall = async () => {
    if (!selectedContact) return;
    setCallLoading(true);
    setCallResult(null);

    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: selectedContact.id,
          firstMessage: callFirstMessage || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCallResult({ success: true, message: 'Chamada iniciada com sucesso! A IA está ligando para o cliente.' });
        setCallFirstMessage('');
        setTimeout(() => { setShowCallModal(false); setCallResult(null); }, 4000);
      } else {
        setCallResult({ success: false, message: data.error || 'Erro ao iniciar chamada.' });
      }
    } catch (err) {
      console.error('Error initiating call:', err);
      setCallResult({ success: false, message: 'Erro de conexão com a API.' });
    } finally {
      setCallLoading(false);
    }
  };

  // Send Simulated Webhook (Client Simulator)
  const handleSimulateWebhook = async (e) => {
    e.preventDefault();
    if (!simPhone.trim()) return;

    const messageId = `wamid_simulated_${Date.now()}`;
    const formattedContactId = simConnectionPhoneId !== 'sim_phone_id' 
      ? `${simConnectionPhoneId}:${simPhone}` 
      : simPhone;

    // 1. Simular digitação primeiro (2 segundos)
    try {
      await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formattedContactId,
          typingState: simType === 'audio' ? 'RECORDING' : 'TYPING'
        })
      });
      fetchContacts();
      if (selectedContact && selectedContact.id === formattedContactId) {
        setSelectedContact(prev => ({ ...prev, typingState: simType === 'audio' ? 'RECORDING' : 'TYPING' }));
      }
    } catch (err) {
      console.error('Error setting simulated typing state:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'sim_business_id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '5511999999999', phone_number_id: simConnectionPhoneId },
                contacts: [
                  {
                    profile: { name: simName },
                    wa_id: simPhone
                  }
                ],
                messages: [
                  {
                    from: simPhone,
                    id: messageId,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: simType,
                    ...(simType === 'text' && { text: { body: simText } }),
                    ...(simType === 'audio' && { audio: { id: simMediaId, mime_type: 'audio/ogg; codecs=opus' } }),
                    ...(simType === 'image' && { image: { id: simMediaId, mime_type: 'image/jpeg', caption: simText } })
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        try {
          await fetch('/api/chat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: formattedContactId,
              typingState: 'IDLE'
            })
          });
        } catch (e) {}

        alert('Simulação enviada com sucesso ao Webhook! Aguarde a IA responder na fila em 2.5s.');
        const checkContact = { id: formattedContactId, name: simName, status: 'AUTO', typingState: 'IDLE' };
        setSelectedContact(checkContact);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error simulating webhook:', err);
      alert('Falha ao simular webhook.');
    }
  };

  const handleSimulateTyping = async (state, durationMs) => {
    if (!simPhone.trim()) return;
    const formattedContactId = simConnectionPhoneId !== 'sim_phone_id' 
      ? `${simConnectionPhoneId}:${simPhone}` 
      : simPhone;

    try {
      await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formattedContactId,
          typingState: state
        })
      });
      fetchContacts();
      if (selectedContact && selectedContact.id === formattedContactId) {
        setSelectedContact(prev => ({ ...prev, typingState: state }));
      }
      
      setTimeout(async () => {
        try {
          await fetch('/api/chat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: formattedContactId,
              typingState: 'IDLE'
            })
          });
          fetchContacts();
          if (selectedContact && selectedContact.id === formattedContactId) {
            setSelectedContact(prev => ({ ...prev, typingState: 'IDLE' }));
          }
        } catch (e) {}
      }, durationMs);
    } catch (err) {
      console.error('Error simulating typing state:', err);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = 
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      contact.id?.includes(searchQuery);
    const matchesFilter = 
      statusFilter === 'ALL' || 
      contact.status === statusFilter;

    let matchesAssignee = true;
    if (assigneeFilter === 'ME') {
      matchesAssignee = contact.assignedUserId === loggedUser?.id;
    } else if (assigneeFilter === 'UNASSIGNED') {
      matchesAssignee = !contact.assignedUserId;
    }

    return matchesSearch && matchesFilter && matchesAssignee;
  });

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Open long-press / right-click menu
  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    if (isSelectMode) return;
    setActiveMenuMessage(msg);
    // Position menu near cursor
    setMenuPosition({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 300)
    });
  };

  // Toggle select checkbox
  const toggleSelectMessage = (msgId) => {
    setSelectedMessageIds(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const totalUnreadBadge = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="chat-page-container">
      
      {/* 1. Contacts Sidebar Panel */}
      <div className={`contacts-panel ${selectedContact ? 'hidden-mobile' : ''}`}>
        <div className="contacts-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Contatos</h2>
            <button 
              onClick={() => { setShowSimulator(!showSimulator); setRightPanelTab('simulator'); }} 
              className={`btn ${showSimulator && rightPanelTab === 'simulator' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Abrir Simulador de Clientes"
            >
              <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Simulador
            </button>
          </div>

          {/* WhatsApp Connection Scoping Filter */}
          <div style={{ margin: '12px 0 6px 0' }}>
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="form-select"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', margin: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}
            >
              <option value="all">Todos os Números</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.phoneNumber || conn.whatsappPhoneId})
                </option>
              ))}
            </select>
          </div>
          
          {/* Search bar */}
          <div className="contacts-search-wrapper">
            <svg className="contacts-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Buscar por nome ou número..." 
              className="contacts-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="contacts-filters">
          <button 
            className={`filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Todos
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'AUTO' ? 'active' : ''}`}
            onClick={() => setStatusFilter('AUTO')}
          >
            Robô
          </button>
          <button 
            className={`filter-tab ${statusFilter === 'MANUAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MANUAL')}
          >
            Manual
          </button>
        </div>

        {/* Assignee Filter Tabs */}
        <div className="contacts-filters" style={{ marginTop: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <button 
            className={`filter-tab ${assigneeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('ALL')}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Fila Geral
          </button>
          <button 
            className={`filter-tab ${assigneeFilter === 'ME' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('ME')}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            disabled={!loggedUser}
          >
            Meus Leads
          </button>
          <button 
            className={`filter-tab ${assigneeFilter === 'UNASSIGNED' ? 'active' : ''}`}
            onClick={() => setAssigneeFilter('UNASSIGNED')}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Sem Atendente
          </button>
        </div>

        {/* Contact list body */}
        <div className="contacts-list">
          {filteredContacts.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 8px', fontSize: '0.85rem' }}>
              Nenhum contato encontrado.
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const isManual = contact.status === 'MANUAL';
              const initials = getInitials(contact.name || contact.profileName || contact.id);
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`contact-item ${isSelected ? 'selected' : ''}`}
                >
                  {contact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={contact.avatarUrl} 
                      alt="Avatar" 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
                    />
                  ) : (
                    <div className="contact-avatar">
                      {initials}
                    </div>
                  )}
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <span className="contact-name">{contact.name || 'Sem Nome'}</span>
                      <span className={`status-indicator ${isManual ? 'manual' : 'auto'}`} />
                    </div>
                    {contact.assignedUser && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-primary-hover)', display: 'flex', alignItems: 'center', gap: '3px', margin: '2px 0' }}>
                        <svg style={{ width: '10px', height: '10px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{contact.assignedUser.name}</span>
                      </div>
                    )}
                    <div className="contact-msg-row">
                      <span className="contact-last-msg">
                        {contact.typingState === 'TYPING' ? (
                          <span className="status-typing-green">digitando...</span>
                        ) : contact.typingState === 'RECORDING' ? (
                          <span className="status-typing-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg style={{ width: '12px', height: '12px', verticalAlign: 'middle' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            gravando áudio...
                          </span>
                        ) : (
                          contact.lastMessage?.content || '(Sem mensagens)'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div className={`chat-window-panel ${!selectedContact ? 'hidden-mobile' : ''} ${showSimulator ? 'simulator-open' : ''}`}>
        {selectedContact ? (
          <>
            {/* iOS-Style Chat Header */}
            <div className="chat-header ios-chat-header">
              <div className="chat-header-info">
                {/* Back button for mobile with badge count */}
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="back-btn-mobile ios-back-btn"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="back-arrow-svg">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  <span className="back-badge-count">{totalUnreadBadge > 0 ? totalUnreadBadge : 'Chats'}</span>
                </button>

                <div 
                  onClick={() => { setShowSimulator(true); setRightPanelTab('profile'); }}
                  className="ios-contact-header-details"
                  style={{ cursor: 'pointer' }}
                >
                  {selectedContact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedContact.avatarUrl} 
                      alt="Avatar" 
                      className="ios-header-avatar"
                    />
                  ) : (
                    <div className="contact-avatar ios-header-avatar">
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                  <div className="chat-header-text">
                    <span className="chat-header-title">{selectedContact.name}</span>
                    <span className="chat-header-sub clickable-sub">toque para dados do contato</span>
                  </div>
                </div>
              </div>
              
              <div className="chat-header-actions ios-header-actions">
                <button 
                  onClick={() => { setShowCallModal(!showCallModal); setCallResult(null); }}
                  className="ios-header-icon-btn"
                  title="Ligar com IA"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="phone-icon-svg">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </button>

                <button 
                  onClick={handleToggleStatus}
                  className={`btn-pill ${selectedContact.status === 'AUTO' ? 'active-bot' : 'manual-bot'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {selectedContact.status === 'AUTO' ? (
                    <>
                      <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      Robô
                    </>
                  ) : (
                    <>
                      <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Manual
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Call Modal */}
            {showCallModal && (
              <div className="call-modal-overlay">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Chamada com IA para {selectedContact.name}
                  </h4>
                  <button onClick={() => setShowCallModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Primeira mensagem da IA (opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      placeholder={`Olá ${selectedContact.name}! Aqui é a assistente virtual...`}
                      value={callFirstMessage}
                      onChange={(e) => setCallFirstMessage(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleInitiateCall}
                    className="btn btn-primary"
                    style={{ padding: '8px 20px', whiteSpace: 'nowrap' }}
                    disabled={callLoading}
                  >
                    {callLoading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg className="animate-spin" style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                        </svg>
                        Ligando...
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Ligar
                      </span>
                    )}
                  </button>
                </div>

                {callResult && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    background: callResult.success ? 'rgba(74,222,128,0.08)' : 'rgba(255,92,92,0.08)',
                    border: `1px solid ${callResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(255,92,92,0.2)'}`,
                    color: callResult.success ? '#4ade80' : '#ff5c5c',
                  }}>
                    {callResult.success ? '✓' : '✓'} {callResult.message}
                  </div>
                )}
              </div>
            )}

            {/* Message Area */}
            <div ref={messagesContainerRef} className="messages-container whatsapp-wallpaper">
              
              {/* Safety encryption info bubble */}
              <div className="safety-bubble-container">
                <div className="safety-bubble">
                  🔒 As mensagens e ligações são protegidas com criptografia de ponta a ponta. Somente as pessoas que fazem parte da conversa podem ler, ouvir e compartilhar esse conteúdo.
                </div>
              </div>

              {(() => {
                let lastDateStr = null;
                return messages.map((msg, index) => {
                  const isClient = msg.direction === 'INCOMING';
                  const isBot = msg.senderType === 'BOT';
                  const isSelected = selectedMessageIds.includes(msg.id);
                  
                  let wrapperClass = 'message-wrapper';
                  if (isClient) {
                    wrapperClass += ' incoming';
                  } else {
                    wrapperClass += ' outgoing';
                    wrapperClass += isBot ? ' bot' : ' human';
                  }

                  const msgDate = new Date(msg.timestamp);
                  const dateStr = msgDate.toDateString();
                  const showDateSeparator = dateStr !== lastDateStr;
                  lastDateStr = dateStr;

                  // Parse Reactions JSON array
                  let msgReactions = [];
                  try {
                    msgReactions = JSON.parse(msg.reactions || '[]');
                  } catch (e) {}

                  return (
                    <div key={msg.id || index} style={{ display: 'contents' }}>
                      {showDateSeparator && (
                        <div className="date-separator">
                          <span className="date-separator-text">{formatDateHeader(msgDate)}</span>
                        </div>
                      )}
                      
                      <div className="message-row-select-layout">
                        {isSelectMode && (
                          <div className="select-checkbox-container">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSelectMessage(msg.id)}
                              className="message-select-checkbox"
                            />
                          </div>
                        )}

                        <div 
                          className={wrapperClass}
                          onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                          onClick={(e) => {
                            // On mobile, trigger custom action sheet on single click to improve UX
                            if (window.innerWidth <= 768 && !isSelectMode) {
                              handleMessageContextMenu(e, msg);
                            }
                          }}
                        >
                          <div className={`message-bubble ${isSelected ? 'bubble-highlighted' : ''}`} style={{ position: 'relative' }}>
                            {!isClient && (
                              <div className="message-sender-tag">
                                {msg.senderType === 'BOT' ? '🤖 Assistente IA' : 'Atendente'}
                              </div>
                            )}

                            {/* Reply preview header inside bubble */}
                            {msg.replyToId && (
                              <div className="bubble-reply-header">
                                <div className="reply-header-bar" />
                                <div className="reply-header-body">
                                  <span className="reply-header-sender">Mensagem Anterior</span>
                                  <span className="reply-header-text">{msg.replyToContent}</span>
                                </div>
                              </div>
                            )}

                            {/* Media Renderers */}
                            {msg.type === 'image' && msg.mediaUrl && (
                              <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={msg.mediaUrl} alt="WhatsApp Image" style={{ maxWidth: '100%', maxHeight: '250px', display: 'block' }} />
                              </div>
                            )}

                            {msg.type === 'audio' && msg.mediaUrl && (
                              <CustomAudioPlayer src={msg.mediaUrl} />
                            )}

                            {msg.type === 'video' && msg.mediaUrl && (
                              <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px' }}>
                                <video src={msg.mediaUrl} controls style={{ width: '100%', maxHeight: '200px' }} />
                              </div>
                            )}

                            {msg.type === 'document' && msg.mediaUrl && (
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg style={{ width: '24px', height: '24px', color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'underline' }}>
                                  Ver Documento / Arquivo
                                </a>
                              </div>
                            )}

                            {/* Text content or deleted text */}
                            {msg.isDeleted ? (
                              <span className="msg-deleted-text">🚫 Esta mensagem foi apagada</span>
                            ) : (
                              msg.type !== 'audio' && (
                                <span>
                                  {msg.content}
                                  {msg.isEdited && <span className="msg-edited-badge">(editada)</span>}
                                </span>
                              )
                            )}

                            {/* Ticks and time */}
                            <span className="message-time-check">
                              {msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              {!isClient && renderTicks(msg.status)}
                            </span>

                            {/* Floating emoji reactions badge */}
                            {msgReactions.length > 0 && (
                              <div className="bubble-reactions-badge">
                                {msgReactions.map((react, rIdx) => (
                                  <span key={rIdx} title={react.senderType} className="single-reaction-emoji">
                                    {react.emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Exibe erro de entrega se houver */}
                          {msg.sendError && (
                            <div 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                fontSize: '0.72rem', 
                                color: '#ff5c5c', 
                                marginTop: '2px',
                                alignSelf: isClient ? 'flex-start' : 'flex-end',
                                cursor: 'help'
                              }} 
                              title={`Falha ao enviar via WhatsApp API: ${msg.sendError}`}
                            >
                              ⚠️ Não enviado ao lead ({msg.sendError})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Editing mode banner */}
            {editingMessage && (
              <div className="editing-banner-row">
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <span className="editing-title">Editando mensagem</span>
                  <span className="editing-prev-text">{editingMessage.content}</span>
                </div>
                <button onClick={() => { setEditingMessage(null); setEditInputText(''); }} className="btn-close-banner">✕</button>
              </div>
            )}

            {/* Reply mode preview banner */}
            {replyingTo && (
              <div className="reply-preview-banner">
                <div className="reply-preview-bar" />
                <div className="reply-preview-body">
                  <span className="reply-preview-sender">{replyingTo.direction === 'INCOMING' ? 'Cliente' : 'Você'}</span>
                  <span className="reply-preview-text">{replyingTo.content || '[Mídia]'}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="btn-close-banner">✕</button>
              </div>
            )}

            {/* Upload File Preview */}
            {uploadFile && (
              <div className="upload-preview-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📎 <strong>Anexo ({uploadFile.type === 'image' ? 'Imagem' : uploadFile.type === 'video' ? 'Vídeo' : uploadFile.type === 'audio' ? 'Áudio' : 'Documento'}):</strong> {uploadFile.name}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setUploadFile(null)} 
                  style={{ background: 'none', border: 'none', color: '#ff5c5c', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* iOS Action Sheet / Attachment Menu Popup */}
            {showAttachMenu && (
              <div className="ios-action-sheet-overlay" onClick={() => setShowAttachMenu(false)}>
                <div className="ios-action-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="ios-action-sheet-group">
                    <button onClick={() => fileInputRef.current?.click()} className="ios-action-item">
                      📷 Câmera (Fotos e Vídeos)
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="ios-action-item">
                      🖼️ Galeria de Fotos e Vídeos
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="ios-action-item">
                      📄 Documento
                    </button>
                    <button onClick={() => { 
                      setInputText('/obrigado'); 
                      setShowAttachMenu(false); 
                    }} className="ios-action-item">
                      🏷️ Resposta Rápida (/obrigado)
                    </button>
                  </div>
                  <div className="ios-action-sheet-cancel">
                    <button onClick={() => setShowAttachMenu(false)} className="ios-action-item cancel">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input Bar */}
            {editingMessage ? (
              <form onSubmit={handleEditMessageSubmit} className="chat-input-form ios-input-form">
                <input 
                  type="text"
                  value={editInputText}
                  onChange={(e) => setEditInputText(e.target.value)}
                  className="form-input ios-input-field"
                  style={{ flexGrow: 1 }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Salvar</button>
                <button type="button" onClick={() => { setEditingMessage(null); setEditInputText(''); }} className="btn btn-secondary" style={{ padding: '8px 16px' }}>Cancelar</button>
              </form>
            ) : (
              <form onSubmit={handleSendMessage} className="chat-input-form ios-input-form">
                {/* Plus (+) Button for iOS Action Sheet */}
                <button 
                  type="button" 
                  onClick={() => setShowAttachMenu(true)} 
                  className="ios-plus-btn"
                  title="Anexar arquivos"
                >
                  ＋
                </button>

                <input 
                  type="file" 
                  id="file-upload" 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  disabled={uploadProgress || loading || isRecording}
                />

                {/* Text Input Container with internal Camera Icon */}
                <div className="ios-input-field-wrapper">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isRecording 
                        ? "Gravando áudio..." 
                        : uploadFile 
                          ? "Legenda para o arquivo..." 
                          : selectedContact.status === 'AUTO' 
                            ? "Responder desativará o bot..." 
                            : "Mensagem..."
                    }
                    className="form-input ios-input-field"
                    disabled={loading || isRecording}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="ios-inner-camera-btn"
                    title="Enviar foto ou vídeo"
                  >
                    📷
                  </button>
                </div>

                {/* Voice Changer Toggle */}
                {!isRecording && (
                  <button 
                    type="button" 
                    onClick={() => setUseVoiceChanger(!useVoiceChanger)}
                    className={`btn-changer-icon ${useVoiceChanger ? 'active' : ''}`}
                    title={useVoiceChanger ? "Modulador de Voz: Ativo" : "Modulador de Voz: Inativo"}
                  >
                    {useVoiceChanger ? '🎭' : '🗣️'}
                  </button>
                )}

                {/* Microphone recorder */}
                {!isRecording ? (
                  <button 
                    type="button" 
                    onClick={startRecording}
                    className="ios-mic-btn" 
                    title="Gravar Mensagem de Voz"
                    disabled={loading || uploadProgress}
                  >
                    🎙️
                  </button>
                ) : (
                  <div className="ios-recording-row">
                    <span className="led-indicator active" />
                    <span className="ios-rec-seconds">{formatTime(recordingSeconds)}</span>
                    <button 
                      type="button" 
                      onClick={() => stopRecording(true)} 
                      className="btn btn-primary btn-rec-send"
                    >
                      Enviar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => stopRecording(false)} 
                      className="btn btn-secondary btn-rec-cancel"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Send Button */}
                {!isRecording && (
                  <button 
                    type="submit" 
                    className="ios-send-button"
                    disabled={loading || uploadProgress || (!inputText.trim() && !uploadFile)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="send-arrow-svg">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                )}
              </form>
            )}

            {/* Bottom Multi-Select Actions Bar */}
            {isSelectMode && (
              <div className="ios-select-mode-actions-bar">
                <button 
                  onClick={handleDeleteSelected} 
                  disabled={selectedMessageIds.length === 0} 
                  className="ios-select-btn delete"
                >
                  🗑️ Apagar ({selectedMessageIds.length})
                </button>
                <button 
                  onClick={() => {
                    if (selectedMessageIds.length === 0) return;
                    setMessageToForward(null);
                    setShowForwardModal(true);
                  }} 
                  disabled={selectedMessageIds.length === 0} 
                  className="ios-select-btn forward"
                >
                  ➡️ Encaminhar ({selectedMessageIds.length})
                </button>
                <button 
                  onClick={() => {
                    setSelectedMessageIds([]);
                    setIsSelectMode(false);
                  }} 
                  className="ios-select-btn cancel"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Floating Message Action Menu Overlay */}
            {activeMenuMessage && (
              <div 
                className="ios-floating-menu-overlay"
                style={{
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  width: '100vw',
                  height: '100vh',
                  zIndex: 9999,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(10px)'
                }}
                onClick={() => setActiveMenuMessage(null)}
              >
                <div 
                  className="ios-floating-menu-wrapper"
                  style={{
                    position: 'absolute',
                    left: `${menuPosition.x}px`,
                    top: `${menuPosition.y}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '220px',
                    animation: 'scaleIn 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Reactions Box */}
                  <div className="ios-menu-reactions-box">
                    {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => {
                          handleReactToMessage(activeMenuMessage.id, emoji);
                          setActiveMenuMessage(null);
                        }} 
                        className="ios-reaction-emoji-btn"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        const emo = prompt('Digite o emoji desejado:');
                        if (emo) handleReactToMessage(activeMenuMessage.id, emo);
                        setActiveMenuMessage(null);
                      }} 
                      className="ios-reaction-emoji-btn"
                    >
                      ＋
                    </button>
                  </div>

                  {/* Context options */}
                  <div className="ios-menu-options-list">
                    <button onClick={() => {
                      setReplyingTo(activeMenuMessage);
                      setActiveMenuMessage(null);
                    }} className="ios-menu-option-item">
                      Responder <span>↩️</span>
                    </button>
                    
                    <button onClick={() => {
                      navigator.clipboard.writeText(activeMenuMessage.content || '');
                      alert('Copiado para a área de transferência!');
                      setActiveMenuMessage(null);
                    }} className="ios-menu-option-item">
                      Copiar <span>📄</span>
                    </button>

                    <button onClick={() => {
                      setMessageToForward(activeMenuMessage);
                      setShowForwardModal(true);
                      setActiveMenuMessage(null);
                    }} className="ios-menu-option-item">
                      Encaminhar <span>➡️</span>
                    </button>

                    {activeMenuMessage.direction === 'OUTGOING' && activeMenuMessage.senderType === 'HUMAN' && !activeMenuMessage.isDeleted && (
                      <button onClick={() => {
                        setEditingMessage(activeMenuMessage);
                        setEditInputText(activeMenuMessage.content || '');
                        setActiveMenuMessage(null);
                      }} className="ios-menu-option-item">
                        Editar <span>✏️</span>
                      </button>
                    )}

                    <button onClick={() => {
                      handleDeleteMessage(activeMenuMessage.id, 'me');
                      setActiveMenuMessage(null);
                    }} className="ios-menu-option-item text-danger">
                      Apagar para Mim <span>🗑️</span>
                    </button>

                    {activeMenuMessage.direction === 'OUTGOING' && !activeMenuMessage.isDeleted && (
                      <button onClick={() => {
                        handleDeleteMessage(activeMenuMessage.id, 'everyone');
                        setActiveMenuMessage(null);
                      }} className="ios-menu-option-item text-danger">
                        Apagar para Todos <span>🚫</span>
                      </button>
                    )}

                    <button onClick={() => {
                      setIsSelectMode(true);
                      setSelectedMessageIds([activeMenuMessage.id]);
                      setActiveMenuMessage(null);
                    }} className="ios-menu-option-item">
                      Selecionar <span>✔️</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Forward message modal */}
            {showForwardModal && (
              <div className="forward-modal-overlay">
                <div className="forward-modal-container">
                  <div className="forward-modal-header">
                    <h3>Encaminhar mensagem</h3>
                    <button onClick={() => {
                      setShowForwardModal(false);
                      setMessageToForward(null);
                    }} className="btn-close-modal">✕</button>
                  </div>
                  
                  <div className="forward-modal-search">
                    <input 
                      type="text" 
                      placeholder="Buscar contatos..." 
                      className="form-input"
                      value={forwardSearchQuery}
                      onChange={(e) => setForwardSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="forward-modal-contacts-list">
                    {contacts
                      .filter(c => c.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase()))
                      .map(contact => (
                        <div key={contact.id} className="forward-modal-contact-row">
                          <div className="forward-contact-left">
                            <div className="contact-avatar small">
                              {getInitials(contact.name)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="contact-name">{contact.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{contact.id}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (messageToForward) {
                                handleForwardSubmit(contact.id);
                              } else {
                                handleForwardSelectedSubmit(contact.id);
                              }
                            }} 
                            className="btn btn-primary btn-forward-send"
                          >
                            Enviar
                          </button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <svg style={{ width: '64px', height: '64px', marginBottom: '16px', color: 'rgba(255,255,255,0.05)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Nenhum chat aberto</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '350px', textAlign: 'center' }}>
              Selecione um contato na lista lateral ou utilize o simulador para criar interações de teste.
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Sidebar Panel (Profile Details + Client Simulator) */}
      <div className={`simulator-drawer ${!showSimulator ? 'collapsed' : ''}`}>
        {/* Panel Tabs */}
        <div className="simulator-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', width: '100%', marginBottom: '12px' }}>
              <button 
                className={`filter-tab ${rightPanelTab === 'profile' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('profile')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Perfil do Lead
              </button>
              <button 
                className={`filter-tab ${rightPanelTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setRightPanelTab('simulator')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Simulador
              </button>
            </div>
          </div>
        </div>

        {selectedContact && rightPanelTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
            {/* View Mode */}
            {!editProfileMode ? (
              <>
                {/* Profile Header Card */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', borderBottom: '1px solid var(--border-glass)', gap: '12px' }}>
                  {selectedContact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={selectedContact.avatarUrl} 
                      alt="Foto do Lead" 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} 
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-glass-active)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>
                    {selectedContact.name || 'Sem Nome'}
                  </h3>
                  <span className={`badge ${selectedContact.status === 'MANUAL' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {selectedContact.status === 'MANUAL' ? (
                      <>
                        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Atendimento Manual
                      </>
                    ) : (
                      <>
                        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        Robô Ativo
                      </>
                    )}
                  </span>
                </div>

                {/* Profile Fields List */}
                <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>WhatsApp ID (Número)</label>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedContact.id}</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>E-mail</label>
                    <span style={{ fontSize: '0.9rem', color: selectedContact.email ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
                      {selectedContact.email || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Colaborador Responsável</label>
                    <select
                      value={selectedContact.assignedUserId || ''}
                      onChange={async (e) => {
                        const newAssigneeId = e.target.value || null;
                        try {
                          const res = await fetch('/api/chat', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              contactId: selectedContact.id,
                              assignedUserId: newAssigneeId
                            })
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setSelectedContact(prev => ({ 
                              ...prev, 
                              assignedUserId: newAssigneeId, 
                              assignedUser: updated.assignedUser 
                            }));
                            fetchContacts();
                          }
                        } catch (err) {
                          console.error('Error assigning contact:', err);
                        }
                      }}
                      className="form-select"
                      style={{ 
                        width: '100%', 
                        padding: '8px 12px', 
                        fontSize: '0.85rem', 
                        background: 'var(--bg-glass)', 
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Sem Responsável (Fila Geral)</option>
                      {collaborators.map((user) => (
                        <option key={user.id} value={user.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tags</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedContact.tags ? selectedContact.tags.split(',').map((tag, idx) => (
                        <span key={idx} style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}>
                          {tag.trim()}
                        </span>
                      )) : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma tag cadastrada.</span>}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Observações</label>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                      {selectedContact.notes || 'Sem observações.'}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      let defaultProductId = '';
                      let defaultAmount = '';
                      
                      if (selectedContact && selectedContact.activeFlowId) {
                        const activeFlow = flows.find(f => f.id === selectedContact.activeFlowId);
                        if (activeFlow && activeFlow.productId) {
                          defaultProductId = activeFlow.productId;
                          const relatedProduct = products.find(p => p.id === activeFlow.productId);
                          if (relatedProduct) {
                            defaultAmount = String(relatedProduct.price);
                          }
                        }
                      }

                      setManualProductId(defaultProductId);
                      setManualAmount(defaultAmount);
                      setManualSilent(false);
                      setShowManualPayModal(true);
                    }}
                    className="btn" 
                    style={{ justifyContent: 'center', marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                  >
                    💰 Confirmar Pix / Venda Manual
                  </button>

                  <button 
                    onClick={() => setEditProfileMode(true)}
                    className="btn btn-secondary" 
                    style={{ justifyContent: 'center', marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar Dados do Lead
                  </button>
                  
                  <button 
                    onClick={() => setShowSimulator(false)}
                    className="btn btn-primary" 
                    style={{ justifyContent: 'center', marginTop: '8px', background: '#3b82f6', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Fechar Dados
                  </button>
                </div>
              </>
            ) : (
              /* Edit Mode */
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Editar Perfil do Lead</h3>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Nome do Lead</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={profileNameInput} 
                    onChange={(e) => setProfileNameInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">E-mail</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="email@dominio.com"
                    value={profileEmailInput} 
                    onChange={(e) => setProfileEmailInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Foto de Perfil (URL)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="https://link-da-imagem.png"
                    value={profileAvatarInput} 
                    onChange={(e) => setProfileAvatarInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Tags (separadas por vírgula)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Quente, Importante, Teste"
                    value={profileTagsInput} 
                    onChange={(e) => setProfileTagsInput(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Observações</label>
                  <textarea 
                    className="form-textarea" 
                    style={{ minHeight: '80px' }}
                    value={profileNotesInput} 
                    onChange={(e) => setProfileNotesInput(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={handleSaveProfile}
                    className="btn btn-primary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button 
                    onClick={() => setEditProfileMode(false)}
                    className="btn btn-secondary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(!selectedContact || rightPanelTab === 'simulator') && (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {/* Simulador Header */}
            <div style={{ padding: '12px 16px 4px 16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teste local enviando mensagens simuladas</span>
            </div>

            <form onSubmit={handleSimulateWebhook} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={simName} 
                  onChange={(e) => setSimName(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recebido por (Número/Conexão)</label>
                <select
                  value={simConnectionPhoneId}
                  onChange={(e) => setSimConnectionPhoneId(e.target.value)}
                  className="form-select"
                >
                  <option value="sim_phone_id">Padrão do Sistema (Single-Number)</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.whatsappPhoneId}>
                      {conn.name} ({conn.phoneNumber || conn.whatsappPhoneId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Telefone (ID WhatsApp)</label>
                <input 
                  type="text" 
                  value={simPhone} 
                  onChange={(e) => setSimPhone(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Mensagem</label>
                <select 
                  value={simType} 
                  onChange={(e) => setSimType(e.target.value)} 
                  className="form-select"
                >
                  <option value="text">Texto Puro</option>
                  <option value="audio">Áudio (Mensagem Voz)</option>
                  <option value="image">Imagem com Legenda</option>
                </select>
              </div>

              {simType === 'text' && (
                <div className="form-group">
                  <label className="form-label">Mensagem do Cliente</label>
                  <textarea 
                    value={simText} 
                    onChange={(e) => setSimText(e.target.value)} 
                    className="form-textarea" 
                    required
                  />
                </div>
              )}

              {simType === 'image' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Legenda da Imagem</label>
                    <input 
                      type="text" 
                      value={simText} 
                      onChange={(e) => setSimText(e.target.value)} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Media ID da Meta</label>
                    <input 
                      type="text" 
                      value={simMediaId} 
                      onChange={(e) => setSimMediaId(e.target.value)} 
                      className="form-input"
                      placeholder="wamid_test_media_123"
                    />
                  </div>
                </>
              )}

              {simType === 'audio' && (
                <div className="form-group">
                  <label className="form-label">Media ID da Meta</label>
                  <input 
                    type="text" 
                    value={simMediaId} 
                    onChange={(e) => setSimMediaId(e.target.value)} 
                    className="form-input"
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Simular Mensagem Recebida
              </button>
            </form>

            <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Simular Status em Tempo Real</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => handleSimulateTyping('TYPING', 3000)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.75rem', justifyContent: 'center', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Simula cliente digitando por 3 segundos"
                >
                  <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Digitando (3s)
                </button>
                <button 
                  type="button" 
                  onClick={() => handleSimulateTyping('RECORDING', 5000)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.75rem', justifyContent: 'center', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Simula cliente gravando áudio por 5 segundos"
                >
                  <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Gravando (5s)
                </button>
              </div>
            </div>
            
            <div style={{ margin: 'auto 16px 16px', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <svg style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px', color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <strong>Dica de Teste:</strong> Clique em &quot;Simular&quot; para receber a mensagem. A IA responderá na fila em 3 segundos.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {showManualPayModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '28px', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>💰 Registrar Venda / Pix Manual</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                Registre uma transação manual recebida via Pix direto no seu CNPJ. 
                Isso irá disparar a conversão de compra no Meta Pixel (CAPI) e iniciar fluxos de upsell se configurado.
              </p>
            </div>

            <form onSubmit={handleRegisterManualPayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Produto Associado</label>
                <select 
                  className="form-select"
                  value={manualProductId}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    setManualProductId(prodId);
                    const prod = products.find(p => p.id === prodId);
                    if (prod) {
                      setManualAmount(prod.price);
                    }
                  }}
                >
                  <option value="">Sem Produto Específico</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (R$ {p.price})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Valor do Pix (R$) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  step="0.01"
                  min="0.01"
                  placeholder="Ex: 97.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '8px' }}>
                <input 
                  type="checkbox" 
                  id="manualSilent" 
                  checked={manualSilent} 
                  onChange={(e) => setManualSilent(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="manualSilent" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Apenas registrar venda (silencioso - não envia mensagens ou fluxos)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowManualPayModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={registeringManualPay}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: '#22c55e', color: 'white', border: 'none' }}
                  disabled={registeringManualPay}
                >
                  {registeringManualPay ? 'Registrando...' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
