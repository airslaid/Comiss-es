import React, { useState, useMemo, useRef, useEffect } from 'react';

const ComissoesTable = ({ faturamentos, metas, atingimentoMensal, manualDates, onDateChange, role }) => {
  const [selectedFat, setSelectedFat] = useState(null);
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  
  // Lógica de Redimensionamento
  const [widths, setWidths] = useState({
    nf: 80,
    pedido: 70,
    emissaoPed: 120,
    emissao: 90,
    cod: 80,
    cliente: 300,
    rep: 150,
    vlrTotal: 110,
    pctComiss: 100,
    vlrComiss: 110
  });

  const resizing = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizing.current) return;
      
      const { col, startX, startWidth } = resizing.current;
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      
      setWidths(prev => ({
        ...prev,
        [col]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizing.current) {
        resizing.current = null;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const onMouseDown = (e, col) => {
    resizing.current = {
      col,
      startX: e.clientX,
      startWidth: widths[col]
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  // Ordenação
  const [sortConfig, setSortConfig] = useState({ key: 'NOT_DT_EMISSAO', direction: 'desc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCommissionData = (fat) => {
    // 1. Obter mês/ano do pedido (formato DD/MM/YYYY na string)
    let orderDate = fat.PEDIDOS_DATAS;
    if (!orderDate && manualDates && manualDates[fat.NOT_IN_NUMERO]) {
      const parts = manualDates[fat.NOT_IN_NUMERO].split('-');
      orderDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    if (!orderDate) return { pct: 0, valor: 0, atingimento: 0 };
    
    const firstDate = orderDate.split(',')[0].trim();
    const dateParts = firstDate.split('/');
    if (dateParts.length !== 3) return { pct: 0, valor: 0, atingimento: 0 };
    
    const [day, month, year] = dateParts;
    const mesAno = `${year}-${month}`;
    
    const repId = Number(fat.REP_IN_CODIGO);

    // 2. Dados base de atingimento
    const metaObj = metas.find(m => Number(m.rep_in_codigo) === repId && m.mes_ano === mesAno);
    const valorMeta = metaObj ? metaObj.valor_meta : 0;
    const realObj = atingimentoMensal.find(a => Number(a.REP_IN_CODIGO) === repId && a.MES_ANO === mesAno);
    const valorRealizado = realObj ? realObj.TOTAL_REALIZADO : 0;
    const atingimentoRep = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;

    let pct = 0;
    let displayAtingimento = atingimentoRep;

    if (role === 'COMISSOES_GERENTE') {
      const totalMetaMes = metas.filter(m => m.mes_ano === mesAno).reduce((acc, curr) => acc + curr.valor_meta, 0);
      const totalRealMes = atingimentoMensal.filter(a => a.MES_ANO === mesAno).reduce((acc, curr) => acc + curr.TOTAL_REALIZADO, 0);
      const atingimentoGeral = totalMetaMes > 0 ? (totalRealMes / totalMetaMes) * 100 : 0;
      pct = atingimentoGeral <= 85 ? 0.35 : 0.5;
      displayAtingimento = atingimentoGeral;
    } 
    else if (role === 'COMISSOES_SUPERVISOR' || role === 'COMISSOES_EXECUTIVO') {
      pct = atingimentoRep <= 85 ? 0.15 : 0.25;
    }
    else if (role === 'COMISSOES_ASSISTENTE') {
      pct = 0.05;
    }
    else {
      // Regra Representante (Padrão)
      // Exceção: AIR SLAID TECIDOS TÉCNICOS LTDA (Fixo 1%)
      if (fat.REP_NOME && fat.REP_NOME.toUpperCase().includes('AIR SLAID')) {
        pct = 1;
      }
      else if (valorMeta === 0) pct = 0;
      else if (atingimentoRep <= 65) pct = 1;
      else if (atingimentoRep <= 85) pct = 1.5;
      else pct = 2;
    }

    const valorComissao = (fat.NOT_RE_VALORTOTAL || 0) * (pct / 100);

    return { pct, valor: valorComissao, atingimento: displayAtingimento };
  };

  const sortedData = useMemo(() => {
    let sortableItems = faturamentos.map(fat => ({
      ...fat,
      ...getCommissionData(fat)
    }));
    
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [faturamentos, metas, atingimentoMensal, sortConfig]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

  const handleOpenItens = async (fat) => {
    setSelectedFat(fat);
    setLoadingItens(true);
    setItens([]);
    try {
      const response = await fetch(`/api/faturamentos/${fat.ORG_IN_CODIGO}/${fat.NOT_IN_CODIGO}/itens`);
      if (response.ok) {
        const data = await response.json();
        setItens(data);
      }
    } catch (error) {
      console.error("Erro ao buscar itens da NF:", error);
    } finally {
      setLoadingItens(false);
    }
  };

  if (!faturamentos || faturamentos.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado de comissão encontrado.</div>;
  }

  const thStyle = (width) => ({
    padding: '0.25rem 0.5rem',
    borderBottom: '2px solid var(--panel-border)',
    backgroundColor: 'var(--bg-color)',
    fontSize: '0.6rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    position: 'relative',
    width: width,
    minWidth: width,
    maxWidth: width,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });

  const tdStyle = (width) => ({
    padding: '0.45rem 0.5rem',
    borderBottom: '1px solid var(--panel-border)',
    fontSize: '0.7rem',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    width: width,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });

  const resizerStyle = {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '10px',
    cursor: 'col-resize',
    zIndex: 1,
    backgroundColor: 'transparent',
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <>
      <div className="no-print" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={thStyle(widths.nf)} onClick={() => requestSort('NOT_IN_NUMERO')}>
                NF Numero{getSortIcon('NOT_IN_NUMERO')}
                <div onMouseDown={(e) => onMouseDown(e, 'nf')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.pedido)} onClick={() => requestSort('PEDIDOS')}>
                Pedido{getSortIcon('PEDIDOS')}
                <div onMouseDown={(e) => onMouseDown(e, 'pedido')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.emissaoPed)} onClick={() => requestSort('PEDIDOS_DATAS')}>
                Emissão Ped.{getSortIcon('PEDIDOS_DATAS')}
                <div onMouseDown={(e) => onMouseDown(e, 'emissaoPed')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.emissao)} onClick={() => requestSort('NOT_DT_EMISSAO')}>
                Emissão{getSortIcon('NOT_DT_EMISSAO')}
                <div onMouseDown={(e) => onMouseDown(e, 'emissao')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.cod)} onClick={() => requestSort('AGN_IN_CODIGO')}>
                Cód Cliente{getSortIcon('AGN_IN_CODIGO')}
                <div onMouseDown={(e) => onMouseDown(e, 'cod')} style={resizerStyle} />
              </th>
              <th style={{ ...thStyle(widths.cliente), textAlign: 'left' }} onClick={() => requestSort('CLIENTE_NOME')}>
                Cliente{getSortIcon('CLIENTE_NOME')}
                <div onMouseDown={(e) => onMouseDown(e, 'cliente')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.rep)} onClick={() => requestSort('REP_NOME')}>
                Representante{getSortIcon('REP_NOME')}
                <div onMouseDown={(e) => onMouseDown(e, 'rep')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.vlrTotal)} onClick={() => requestSort('NOT_RE_VALORTOTAL')}>
                Vlr Total{getSortIcon('NOT_RE_VALORTOTAL')}
                <div onMouseDown={(e) => onMouseDown(e, 'vlrTotal')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.pctComiss)} onClick={() => requestSort('pct')}>
                % Comiss.{getSortIcon('pct')}
                <div onMouseDown={(e) => onMouseDown(e, 'pctComiss')} style={resizerStyle} />
              </th>
              <th style={thStyle(widths.vlrComiss)} onClick={() => requestSort('valor')}>
                Vlr Comissão{getSortIcon('valor')}
                <div onMouseDown={(e) => onMouseDown(e, 'vlrComiss')} style={resizerStyle} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((fat, index) => (
              <tr 
                key={`${fat.NOT_IN_NUMERO}-${index}`}
                style={{ backgroundColor: index % 2 !== 0 ? '#f1f5f9' : 'transparent' }}
              >
                <td style={{ ...tdStyle(widths.nf), fontWeight: '600', color: 'var(--accent-color)' }}>
                  <button
                    onClick={() => handleOpenItens(fat)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--accent-color)', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    #{fat.NOT_IN_NUMERO}
                  </button>
                </td>
                <td style={{ ...tdStyle(widths.pedido), fontWeight: '600' }}>{fat.PEDIDOS || '-'}</td>
                <td style={tdStyle(widths.emissaoPed)}>
                  {fat.PEDIDOS_DATAS ? (
                    fat.PEDIDOS_DATAS
                  ) : (
                    <input 
                      type="date" 
                      value={manualDates[fat.NOT_IN_NUMERO] || ''} 
                      onChange={(e) => onDateChange(fat.NOT_IN_NUMERO, e.target.value)}
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem',
                        width: '100%',
                        borderRadius: '4px',
                        border: '1px solid var(--panel-border)',
                        backgroundColor: '#fff9db' // Leve amarelo para indicar edição manual
                      }}
                    />
                  )}
                </td>
                <td style={tdStyle(widths.emissao)}>{formatDate(fat.NOT_DT_EMISSAO)}</td>
                <td style={{ ...tdStyle(widths.cod), fontWeight: '500' }}>{fat.AGN_IN_CODIGO}</td>
                <td style={{ ...tdStyle(widths.cliente), fontWeight: '600', textAlign: 'left' }}>{fat.CLIENTE_NOME}</td>
                <td style={tdStyle(widths.rep)}>{fat.REP_NOME}</td>
                <td style={{ ...tdStyle(widths.vlrTotal), fontWeight: '600' }}>{formatCurrency(fat.NOT_RE_VALORTOTAL)}</td>
                <td style={{ ...tdStyle(widths.pctComiss), fontWeight: '700', color: '#10b981' }}>
                  {fat.pct}%
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                    ({fat.atingimento.toFixed(1)}% meta)
                  </div>
                </td>
                <td style={{ ...tdStyle(widths.vlrComiss), fontWeight: '700', color: 'var(--accent-color)' }}>{formatCurrency(fat.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Itens da NF */}
      {selectedFat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.6rem 1rem',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-color)'
            }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Itens da Nota Fiscal #{selectedFat.NOT_IN_NUMERO}</h2>
              <button 
                onClick={() => setSelectedFat(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ padding: '0.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingItens ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando itens...</div>
              ) : itens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Nenhum item encontrado para esta nota fiscal.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--panel-bg)', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Seq.</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Cód. Alt.</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Produto</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Qtd.</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Un.</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Vl. Unitário</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Vl. Mercadoria</th>
                      <th style={{ padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--panel-border)', fontSize: '0.65rem', textTransform: 'uppercase', textAlign: 'center' }}>Total Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.SEQUENCIA}>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center' }}>{item.SEQUENCIA}</td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', fontWeight: '500', fontSize: '0.7rem', textAlign: 'center' }}>
                          {item.PRODUTO_COD_ALT || '-'}
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.7rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: '500' }}>{item.DESCRICAO}</span>
                        </td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontSize: '0.7rem' }}>{item.QUANTIDADE}</td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontSize: '0.7rem' }}>{item.UNIDADE}</td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontSize: '0.7rem' }}>{formatCurrency(item.VALOR_UNITARIO)}</td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontSize: '0.7rem' }}>{formatCurrency(item.VALOR_MERCADORIA)}</td>
                        <td style={{ padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontWeight: '600', fontSize: '0.7rem' }}>{formatCurrency(item.VALOR_TOTAL)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-color)'
            }}>
              <button 
                onClick={() => setSelectedFat(null)}
                style={{ 
                  padding: '0.25rem 1rem', 
                  backgroundColor: 'var(--panel-border)', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tabela de Impressão para PDF */}
      <div className="print-only" style={{ display: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>NF</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>PEDIDO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>EMISSÃO PED.</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>EMISSÃO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>CLIENTE</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>REPRESENTANTE</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>VLR TOTAL</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>% COMISS.</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>VLR COMISSÃO</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((fat, idx) => (
              <tr key={`print-${fat.NOT_IN_NUMERO}-${idx}`}>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>#{fat.NOT_IN_NUMERO}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{fat.PEDIDOS || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{fat.PEDIDOS_DATAS || manualDates[fat.NOT_IN_NUMERO] || '-'}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{formatDate(fat.NOT_DT_EMISSAO)}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'left' }}>{fat.CLIENTE_NOME}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{fat.REP_NOME}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{formatCurrency(fat.NOT_RE_VALORTOTAL)}</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center', fontWeight: 'bold' }}>{fat.pct}%</td>
                <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center', fontWeight: 'bold' }}>{formatCurrency(fat.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ComissoesTable;
