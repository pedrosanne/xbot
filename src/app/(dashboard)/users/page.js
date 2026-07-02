'use client';

import { useState, useEffect } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockRegistrations, setBlockRegistrations] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setBlockRegistrations(data.blockRegistrations || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleToggleBlockRegistrations = async (checked) => {
    setBlockRegistrations(checked);
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockRegistrations: checked })
      });

      if (!res.ok) throw new Error('Falha ao salvar configuração');
      alert(checked ? 'Novos cadastros bloqueados' : 'Cadastros liberados');
    } catch (error) {
      console.error('Error saving setting:', error);
      alert('Erro ao salvar configuração');
      setBlockRegistrations(!checked); // revert
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (email === 'ilovsoftware@gmail.com') {
      alert('O administrador não pode ser excluído.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Usuário excluído com sucesso');
        setUsers(users.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário');
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>Controle de Usuários</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>Gerencie os acessos ao painel administrativo</p>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>Bloquear Novos Cadastros</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Impede que novas contas sejam criadas na tela de login/registro.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={blockRegistrations}
              onChange={(e) => handleToggleBlockRegistrations(e.target.checked)}
              disabled={savingSettings}
            />
            <div className="w-11 h-6 bg-[rgba(255,255,255,0.1)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
          </label>
        </div>

        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando usuários...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nome</th>
                    <th style={{ padding: '16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>E-mail</th>
                    <th style={{ padding: '16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Criado em</th>
                    <th style={{ padding: '16px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum usuário encontrado</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '500' }}>{user.name}</div>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{user.email}</td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {user.email === 'ilovsoftware@gmail.com' ? (
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                              Admin
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              style={{ color: '#ff5c5c', fontWeight: '500', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              Excluir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
