import React, { useState, useEffect } from 'react';

const FollowUpList = ({ startDate, endDate, representante }) => {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ tipo: '', descricao: '' });

  const [activityFilter, setActivityFilter] = useState(() => localStorage.getItem('crm_activity_filter') || 'TODOS');

  const fetchAllFollowUps = async () => {
    try {
      const response = await fetch('/api/crm/followup/all');
      if (response.ok) {
        const data = await response.json();
        setFollowUps(data);
      }
    } catch (err) {
      console.error("Erro ao buscar todos os follow ups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFollowUps();

    const handleFilterChange = () => {
      setActivityFilter(localStorage.getItem('crm_activity_filter') || 'TODOS');
    };

    window.addEventListener('crm_filter_change', handleFilterChange);
    return () => window.removeEventListener('crm_filter_change', handleFilterChange);
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      const response = await fetch(`/api/crm/followup/${deleteConfirmation}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDeleteConfirmation(null);
        fetchAllFollowUps();
      }
    } catch (err) {
      console.error("Erro ao excluir follow up:", err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFollowUp || !editForm.descricao.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/crm/followup/${editingFollowUp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        setEditingFollowUp(null);
        fetchAllFollowUps();
      }
    } catch (err) {
      console.error("Erro ao editar follow up:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (f) => {
    setEditingFollowUp(f);
    setEditForm({ tipo: f.tipo, descricao: f.descricao });
  };

  const getActivityStyle = (tipo) => {
    const t = tipo?.toUpperCase();
    switch(t) {
      case 'E-MAIL': return { icon: '📧', color: '#3b82f6', bg: '#eff6ff' };
      case 'VISITA': return { icon: '🚗', color: '#f59e0b', bg: '#fffbeb' };
      case 'TELEFONEMA': return { icon: '📞', color: '#8b5cf6', bg: '#f5f3ff' };
      case 'WHATSAPP': return { icon: '💬', color: '#10b981', bg: '#ecfdf5' };
      case 'AGENDA': return { icon: '📅', color: '#64748b', bg: '#f8fafc' };
      default: return { icon: '📎', color: '#94a3b8', bg: '#f1f5f9' };
    }
  };

  const filteredFollowUps = followUps.filter(f => {
    // Filtro de Pesquisa
    const matchesSearch = 
      f.CLIENTE_NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.ped_in_codigo.toString().includes(searchTerm) ||
      f.REP_NOME.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de Atividade
    const matchesActivity = activityFilter === 'TODOS' || f.tipo?.toUpperCase() === activityFilter;

    // Filtro de Representante
    const matchesRep = !representante || f.rep_in_codigo?.toString() === representante.toString();

    // Filtro de Data (Inclusão)
    let matchesDate = true;
    if (startDate || endDate) {
      const contactDate = new Date(f.data_contato);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (contactDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (contactDate > end) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesActivity && matchesRep && matchesDate;
  });

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando histórico...</div>;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem',
        backgroundColor: '#ffffff',
        padding: '1.25rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>HISTÓRICO GERAL DE FOLLOW UP</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>{filteredFollowUps.length} registros encontrados</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input 
            type="text" 
            placeholder="Pesquisar por cliente, pedido, representante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              width: '350px',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredFollowUps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#ffffff', borderRadius: '8px', color: '#94a3b8' }}>
            Nenhum registro encontrado.
          </div>
        ) : (
          filteredFollowUps.map((f, idx) => {
            const style = getActivityStyle(f.tipo);
            return (
              <div key={f.id || idx} style={{ 
                backgroundColor: '#ffffff', 
                padding: '1rem 1.25rem', 
                borderRadius: '10px', 
                border: '1px solid #e2e8f0',
                borderLeft: `4px solid ${style.color}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                display: 'flex',
                gap: '1.25rem',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}>
                {/* Coluna de Info do Pedido */}
                <div style={{ flex: 1, borderRight: '1px solid #f1f5f9', paddingRight: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '900', 
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>#{f.ped_in_codigo}</span>
                    <span style={{ fontSize: '0.6rem', color: '#cbd5e1', fontWeight: '800', letterSpacing: '0.05em' }}>{f.ser_st_codigo}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.25rem' }}>
                    {f.CLIENTE_NOME}
                  </div>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: '#94a3b8', 
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <span style={{ color: style.color, fontSize: '0.8rem' }}>👤</span> {f.REP_NOME}
                  </div>
                </div>

                {/* Coluna do Follow Up */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      backgroundColor: style.bg,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '15px'
                    }}>
                      <span style={{ fontSize: '0.8rem' }}>{style.icon}</span>
                      <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: '900', 
                        textTransform: 'uppercase', 
                        color: style.color, 
                        letterSpacing: '0.05em' 
                      }}>{f.tipo}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: '700' }}>
                        {new Date(f.data_contato).toLocaleString('pt-BR')}
                      </span>
                      <div style={{ display: 'flex', gap: '0.1rem' }}>
                        <button 
                          onClick={() => startEdit(f)}
                          title="Editar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#94a3b8', padding: '0.3rem', borderRadius: '4px' }}
                        >✏️</button>
                        <button 
                          onClick={() => setDeleteConfirmation(f.id)}
                          title="Excluir"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#94a3b8', padding: '0.3rem', borderRadius: '4px' }}
                        >🗑️</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#475569', 
                    lineHeight: '1.5', 
                    whiteSpace: 'pre-wrap',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #f1f5f9'
                  }}>
                    {f.descricao}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Edição */}
      {editingFollowUp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '12px',
            width: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Editar Apontamento</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>TIPO</label>
              <select 
                value={editForm.tipo}
                onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
              >
                <option value="E-MAIL">E-MAIL</option>
                <option value="VISITA">VISITA</option>
                <option value="TELEFONEMA">TELEFONEMA</option>
                <option value="WHATSAPP">WHATSAPP</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>DESCRIÇÃO</label>
              <textarea 
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setEditingFollowUp(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
              >CANCELAR</button>
              <button 
                onClick={handleSaveEdit}
                disabled={saving || !editForm.descricao.trim()}
                style={{ flex: 1, padding: '0.7rem', borderRadius: '6px', border: 'none', backgroundColor: 'var(--accent-color)', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmation && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '12px',
            width: '350px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Confirmar Exclusão</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Tem certeza que deseja remover este apontamento? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setDeleteConfirmation(null)}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
              >CANCELAR</button>
              <button 
                onClick={handleDelete}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
              >EXCLUIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpList;
