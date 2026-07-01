'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Menu Categories organized by theme and sorted alphabetically inside each category
const menuCategories = [
  {
    title: 'Geral',
    items: [
      {
        name: 'Dashboard',
        href: '/',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        ),
      }
    ]
  },
  {
    title: 'Atendimento',
    items: [
      {
        name: 'CRM & Disparos',
        href: '/crm',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        ),
      },
      {
        name: 'Live Chat',
        href: '/chat',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      }
    ]
  },
  {
    title: 'Marketing',
    items: [
      {
        name: 'Pixels & UTMs',
        href: '/pixels',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        name: 'Tráfego & ROI',
        href: '/traffic',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2M2 4h20a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        ),
      }
    ]
  },
  {
    title: 'Vendas',
    items: [
      {
        name: 'Transações',
        href: '/sales',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        name: 'Galeria',
        href: '/gallery',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Gateways',
        href: '/gateways',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        name: 'Páginas de Vendas',
        href: '/pages',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
        ),
      },
      {
        name: 'Produtos',
        href: '/products',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      }
    ]
  },
  {
    title: 'Automação & Time',
    items: [
      {
        name: 'Agentes IA',
        href: '/agents',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        name: 'Colaboradores',
        href: '/collaborators',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        name: 'Grupos & Canais',
        href: '/groups',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        ),
      }
    ]
  },
  {
    title: 'Sistema',
    items: [
      {
        name: 'Configurações',
        href: '/settings',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        name: 'Logs do Sistema',
        href: '/logs',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        name: 'Consumo de IA',
        href: '/ai-usage',
        icon: (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      }
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Desktop Sidebar (Left-aligned, Glassmorphic, Collapsible) */}
      <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button 
          onClick={toggleCollapse} 
          className="collapse-btn"
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          <svg style={{ width: '12px', height: '12px', transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="logo-container" style={{ marginBottom: '24px' }}>
          <div className="logo-icon">X</div>
          <div className="logo-text">X botting</div>
        </div>
        
        {/* Desktop Navigation organized by Category */}
        <nav style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
          {menuCategories.map((category) => (
            <div key={category.title} style={{ marginBottom: '20px' }}>
              {!isCollapsed ? (
                <span className="category-title">
                  {category.title}
                </span>
              ) : (
                <div className="category-divider" />
              )}
              <ul className="nav-list" style={{ marginTop: '8px' }}>
                {category.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href} 
                        className={`nav-link ${isActive ? 'active' : ''}`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        {item.icon}
                        <span className="nav-link-text">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Theme Switcher Toggle */}
        <div style={{ padding: '0 8px', marginBottom: '8px' }}>
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: '10px 14px', 
              fontSize: '0.82rem',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.02)',
              height: '40px',
              margin: 0
            }}
            title={isCollapsed ? (theme === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro') : undefined}
          >
            {theme === 'light' ? (
              <svg style={{ width: '16px', height: '16px', color: '#eab308' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
              </svg>
            ) : (
              <svg style={{ width: '16px', height: '16px', color: '#a5b4fc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {!isCollapsed && (
              <span style={{ fontWeight: 500, marginLeft: '8px' }}>
                {theme === 'light' ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            )}
          </button>
        </div>

        {/* User profile & Logout */}
        {user && (
          <div className="user-profile-container">
            <div className="user-info-row">
              <div className="avatar-circle">
                {getInitials(user.name)}
              </div>
              <div className="user-details-wrapper">
                <span className="user-name-text">
                  {user.name}
                </span>
                <span className="user-email-text">
                  {user.email}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="btn btn-secondary logout-btn"
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="logout-text">Sair</span>
            </button>
          </div>
        )}
        
        <div 
          className="version-text"
          style={{ borderTop: user ? 'none' : '1px solid var(--border-glass)' }}
        >
          {isCollapsed ? 'v1.0.0' : 'X botting v1.0.0'}
        </div>
      </aside>

      {/* Mobile Top Header Bar */}
      <div className="mobile-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>X</div>
          <span className="logo-text" style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>X botting</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)} 
          className="hamburger-btn"
          aria-label="Abrir menu"
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        <Link href="/" className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
          <span className="mobile-nav-label">Dashboard</span>
        </Link>
        
        <Link href="/chat" className={`mobile-nav-item ${pathname === '/chat' ? 'active' : ''}`}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="mobile-nav-label">Chat</span>
        </Link>

        <Link href="/crm" className={`mobile-nav-item ${pathname === '/crm' ? 'active' : ''}`}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <span className="mobile-nav-label">CRM</span>
        </Link>

        <button onClick={() => setIsMobileOpen(true)} className={`mobile-nav-item ${isMobileOpen ? 'active' : ''}`}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="mobile-nav-label">Mais</span>
        </button>
      </div>

      {/* Mobile Nav Backdrop Overlay */}
      <div 
        className={`sidebar-backdrop ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Nav Drawer Sheet (Slides up from the bottom for native feel) */}
      <div className={`mobile-nav-drawer-sheet ${isMobileOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-indicator" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '12px' }}>
            <span className="mobile-drawer-title">Menu Principal</span>
            <button onClick={() => setIsMobileOpen(false)} className="mobile-drawer-close-btn">
              ✕
            </button>
          </div>
        </div>
        
        <div className="mobile-drawer-content no-scrollbar">
          <div className="mobile-grid-categories">
            {menuCategories.map((category) => (
              <div key={category.title} className="mobile-category-block">
                <span className="mobile-category-title">{category.title}</span>
                <div className="mobile-category-grid">
                  {category.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.name}
                        href={item.href}
                        className={`mobile-grid-link ${isActive ? 'active' : ''}`}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <div className="mobile-grid-icon-wrapper">
                          {item.icon}
                        </div>
                        <span className="mobile-grid-text">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Theme switcher & User profile inside mobile sheet */}
          <div className="mobile-drawer-footer">
            <button 
              onClick={toggleTheme} 
              className="btn btn-secondary mobile-theme-btn"
            >
              {theme === 'light' ? (
                <>
                  <svg style={{ width: '16px', height: '16px', color: '#eab308' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
                  </svg>
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <svg style={{ width: '16px', height: '16px', color: '#a5b4fc' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Modo Escuro</span>
                </>
              )}
            </button>

            {user && (
              <div className="mobile-user-profile" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar-circle">
                    {getInitials(user.name)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span className="user-name-text" style={{ fontSize: '0.85rem' }}>{user.name}</span>
                    <span className="user-email-text" style={{ fontSize: '0.75rem' }}>{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="btn btn-secondary logout-btn"
                  style={{ width: '100%', margin: 0, justifyContent: 'center' }}
                >
                  <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
