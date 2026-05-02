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
    try {
      const response = await fetch(`http://localhost:3001/api/pedidos/${p.ORG_IN_CODIGO}/${p.SER_ST_CODIGO}/${p.PED_IN_CODIGO}/itens`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Erro ao buscar itens:", err);
    } finally {
      setLoadingItems(false);
    }
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

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando CRM...</div>;

  return (
    <div className="crm-pipeline" style={{ display: 'flex', gap: '0.5rem', height: 'calc(100vh - 120px)', paddingBottom: '1rem', alignItems: 'stretch' }}>
      {STAGES.map(stage => (
        <div 
          key={stage} 
          className="pipeline-column" 
          style={{ 
            flex: 1,
            minWidth: '160px',
            backgroundColor: '#f8fafc', 
            borderRadius: '4px', 
            display: 'flex', 
            flexDirection: 'column',
            border: '1px solid #e2e8f0'
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
              {formatCurrency(groupedOrcamentos[stage].reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0))}
            </div>
          </div>

          <div style={{ padding: '0.4rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
                  padding: '1rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: (stage !== 'FECHADO (GANHO)' && stage !== 'CANCELADO') ? 'grab' : 'pointer',
                  opacity: (stage === 'FECHADO (GANHO)' || stage === 'CANCELADO') ? 0.8 : 1,
                  minHeight: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-color)' }}>#{p.PED_IN_CODIGO}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(p.PED_DT_EMISSAO).toLocaleDateString('pt-BR')}</span>
                </div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: '0.2rem'
                  }}>
                    {p.CLIENTE_NOME}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    CNPJ: {p.CLIENTE_CNPJ || 'N/A'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#059669' }}>{formatCurrency(p.PED_RE_VALORTOTAL)}</span>
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
            maxHeight: '85vh',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header do Modal */}
            <div style={{ 
              padding: '1.5rem', 
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
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>
                  CNPJ: {selectedPedido.CLIENTE_CNPJ} • Emissão: {new Date(selectedPedido.PED_DT_EMISSAO).toLocaleDateString('pt-BR')}
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
                onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              >×</button>
            </div>
            
            {/* Conteúdo / Tabela */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                  <div className="loading-spinner" style={{ marginBottom: '1rem' }}>⌛</div>
                  Carregando itens do orçamento...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição do Produto</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qtd</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Vlr. Unitário</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s'
                      }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                         onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: '#334155' }}>
                          {item.PRODUTO_COD_ALT || item.PRODUTO_COD}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e293b' }}>{item.DESCRICAO}</div>
                          {item.COMPLEMENTO && (
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.1rem' }}>{item.COMPLEMENTO}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                          {item.QUANTIDADE} <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{item.UNIDADE}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', textAlign: 'right', color: '#475569' }}>
                          {formatCurrency(item.VALOR_UNITARIO)}
                        </td>
                        <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                          {formatCurrency(item.VALOR_TOTAL)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Footer / Resumo */}
            <div style={{ 
              padding: '1.25rem 1.5rem', 
              borderTop: '1px solid #e2e8f0', 
              backgroundColor: '#ffffff', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Total de Itens</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{items.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Peso Total Est.</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>--</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginRight: '1rem' }}>VALOR TOTAL DO ORÇAMENTO</span>
                <span style={{ 
                  fontSize: '1.4rem', 
                  fontWeight: '900', 
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px'
                }}>
                  {formatCurrency(selectedPedido.PED_RE_VALORTOTAL)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineCRM;
