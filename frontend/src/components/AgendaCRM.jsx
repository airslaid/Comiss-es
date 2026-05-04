import React, { useState, useEffect } from 'react';
import AgendaModal from './AgendaModal';

const AgendaCRM = ({ allowedRepsList, session }) => {
  const [viewMode, setViewMode] = useState('calendario'); // 'lista' ou 'calendario'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros
  const [representante, setRepresentante] = useState('');
  const [atividade, setAtividade] = useState('Todas Atividades');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);

  const getMonthStartEnd = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { start, end } = getMonthStartEnd(currentDate);
      
      let repQuery = representante;
      // Se não selecionar ninguém específico, e tivermos uma lista restrita (ex: usuário comum)
      if (!representante || representante === 'ALL') {
        if (allowedRepsList && allowedRepsList.length > 0) {
          repQuery = allowedRepsList.map(r => r.CODIGO).join(',');
        }
      }

      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
        ...(repQuery && repQuery !== 'ALL' && { representante: repQuery }),
        ...(atividade !== 'Todas Atividades' && { atividade })
      });

      const res = await fetch(`/api/crm/agenda?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar agenda");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, representante, atividade, allowedRepsList]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/crm/agenda/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      setDeletingEvent(null);
      fetchEvents();
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // Navegação do calendário
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const todayMonth = () => setCurrentDate(new Date());

  const getPriorityColor = (pri) => {
    switch (pri) {
      case 'Baixa': return '#10b981';
      case 'Media': return '#eab308';
      case 'Alta': return '#f97316';
      case 'Critica': return '#ef4444';
      default: return '#cbd5e1';
    }
  };

  // Lógica do Calendário (Grade Mensal)
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null); // Espaços vazios antes do dia 1
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    // Pegar o dia atual para destacar na lateral
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Agrupar eventos por dia
    const eventsByDay = {};
    events.forEach(e => {
      if (!eventsByDay[e.data_inicio]) eventsByDay[e.data_inicio] = [];
      eventsByDay[e.data_inicio].push(e);
    });

    const selectedDateStr = new Date(year, month, selectedDay).toISOString().split('T')[0];
    const selectedEvents = eventsByDay[selectedDateStr] || [];

    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', marginTop: '1rem', height: '600px' }}>
        {/* Grade do Calendário */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {monthName} DE {year}
            </h3>
            <div style={{ display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
              <span style={{ cursor: 'pointer' }} onClick={prevMonth}>&larr;</span>
              <span style={{ cursor: 'pointer' }} onClick={todayMonth}>HOJE</span>
              <span style={{ cursor: 'pointer' }} onClick={nextMonth}>&rarr;</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid #e2e8f0' }}>
            {weekdays.map(d => <div key={d} style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>{d}</div>)}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, gridAutoRows: 'minmax(80px, 1fr)' }}>
            {days.map((day, idx) => {
              if (!day) return <div key={idx} style={{ borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}></div>;
              
              const dateStr = new Date(year, month, day).toISOString().split('T')[0];
              const dayEvents = eventsByDay[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = day === selectedDay;

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDay(day)}
                  style={{ 
                    borderRight: '1px solid #f1f5f9', 
                    borderBottom: '1px solid #f1f5f9', 
                    padding: '0.5rem', 
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#fff1f2' : 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}
                >
                  <div style={{ 
                    width: '24px', height: '24px', 
                    borderRadius: '50%', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isToday ? '#e11d48' : 'transparent',
                    color: isToday ? 'white' : (isSelected ? '#e11d48' : '#334155'),
                    fontWeight: isToday || isSelected ? '700' : '400',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem'
                  }}>
                    {day}
                  </div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {dayEvents.slice(0, 2).map((ev, i) => (
                      <div key={i} style={{ height: '4px', width: '100%', backgroundColor: '#60a5fa', borderRadius: '2px' }}></div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Lateral (Detalhes do dia selecionado) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {new Date(year, month, selectedDay).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>

          {selectedEvents.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              Nenhum compromisso agendado.
            </div>
          ) : (
            selectedEvents.map(ev => (
              <div key={ev.id} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderLeft: `3px solid ${getPriorityColor(ev.prioridade)}`, borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b' }}>{ev.assunto || 'Sem Assunto'}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{ev.hora_inicio ? String(ev.hora_inicio).substring(0,5) : '--:--'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {ev.cliente_nome && <span>🏢 {ev.cliente_nome}</span>}
                  <span>👤 Rep: {ev.rep_nome}</span>
                  {ev.criado_por && <span>✍️ Por: {ev.criado_por}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#f1f5f9', color: '#475569' }}>
                    {ev.status}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => setEditingEvent(ev)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>EDITAR</button>
                    <button onClick={() => setDeletingEvent(ev)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>EXCLUIR</button>
                  </div>
                </div>
              </div>
            ))
          )}
          
          <button onClick={() => setIsModalOpen(true)} style={{ marginTop: 'auto', padding: '0.8rem', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            + NOVO FOLLOW UP
          </button>
        </div>
      </div>
    );
  };

  const renderList = () => {
    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando agenda...</div>;
    if (events.length === 0) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Nenhum compromisso encontrado no período selecionado.</div>;

    try {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {events.map(ev => {
            let dayName = 'N/A', dayNum = '-', monthName = 'N/A';
            if (ev.data_inicio) {
              try {
                // Tenta extrair apenas a parte da data (YYYY-MM-DD) caso venha com tempo
                const dateOnly = ev.data_inicio.split('T')[0];
                const d = new Date(dateOnly + 'T12:00:00');
                dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
                dayNum = d.getDate();
                monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
              } catch (err) {
                console.error("Erro ao formatar data:", ev.data_inicio, err);
              }
            }
            
            return (
              <div key={ev.id} style={{ display: 'flex', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: '80px', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e2e8f0', borderLeft: `4px solid ${getPriorityColor(ev.prioridade)}`, backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b' }}>{dayName}.</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#e11d48' }}>{dayNum}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#64748b' }}>{monthName}</span>
                </div>
                <div style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase' }}>{ev.assunto || 'Sem Assunto'}</h4>
                    {ev.cliente_nome && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>🏢 {ev.cliente_nome}</div>}
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {ev.hora_inicio ? String(ev.hora_inicio).substring(0,5) : '--:--'} - {ev.hora_termino ? String(ev.hora_termino).substring(0,5) : '--:--'}</span>
                      <span>📍 {ev.local || 'Sem local definido'}</span>
                      <span>Prioridade: <strong style={{ color: getPriorityColor(ev.prioridade) }}>{(ev.prioridade || 'Media').toUpperCase()}</strong></span>
                      <span style={{ color: '#e11d48', fontWeight: '600' }}>👤 Rep: {ev.rep_nome || 'Desconhecido'}</span>
                      {ev.criado_por && <span style={{ color: '#64748b', fontWeight: '500' }}>✍️ Por: {ev.criado_por}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: '800', backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {ev.status || 'AGENDADO'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => setEditingEvent(ev)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>EDITAR</button>
                      <button onClick={() => setDeletingEvent(ev)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>EXCLUIR</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      return <div style={{ color: 'red', padding: '2rem' }}>Erro de Renderização na Lista: {error.toString()}</div>;
    }
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Barra Superior / Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '700' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            PRÓXIMOS FOLLOW UPS
          </div>
          
          <select style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} value={representante} onChange={e => setRepresentante(e.target.value)}>
            <option value="">Todos Representantes</option>
            {allowedRepsList.map(r => <option key={r.CODIGO} value={r.CODIGO}>{r.NOME}</option>)}
          </select>

          <select style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }} value={atividade} onChange={e => setAtividade(e.target.value)}>
            <option value="Todas Atividades">Todas Atividades</option>
            <option value="E-mail">E-mail</option>
            <option value="Visita">Visita Técnica</option>
            <option value="Telefonema">Telefonema</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Compromisso">Compromisso Geral</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Toggle Lista / Calendário */}
          <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              onClick={() => setViewMode('lista')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'lista' ? '#f1f5f9' : 'white', color: viewMode === 'lista' ? '#e11d48' : '#64748b' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              LISTA
            </button>
            <div style={{ width: '1px', backgroundColor: '#cbd5e1' }}></div>
            <button 
              onClick={() => setViewMode('calendario')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', border: 'none', cursor: 'pointer', backgroundColor: viewMode === 'calendario' ? '#f1f5f9' : 'white', color: viewMode === 'calendario' ? '#e11d48' : '#64748b' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              CALENDÁRIO
            </button>
          </div>

          <button onClick={() => setIsModalOpen(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            + NOVO
          </button>
        </div>
      </div>

      {viewMode === 'calendario' ? renderCalendar() : renderList()}

      <AgendaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchEvents}
        repsList={allowedRepsList}
        currentUser={session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Desconhecido'}
      />

      {/* Modal de Edição */}
      {editingEvent && (
        <AgendaModal
          isOpen={true}
          onClose={() => setEditingEvent(null)}
          onSave={fetchEvents}
          repsList={allowedRepsList}
          currentUser={session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Desconhecido'}
          editingEvent={editingEvent}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#1e293b' }}>Confirmar Exclusão</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Tem certeza que deseja excluir o compromisso <strong>{deletingEvent.assunto}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDelete(deletingEvent.id)}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                SIM, EXCLUIR
              </button>
              <button
                onClick={() => setDeletingEvent(null)}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaCRM;
