import React, { useState, useEffect } from 'react';

const TarefaModal = ({ onClose, onSave, repsList, currentUser, editingTask }) => {
  const isEdit = !!editingTask;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [repInCodigo, setRepInCodigo] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [prioridade, setPrioridade] = useState('Media');
  const [status, setStatus] = useState('Pendente');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && editingTask) {
      setTitulo(editingTask.titulo || '');
      setDescricao(editingTask.descricao || '');
      setRepInCodigo(editingTask.rep_codigo ? editingTask.rep_codigo.toString() : '');
      setVencimento(editingTask.vencimento ? editingTask.vencimento.split('T')[0] : '');
      setClienteNome(editingTask.cliente_nome || '');
      setPrioridade(editingTask.prioridade || 'Media');
      setStatus(editingTask.status || 'Pendente');
    }
  }, [isEdit, editingTask]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo || !repInCodigo || !prioridade || !status) {
      alert("Preencha os campos obrigatórios (*).");
      return;
    }

    setLoading(true);

    const rep = repsList.find(r => r.CODIGO.toString() === repInCodigo.toString());
    const repNome = rep ? rep.NOME : (editingTask?.rep_nome || 'Desconhecido');

    const payload = {
      titulo,
      descricao,
      rep_codigo: repInCodigo,
      rep_nome: repNome,
      vencimento: vencimento || null,
      cliente_nome: clienteNome,
      prioridade,
      status,
      criado_por: currentUser || 'Desconhecido'
    };

    try {
      const url = isEdit
        ? `http://localhost:3001/api/crm/tarefas/${editingTask.id}`
        : 'http://localhost:3001/api/crm/tarefas';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Erro ao salvar tarefa");

      onSave();
      onClose();
    } catch (err) {
      alert("Erro ao salvar tarefa: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
    padding: '1rem'
  };

  const contentStyle = {
    backgroundColor: 'white', borderRadius: '8px', width: '100%',
    maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  };

  const headerStyle = {
    padding: '1.5rem', borderBottom: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };

  const bodyStyle = { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' };

  const footerStyle = {
    padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'flex-end', gap: '1rem',
    backgroundColor: '#f8fafc', borderRadius: '0 0 8px 8px'
  };

  const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 };
  
  const labelStyle = { fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  
  const inputStyle = {
    padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1',
    fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff', color: '#1e293b'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 18h.01"></path>
              <path d="M12 18h.01"></path>
              <path d="M16 18h.01"></path>
            </svg>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase' }}>
              {isEdit ? 'EDITAR TAREFA' : 'NOVA TAREFA'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={bodyStyle}>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>TÍTULO DA TAREFA <span style={{color: '#ef4444'}}>*</span></label>
              <input
                type="text"
                placeholder="Ex: Enviar catálogo atualizado"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>DESCRIÇÃO DETALHADA</label>
              <textarea
                placeholder="Detalhes sobre a tarefa..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ ...inputGroupStyle, minWidth: '250px' }}>
                <label style={labelStyle}>RESPONSÁVEL <span style={{color: '#ef4444'}}>*</span></label>
                <select 
                  value={repInCodigo} 
                  onChange={e => setRepInCodigo(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecionar Representante...</option>
                  {repsList.map(r => (
                    <option key={r.CODIGO} value={r.CODIGO}>{r.NOME}</option>
                  ))}
                </select>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>DATA DE VENCIMENTO</label>
                <input
                  type="date"
                  value={vencimento}
                  onChange={e => setVencimento(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>VINCULAR CLIENTE (OPCIONAL)</label>
              <input
                type="text"
                placeholder="Digite para buscar cliente..."
                value={clienteNome}
                onChange={e => setClienteNome(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>PRIORIDADE <span style={{color: '#ef4444'}}>*</span></label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input type="radio" name="prioridade" value="Baixa" checked={prioridade === 'Baixa'} onChange={() => setPrioridade('Baixa')} style={{ accentColor: '#10b981' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                    Baixa
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input type="radio" name="prioridade" value="Media" checked={prioridade === 'Media'} onChange={() => setPrioridade('Media')} style={{ accentColor: '#eab308' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308', display: 'inline-block' }}></span>
                    Média
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input type="radio" name="prioridade" value="Alta" checked={prioridade === 'Alta'} onChange={() => setPrioridade('Alta')} style={{ accentColor: '#ef4444' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                    Alta
                  </label>
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>STATUS <span style={{color: '#ef4444'}}>*</span></label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input type="radio" name="status" value="Pendente" checked={status === 'Pendente'} onChange={() => setStatus('Pendente')} style={{ accentColor: '#e11d48' }} />
                    Pendente
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input type="radio" name="status" value="Concluida" checked={status === 'Concluida'} onChange={() => setStatus('Concluida')} style={{ accentColor: '#e11d48' }} />
                    Concluída
                  </label>
                </div>
              </div>

            </div>

          </div>

          <div style={footerStyle}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem', backgroundColor: 'transparent', color: '#475569',
                border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              CANCELAR
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                padding: '0.6rem 1.25rem', backgroundColor: '#e11d48', color: 'white',
                border: 'none', borderRadius: '6px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'SALVANDO...' : 'SALVAR TAREFA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TarefaModal;
