'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

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

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
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
    },
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
      name: 'Configurações',
      href: '/settings',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
  ];

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

  const renderSidebarContent = (isMobile = false) => (
    <>
      <div className="logo-container" style={{ marginBottom: isMobile ? '24px' : '32px' }}>
        <div className="logo-icon">X</div>
        <div className="logo-text">X bot</div>
      </div>
      
      <nav style={{ flexGrow: 1 }}>
        <ul className="nav-list">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (isMobile) setIsMobileOpen(false);
                  }}
                  title={(!isMobile && isCollapsed) ? item.name : undefined}
                >
                  {item.icon}
                  <span className="nav-link-text">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

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
        {(!isMobile && isCollapsed) ? 'v1.0.0' : 'X bot v1.0.0'}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
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
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Top Header Bar */}
      <div className="mobile-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>X</div>
          <span className="logo-text" style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>X bot</span>
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

      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Nav Drawer */}
      <div className={`sidebar-nav-drawer ${isMobileOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="hamburger-btn"
            style={{ padding: '6px' }}
            aria-label="Fechar menu"
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {renderSidebarContent(true)}
      </div>
    </>
  );
}
