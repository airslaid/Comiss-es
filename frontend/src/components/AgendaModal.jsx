import React, { useState, useEffect } from 'react';

const AgendaModal = ({ isOpen, onClose, onSave, repsList, currentUser, editingEvent }) => {
  const isEdit = !!editingEvent;

  const [repInCodigo, setRepInCodigo] = useState('');
  const [assunto, setAssunto] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaTermino, setHoraTermino] = useState('10:00');
  const [atividade, setAtividade] = useState('Visita');
  const [prioridade, setPrioridade] = useState('Media');
  const [clienteNome, setClienteNome] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingEvent) {
      setRepInCodigo(editingEvent.rep_in_codigo?.toString() || '');
      setAssunto(editingEvent.assunto || '');
      setDataInicio(editingEvent.data_inicio?.split('T')[0] || '');
      setHoraInicio(editingEvent.hora_inicio ? String(editingEvent.hora_inicio).substring(0, 5) : '09:00');
      setHoraTermino(editingEvent.hora_termino ? String(editingEvent.hora_termino).substring(0, 5) : '10:00');
      setAtividade(editingEvent.atividade || 'Visita');
      setPrioridade(editingEvent.prioridade || 'Media');
      setClienteNome(editingEvent.cliente_nome || '');
      setLocal(editingEvent.local || '');
      setDescricao(editingEvent.descricao || '');
    } else {
      // Reset on new
      setRepInCodigo('');
      setAssunto('');
      setDataInicio('');
      setHoraInicio('09:00');
      setHoraTermino('10:00');
      setAtividade('Visita');
      setPrioridade('Media');
      setClienteNome('');
      setLocal('');
      setDescricao('');
    }
  }, [editingEvent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const rep = repsList.find(r => r.CODIGO.toString() === repInCodigo.toString());
    const repNome = rep ? rep.NOME : (editingEvent?.rep_nome || 'Desconhecido');

    const payload = {
      rep_in_codigo: repInCodigo,
      rep_nome: repNome,
      assunto,
      data_inicio: dataInicio,
      hora_inicio: horaInicio,
      hora_termino: horaTermino,
      atividade,
      prioridade,
      cliente_nome: clienteNome,
      local,
      descricao,
      criado_por: currentUser || 'Desconhecido'
    };

    try {
      const url = isEdit
        ? `/api/crm/agenda/${editingEvent.id}`
        : '/api/crm/agenda';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Erro ao salvar compromisso");

      onSave();
      onClose();
    } catch (err) {
      alert("Erro ao salvar compromisso: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const modalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  };

  const contentStyle = {
    backgroundColor: 'white', borderRadius: '8px', width: '100%',
    maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'
  };

  const headerStyle = {
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  };

  const formStyle = { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' };

  const labelStyle = {
    display: 'block', fontSize: '0.7rem', fontWeight: '700',
    color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase'
  };

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem',
    border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', outline: 'none'
  };

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {isEdit ? 'EDITAR COMPROMISSO' : 'NOVO COMPROMISSO'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label style={labelStyle}>RESPONSÁVEL *</label>
            <select style={inputStyle} value={repInCodigo} onChange={e => setRepInCodigo(e.target.value)} required>
              <option value="">Selecionar Representante...</option>
              {repsList.map(rep => (
                <option key={rep.CODIGO} value={rep.CODIGO}>{rep.NOME}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>ASSUNTO *</label>
            <input style={inputStyle} placeholder="Ex: Visita Técnica Mensal" value={assunto} onChange={e => setAssunto(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>DATA DE INÍCIO *</label>
              <input type="date" style={inputStyle} value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>HORA DE INÍCIO *</label>
              <input type="time" style={inputStyle} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>HORA DE TÉRMINO *</label>
              <input type="time" style={inputStyle} value={horaTermino} onChange={e => setHoraTermino(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={labelStyle}>ATIVIDADE *</label>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {['E-mail', 'Visita', 'Telefonema', 'WhatsApp', 'Compromisso'].map(act => (
                <label key={act} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="radio" name="atividade" value={act} checked={atividade === act} onChange={e => setAtividade(e.target.value)} />
                  {act}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>PRIORIDADE *</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {[{id: 'Baixa', color: '#10b981'}, {id: 'Media', color: '#eab308'}, {id: 'Alta', color: '#f97316'}, {id: 'Critica', color: '#ef4444'}].map(pri => (
                <label key={pri.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <input type="radio" name="prioridade" value={pri.id} checked={prioridade === pri.id} onChange={e => setPrioridade(e.target.value)} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: pri.color }}></span>
                  {pri.id}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>CONTA (CLIENTE)</label>
              <input style={inputStyle} placeholder="Nome do cliente..." value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>LOCAL</label>
              <input style={inputStyle} placeholder="Endereço ou Link Reunião" value={local} onChange={e => setLocal(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>DESCRIÇÃO</label>
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Detalhes do compromisso..." value={descricao} onChange={e => setDescricao(e.target.value)}></textarea>
          </div>

          {isEdit && (
            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b' }}>
              ✍️ Incluído por: <strong>{editingEvent.criado_por || 'Desconhecido'}</strong>
            </div>
          )}

          <div style={{ padding: '1rem 0 0', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>
              CANCELAR
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '4px', backgroundColor: '#e11d48', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', color: 'white' }}>
              {loading ? 'SALVANDO...' : (isEdit ? 'SALVAR ALTERAÇÕES' : 'SALVAR COMPROMISSO')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgendaModal;
