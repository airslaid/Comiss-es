import React, { useState, useEffect, useMemo } from 'react';

const STAGES = [
  'PROCESSO INTERNO',
  'ENVIADO AO CLIENTE',
  'EM NEGOCIAÇÃO',
  'FECHADO (GANHO)',
  'CANCELADO'
];

const STAGE_COLORS = {
  'PROCESSO INTERNO': '#64748b',
  'ENVIADO AO CLIENTE': '#3b82f6',
  'EM NEGOCIAÇÃO': '#f59e0b',
  'FECHADO (GANHO)': '#10b981',
  'CANCELADO': '#ef4444'
};

const PipelineCRM = ({ pedidos }) => {
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [modalTab, setModalTab] = useState('itens'); // 'itens' ou 'followup'
  const [followUps, setFollowUps] = useState([]);
  const [newFollowUp, setNewFollowUp] = useState({ tipo: 'E-MAIL', descricao: '' });
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);

  const fetchPipeline = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/crm/pipeline');
      if (response.ok) {
        const data = await response.json();
        setPipelineData(data);
      }
    } catch (err) {
      console.error("Erro ao buscar pipeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (p) => {
    setLoadingItems(true);
    setSelectedPedido(p);
    setModalTab('itens');
    setEditingFollowUp(null);
    setNewFollowUp({ tipo: 'E-MAIL', descricao: '' });
    try {
      const response = await fetch(`http://localhost:3001/api/pedidos/${p.ORG_IN_CODIGO}/${p.SER_ST_CODIGO}/${p.PED_IN_CODIGO}/itens`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
      fetchFollowUps(p);
    } catch (err) {
      console.error("Erro ao buscar itens:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchFollowUps = async (p) => {
    try {
      const response = await fetch(`http://localhost:3001/api/crm/followup/${p.ORG_IN_CODIGO}/${p.SER_ST_CODIGO}/${p.PED_IN_CODIGO}`);
      if (response.ok) {
        const data = await response.json();
        setFollowUps(data);
      }
    } catch (err) {
      console.error("Erro ao buscar follow ups:", err);
    }
  };

  const saveFollowUp = async () => {
    if (!newFollowUp.descricao.trim()) return;
    setSavingFollowUp(true);
    try {
      const url = editingFollowUp 
        ? `http://localhost:3001/api/crm/followup/${editingFollowUp.id}`
        : 'http://localhost:3001/api/crm/followup';
      
      const method = editingFollowUp ? 'PUT' : 'POST';
      
      const body = editingFollowUp 
        ? { tipo: newFollowUp.tipo, descricao: newFollowUp.descricao }
        : {
            org_in_codigo: selectedPedido.ORG_IN_CODIGO,
            ser_st_codigo: selectedPedido.SER_ST_CODIGO,
            ped_in_codigo: selectedPedido.PED_IN_CODIGO,
            tipo: newFollowUp.tipo,
            descricao: newFollowUp.descricao
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        setNewFollowUp({ tipo: 'E-MAIL', descricao: '' });
        setEditingFollowUp(null);
        fetchFollowUps(selectedPedido);
      }
    } catch (err) {
      console.error("Erro ao salvar follow up:", err);
    } finally {
      setSavingFollowUp(false);
    }
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // ID do follow up a ser excluído

  const deleteFollowUp = async () => {
    if (!deleteConfirmation) return;
    try {
      const response = await fetch(`http://localhost:3001/api/crm/followup/${deleteConfirmation}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDeleteConfirmation(null);
        fetchFollowUps(selectedPedido);
      }
    } catch (err) {
      console.error("Erro ao excluir follow up:", err);
    }
  };

  const startEdit = (f) => {
    setEditingFollowUp(f);
    setNewFollowUp({ tipo: f.tipo, descricao: f.descricao });
    // Scroll para o formulário
    document.querySelector('.followup-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingFollowUp(null);
    setNewFollowUp({ tipo: 'E-MAIL', descricao: '' });
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const updateStage = async (pedido, newStage) => {
    try {
      await fetch('http://localhost:3001/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_in_codigo: pedido.ORG_IN_CODIGO,
          ser_st_codigo: pedido.SER_ST_CODIGO,
          ped_in_codigo: pedido.PED_IN_CODIGO,
          stage: newStage
        })
      });
      fetchPipeline();
    } catch (err) {
      console.error("Erro ao atualizar estágio:", err);
    }
  };

  // Filtrar apenas Orçamentos (OV)
  const orcamentos = useMemo(() => {
    return pedidos.filter(p => p.SER_ST_CODIGO === 'OV');
  }, [pedidos]);

  // Mapear orçamentos para seus estágios
  const groupedOrcamentos = useMemo(() => {
    const groups = STAGES.reduce((acc, stage) => ({ ...acc, [stage]: [] }), {});

    orcamentos.forEach(p => {
      let stage = 'PROCESSO INTERNO';
      
      // Regras automáticas por status do ERP
      if (p.PED_CH_SITUACAO === 'C') {
        stage = 'CANCELADO';
      } else if (p.PED_CH_SITUACAO === 'E') {
        stage = 'FECHADO (GANHO)';
      } else {
        // Buscar estágio salvo no CRM
        const saved = pipelineData.find(pl => 
          pl.org_in_codigo === p.ORG_IN_CODIGO && 
          pl.ser_st_codigo === p.SER_ST_CODIGO && 
          pl.ped_in_codigo === p.PED_IN_CODIGO
        );
        if (saved) stage = saved.stage;
      }

      if (groups[stage]) {
        groups[stage].push(p);
      } else {
        groups['PROCESSO INTERNO'].push(p);
      }
    });

    return groups;
  }, [orcamentos, pipelineData]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getFollowUpIcon = (tipo) => {
    switch(tipo) {
      case 'E-MAIL': return '📧';
      case 'VISITA': return '🚗';
      case 'TELEFONEMA': return '📞';
      case 'WHATSAPP': return '💬';
      default: return '📎';
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando CRM...</div>;

  return (
    <div className="crm-pipeline" style={{ 
      display: 'flex', 
      gap: '0.75rem', 
      height: 'calc(100vh - 120px)', 
      paddingBottom: '1rem', 
      alignItems: 'stretch',
      overflowX: 'auto',
      scrollBehavior: 'smooth',
      paddingRight: '1rem'
    }}>
      {STAGES.map(stage => (
        <div 
          key={stage} 
          className="pipeline-column" 
          style={{ 
            flex: '0 0 290px', // Conforto visual máximo
            minWidth: 0,
            overflow: 'hidden',
            backgroundColor: '#f8fafc', 
            borderRadius: '4px', 
            display: 'flex', 
            flexDirection: 'column',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const pedidoData = JSON.parse(e.dataTransfer.getData('pedido'));
            if (stage !== 'FECHADO (GANHO)' && stage !== 'CANCELADO') {
              updateStage(pedidoData, stage);
            }
          }}
        >
          <div style={{ 
            padding: '0.4rem 0.5rem', 
            backgroundColor: '#ffffff', 
            borderBottom: '1px solid #e2e8f0',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            borderTop: `3px solid ${STAGE_COLORS[stage]}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <h3 style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-main)', margin: 0 }}>
                {stage}
              </h3>
              <span style={{ fontSize: '0.6rem', fontWeight: '700', backgroundColor: '#f1f5f9', padding: '0.05rem 0.3rem', borderRadius: '10px', color: STAGE_COLORS[stage] }}>
                {groupedOrcamentos[stage].length}
              </span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: STAGE_COLORS[stage] }}>
              {formatCurrency(groupedOrcamentos[stage].reduce((acc, curr) => acc + curr.PED_RE_VLMERCADORIA, 0))}
            </div>
          </div>

          <div style={{ 
            padding: '0.4rem', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.4rem',
            minWidth: 0
          }}>
            {groupedOrcamentos[stage].map(p => (
              <div 
                key={`${p.ORG_IN_CODIGO}-${p.PED_IN_CODIGO}`} 
                draggable={stage !== 'FECHADO (GANHO)' && stage !== 'CANCELADO'}
                onDragStart={(e) => {
                  e.dataTransfer.setData('pedido', JSON.stringify(p));
                }}
                onClick={() => fetchItems(p)}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '0.6rem', // Reduzido para caber melhor
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: (stage !== 'FECHADO (GANHO)' && stage !== 'CANCELADO') ? 'grab' : 'pointer',
                  opacity: (stage === 'FECHADO (GANHO)' || stage === 'CANCELADO') ? 0.8 : 1,
                  minHeight: '110px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minWidth: 0,
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-color)', whiteSpace: 'nowrap' }}>#{p.PED_IN_CODIGO}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.PED_DT_EMISSAO).toLocaleDateString('pt-BR')}</span>
                </div>
                <div style={{ marginBottom: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '0.1rem'
                  }}>
                    {p.CLIENTE_NOME}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    CNPJ: {p.CLIENTE_CNPJ || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--accent-color)', fontWeight: '600', marginTop: '0.2rem' }}>
                    REP: {p.REP_NOME}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669' }}>{formatCurrency(p.PED_RE_VLMERCADORIA)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de Detalhes Premium */}
      {selectedPedido && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setSelectedPedido(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '900px',
            maxWidth: '95vw',
            height: '85vh',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header do Modal */}
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              background: 'linear-gradient(to right, #f8fafc, #ffffff)',
              borderBottom: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ 
                    backgroundColor: STAGE_COLORS[pipelineData.find(pl => 
                      pl.org_in_codigo === selectedPedido.ORG_IN_CODIGO && 
                      pl.ser_st_codigo === selectedPedido.SER_ST_CODIGO && 
                      pl.ped_in_codigo === selectedPedido.PED_IN_CODIGO
                    )?.stage || 'PROCESSO INTERNO'],
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%'
                  }}></span>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                    Orçamento #{selectedPedido.PED_IN_CODIGO}
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>
                  {selectedPedido.CLIENTE_NOME}
                </p>
              </div>
              <button 
                onClick={() => setSelectedPedido(null)}
                style={{ 
                  border: 'none', 
                  background: '#f1f5f9', 
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer', 
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
              >×</button>
            </div>

            {/* Abas */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <button 
                onClick={() => setModalTab('itens')}
                style={{
                  padding: '1rem 1.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: modalTab === 'itens' ? '2px solid var(--accent-color)' : '2px solid transparent',
                  color: modalTab === 'itens' ? 'var(--accent-color)' : '#64748b',
                  cursor: 'pointer'
                }}
              >ITENS DO ORÇAMENTO</button>
              <button 
                onClick={() => setModalTab('followup')}
                style={{
                  padding: '1rem 1.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: modalTab === 'followup' ? '2px solid var(--accent-color)' : '2px solid transparent',
                  color: modalTab === 'followup' ? 'var(--accent-color)' : '#64748b',
                  cursor: 'pointer'
                }}
              >FOLLOW UP / APONTAMENTOS</button>
            </div>
            
            {/* Conteúdo das Abas */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              {modalTab === 'itens' ? (
                <>
                  {loadingItems ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                      Carregando itens...
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Item</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Descrição</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Qtd</th>
                          <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Vlr. Unit</th>
                          <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '700' }}>{item.PRODUTO_COD_ALT || item.PRODUTO_COD}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>{item.DESCRICAO}</div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textAlign: 'center' }}>{item.QUANTIDADE} {item.UNIDADE}</td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textAlign: 'right' }}>{formatCurrency(item.VALOR_UNITARIO)}</td>
                            <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(item.VALOR_TOTAL)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                <div style={{ padding: '1.5rem' }}>
                  {/* Formulário de Novo Follow Up */}
                  <div className="followup-form" style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '1.25rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.5rem',
                    boxShadow: editingFollowUp ? '0 0 0 2px var(--accent-color)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '1rem', color: '#1e293b' }}>
                      {editingFollowUp ? 'EDITAR APONTAMENTO' : 'NOVO APONTAMENTO'}
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: '0 0 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>TIPO</label>
                        <select 
                          value={newFollowUp.tipo}
                          onChange={(e) => setNewFollowUp({ ...newFollowUp, tipo: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}
                        >
                          <option value="E-MAIL">E-MAIL</option>
                          <option value="VISITA">VISITA</option>
                          <option value="TELEFONEMA">TELEFONEMA</option>
                          <option value="WHATSAPP">WHATSAPP</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '700', color: '#64748b', marginBottom: '0.4rem' }}>DESCRIÇÃO / OBSERVAÇÃO</label>
                        <textarea 
                          value={newFollowUp.descricao}
                          onChange={(e) => setNewFollowUp({ ...newFollowUp, descricao: e.target.value })}
                          placeholder="Descreva o que foi conversado ou o próximo passo..."
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.75rem', minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {editingFollowUp && (
                        <button 
                          onClick={cancelEdit}
                          style={{
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            border: 'none',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          CANCELAR
                        </button>
                      )}
                      <button 
                        onClick={saveFollowUp}
                        disabled={savingFollowUp || !newFollowUp.descricao.trim()}
                        style={{
                          backgroundColor: 'var(--accent-color)',
                          color: 'white',
                          border: 'none',
                          padding: '0.6rem 1.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          opacity: (savingFollowUp || !newFollowUp.descricao.trim()) ? 0.6 : 1
                        }}
                      >
                        {savingFollowUp ? 'SALVANDO...' : (editingFollowUp ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR APONTAMENTO')}
                      </button>
                    </div>
                  </div>

                  {/* Lista de Histórico */}
                  <div className="followup-history">
                    <h3 style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '1rem', color: '#1e293b' }}>HISTÓRICO DE CONTATOS</h3>
                    {followUps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Nenhum follow up registrado para este orçamento.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {followUps.map((f, idx) => (
                          <div key={f.id || idx} style={{ 
                            padding: '1rem', 
                            backgroundColor: '#ffffff', 
                            borderRadius: '6px', 
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.1rem' }}>{getFollowUpIcon(f.tipo)}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-color)' }}>{f.tipo}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '600' }}>
                                  {new Date(f.data_contato).toLocaleString('pt-BR')}
                                </span>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button 
                                    onClick={() => startEdit(f)}
                                    title="Editar"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#3b82f6', padding: '0.2rem' }}
                                  >✏️</button>
                                  <button 
                                    onClick={() => setDeleteConfirmation(f.id)}
                                    title="Excluir"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444', padding: '0.2rem' }}
                                  >🗑️</button>
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                              {f.descricao}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', width: '100%' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginRight: '1rem' }}>VALOR LÍQUIDO</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#059669', backgroundColor: '#ecfdf5', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
                  {formatCurrency(selectedPedido.PED_RE_VLMERCADORIA)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Customizado */}
      {deleteConfirmation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            width: '350px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Confirmar Exclusão</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Tem certeza que deseja remover este apontamento? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setDeleteConfirmation(null)}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >CANCELAR</button>
              <button 
                onClick={deleteFollowUp}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >EXCLUIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineCRM;
