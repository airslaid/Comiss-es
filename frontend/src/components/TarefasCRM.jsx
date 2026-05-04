import React, { useState, useEffect } from 'react';
import TarefaModal from './TarefaModal';

const TarefasCRM = ({ allowedRepsList, permissions, session }) => {
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [representante, setRepresentante] = useState('ALL');
  const [status, setStatus] = useState('Pendente');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTarefas = async () => {
    setLoading(true);
    try {
      let repQuery = representante;
      if (representante === 'ALL') {
        if (permissions?.role !== 'ADMIN' && permissions?.linked_reps?.length > 0) {
          repQuery = permissions.linked_reps.join(',');
        }
      }

      const query = new URLSearchParams({
        ...(repQuery && repQuery !== 'ALL' && { representante: repQuery }),
        ...(status !== 'ALL' && { status })
      }).toString();

      const res = await fetch(`/api/crm/tarefas?${query}`);
      const data = await res.json();
      setTarefas(data || []);
    } catch (err) {
      console.error("Erro ao buscar tarefas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarefas();
  }, [representante, status, permissions]);

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;
    try {
      await fetch(`/api/crm/tarefas/${id}`, { method: 'DELETE' });
      fetchTarefas();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'Pendente' ? 'Concluida' : 'Pendente';
    try {
      await fetch(`/api/crm/tarefas/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      fetchTarefas();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (prio) => {
    switch(prio) {
      case 'Alta': return '#ef4444';
      case 'Media': return '#eab308';
      case 'Baixa': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const userName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Desconhecido';

  return (
    <div className="crm-tarefas-container" style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', minHeight: 'calc(100vh - 150px)' }}>
      
      {/* Header / Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            >
              <option value="ALL">Todas as Tarefas</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluida">Concluídas</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Responsável</label>
            <select 
              value={representante} 
              onChange={e => setRepresentante(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '200px' }}
            >
              <option value="ALL">Todos</option>
              {allowedRepsList.map(r => (
                <option key={r.CODIGO} value={r.CODIGO}>{r.NOME}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          style={{ 
            backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '6px',
            padding: '0.6rem 1.25rem', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.2)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          NOVA TAREFA
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando tarefas...</div>
      ) : tarefas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          Nenhuma tarefa encontrada para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {tarefas.map(task => (
            <div key={task.id} style={{ 
              backgroundColor: 'white', borderRadius: '8px', padding: '1.25rem', 
              border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
              opacity: task.status === 'Concluida' ? 0.7 : 1,
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={task.status === 'Concluida'}
                    onChange={() => toggleStatus(task)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                    title={task.status === 'Concluida' ? "Marcar como Pendente" : "Marcar como Concluída"}
                  />
                  <h3 style={{ 
                    margin: 0, fontSize: '1rem', color: '#1e293b', 
                    textDecoration: task.status === 'Concluida' ? 'line-through' : 'none' 
                  }}>{task.titulo}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ 
                    backgroundColor: `${getPriorityColor(task.prioridade)}20`, color: getPriorityColor(task.prioridade), 
                    padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' 
                  }}>
                    {task.prioridade}
                  </span>
                </div>
              </div>

              {task.descricao && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-wrap', textDecoration: task.status === 'Concluida' ? 'line-through' : 'none' }}>
                  {task.descricao}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#475569', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Responsável">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {task.rep_nome}
                </div>
                
                {task.vencimento && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: (new Date(task.vencimento) < new Date() && task.status === 'Pendente') ? '#ef4444' : '#475569' }} title="Vencimento">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                  </div>
                )}

                {task.cliente_nome && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Cliente">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    {task.cliente_nome}
                  </div>
                )}
              </div>

              <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                 <button 
                  onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '0.2rem' }}
                  title="Editar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button 
                  onClick={() => handleDelete(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                  title="Excluir"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <TarefaModal 
          onClose={() => setIsModalOpen(false)}
          onSave={fetchTarefas}
          repsList={allowedRepsList}
          currentUser={userName}
          editingTask={editingTask}
        />
      )}
    </div>
  );
};

export default TarefasCRM;
