import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [repsList, setRepsList] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const [editingUser, setEditingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingName, setEditingName] = useState(null); // user para editar nome
  const [tempName, setTempName] = useState('');

  // Estado para gestão de permissões
  const [managingPerms, setManagingPerms] = useState(null);
  const [tempRole, setTempRole] = useState('USER');
  const [tempModules, setTempModules] = useState([]);
  const [tempReps, setTempReps] = useState([]);

  const modules = [
    { id: 'all', label: 'Visão Geral' },
    { id: 'CRM_PIPELINE', label: 'CRM - Pipeline' },
    { id: 'CRM_FOLLOWUP', label: 'CRM - Follow Up' },
    { id: 'CRM_AGENDA', label: 'CRM - Agenda' },
    { id: 'CRM_TAREFAS', label: 'CRM - Tarefas' },
    { id: 'OV', label: 'Orçamentos' },
    { id: 'PD', label: 'Pedidos' },
    { id: 'DV', label: 'Desenvolvimentos' },
    { id: 'FAT', label: 'Faturamento' },
    { id: 'RANKING', label: 'Meta x Realizado' },
    { id: 'METAS', label: 'Gestão de Metas' },
    { id: 'USERS', label: 'Gestão de Usuários' },
    { id: 'COMISSOES_GERAL', label: 'Comissões - Visão Geral' },
    { id: 'COMISSOES_REPS', label: 'Comissões - Representantes' },
    { id: 'COMISSOES_GERENTE', label: 'Comissões - Gerente' },
    { id: 'COMISSOES_SUPERVISOR', label: 'Comissões - Supervisor' },
    { id: 'COMISSOES_EXECUTIVO', label: 'Comissões - Executivo' },
    { id: 'COMISSOES_ASSISTENTE', label: 'Comissões - Assistente' },
    { id: 'PAGAMENTOS', label: 'Controle de Pagamentos' },
  ];

  const fetchData = async () => {
    setFetchLoading(true);
    try {
      const [usersRes, permsRes, repsRes] = await Promise.all([
        fetch('/api/auth/users'),
        fetch('/api/auth/permissions'),
        fetch('/api/representantes')
      ]);

      if (usersRes.ok && permsRes.ok && repsRes.ok) {
        const usersData = await usersRes.json();
        const permsData = await permsRes.json();
        const repsData = await repsRes.json();
        setUsers(usersData);
        setPermissions(permsData);
        setRepsList(Array.isArray(repsData) ? repsData : []);
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');

      setMessage(`Usuário ${name || email} criado com sucesso!`);
      setName('');
      setEmail('');
      setPassword('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: managingPerms.id,
          role: tempRole,
          allowed_modules: tempRole === 'ADMIN' ? modules.map(m => m.id) : tempModules,
          linked_reps: tempRole === 'ADMIN' ? [] : tempReps
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar permissões');
      
      setMessage(`Permissões de ${managingPerms.email} atualizadas!`);
      setManagingPerms(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserPerm = (userId) => {
    return permissions.find(p => p.user_id === userId) || { role: 'USER', allowed_modules: ['all'] };
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${editingName.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName }),
      });
      if (!res.ok) throw new Error('Erro ao salvar nome');
      setMessage(`Nome de ${editingName.email} atualizado!`);
      setEditingName(null);
      setTempName('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    if (tempModules.includes(moduleId)) {
      setTempModules(tempModules.filter(id => id !== moduleId));
    } else {
      setTempModules([...tempModules, moduleId]);
    }
  };

  const toggleRep = (repCodigo) => {
    const codeStr = repCodigo.toString();
    if (tempReps.includes(codeStr)) {
      setTempReps(tempReps.filter(id => id !== codeStr));
    } else {
      setTempReps([...tempReps, codeStr]);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error('Erro ao salvar nova senha');
      setMessage(`Senha de ${editingUser.email} atualizada!`);
      setEditingUser(null);
      setNewPassword('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Formulário de Criação */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700' }}>Criar Novo Usuário</h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>NOME</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>E-MAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>SENHA</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }} required />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '0.6rem', backgroundColor: 'var(--sidebar-item-active)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
              {loading ? 'PROCESSANDO...' : 'CRIAR USUÁRIO'}
            </button>
          </form>
        </div>

        {/* Lista de Usuários */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <h2 style={{ marginBottom: '1.25rem', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700' }}>Usuários e Permissões</h2>
          {fetchLoading ? (
            <p>Carregando...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--panel-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.7rem' }}>USUÁRIO</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem' }}>PERFIL</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const perm = getUserPerm(u.id);
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{u.user_metadata?.name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>{u.email}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Criado em: {new Date(u.created_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700',
                          backgroundColor: perm.role === 'ADMIN' ? '#fef3c7' : '#f1f5f9',
                          color: perm.role === 'ADMIN' ? '#92400e' : '#475569'
                        }}>
                          {perm.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setEditingName(u); setTempName(u.user_metadata?.name || ''); }}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          ✏️ Nome
                        </button>
                        <button 
                          onClick={() => {
                            setManagingPerms(u);
                            setTempRole(perm.role);
                            setTempModules(perm.allowed_modules || []);
                            setTempReps(perm.linked_reps || []);
                          }}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          Permissões
                        </button>
                        <button 
                          onClick={() => setEditingUser(u)}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          Senha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Edição de Nome */}
      {editingName && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Editar Nome</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>{editingName.email}</p>
            <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>NOME DE EXIBIÇÃO</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  placeholder="Ex: João Silva"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                  {loading ? 'SALVANDO...' : 'SALVAR NOME'}
                </button>
                <button type="button" onClick={() => setEditingName(null)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Senha */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Alterar Senha</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>{editingUser.email}</p>
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.4rem', color: '#64748b' }}>NOVA SENHA</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                  {loading ? 'ATUALIZANDO...' : 'SALVAR SENHA'}
                </button>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {managingPerms && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Gerenciar Acesso: {managingPerms.email}</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>PERFIL</label>
              <select 
                value={tempRole} 
                onChange={(e) => setTempRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="USER">USUÁRIO (Acesso Restrito)</option>
                <option value="ADMIN">ADMIN (Acesso Total)</option>
              </select>
            </div>

            {tempRole === 'USER' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>MÓDULOS PERMITIDOS</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {modules.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={tempModules.includes(m.id)} 
                          onChange={() => toggleModule(m.id)}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>REPRESENTANTES VINCULADOS</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                    {repsList.map(rep => (
                      <label key={rep.CODIGO} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={tempReps.includes(rep.CODIGO.toString())} 
                          onChange={() => toggleRep(rep.CODIGO)}
                        />
                        {rep.NOME}
                      </label>
                    ))}
                    {repsList.length === 0 && <p style={{ fontSize: '0.8rem', color: '#666', gridColumn: 'span 2' }}>Nenhum representante encontrado.</p>}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSavePermissions} disabled={loading} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </button>
              <button onClick={() => setManagingPerms(null)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#ddd', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedbacks */}
      {(message || error) && (
        <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: message ? '#ecfdf5' : '#fef2f2', border: `1px solid ${message ? '#a7f3d0' : '#fecaca'}`, color: message ? '#059669' : '#dc2626', fontSize: '0.85rem' }}>
          {message || error}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
