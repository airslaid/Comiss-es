import React, { useState, useRef, useEffect, useMemo } from 'react';

const OrdersTable = ({ pedidos }) => {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);
  
  // Lógica de Redimensionamento - Ajustada para caber na tela
  const [widths, setWidths] = useState({
    pedido: 60,
    tipo: 80,
    emissao: 80,
    entrega: 80,
    codCliente: 60,
    cliente: 220,
    rep: 140,
    status: 90,
    vlMerc: 100,
    total: 100
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
  const [sortConfig, setSortConfig] = useState({ key: 'PED_DT_EMISSAO', direction: 'desc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...pedidos];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Tratamento para nomes nulos
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
  }, [pedidos, sortConfig]);

  // Paginação - Agora usa sortedData em vez de pedidos
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Resetar página quando os pedidos mudarem (filtros aplicados)
  useEffect(() => {
    setCurrentPage(1);
  }, [pedidos]);

  if (!pedidos || pedidos.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</div>;
  }

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedData.slice(indexOfFirstRow, indexOfLastRow);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getTipoDescricao = (tipo) => {
    switch (tipo) {
      case 'OV': return 'Orçamento';
      case 'PD': return 'Pedido';
      case 'DV': return 'Desenvolvimento';
      default: return tipo;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'E':
        return <span className="status-badge status-e">Encerrado</span>;
      case 'A':
      case 'P':
        return <span className="status-badge status-a">Em Aberto</span>;
      case 'C':
        return <span className="status-badge status-c">Cancelado</span>;
      case 'F':
        return <span className="status-badge status-f">Faturado</span>;
      case 'B':
        return <span className="status-badge status-b">Em Aprovação</span>;
      default:
        return <span className="status-badge status-default">{status}</span>;
    }
  };

  const handleOpenItens = async (pedido) => {
    setSelectedPedido(pedido);
    setLoadingItens(true);
    setItens([]);
    try {
      const response = await fetch(`/api/pedidos/${pedido.ORG_IN_CODIGO}/${pedido.SER_ST_CODIGO}/${pedido.PED_IN_CODIGO}/itens`);
      if (response.ok) {
        const data = await response.json();
        setItens(data);
      }
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    } finally {
      setLoadingItens(false);
    }
  };

  const thStyle = (width) => ({
    padding: '0.25rem 0.5rem',
    borderBottom: '2px solid var(--panel-border)',
    position: 'relative',
    width: width,
    minWidth: width,
    maxWidth: width,
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

  return (
    <>
      {/* Tabela de Visualização (Paginada) */}
      <div className="no-print" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th 
                style={{ ...thStyle(widths.pedido), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_IN_CODIGO')}
              >
                Pedido {sortConfig.key === 'PED_IN_CODIGO' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'pedido')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.tipo), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('SER_ST_CODIGO')}
              >
                Tipo {sortConfig.key === 'SER_ST_CODIGO' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'tipo')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.emissao), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_DT_EMISSAO')}
              >
                EMISSÃO PD {sortConfig.key === 'PED_DT_EMISSAO' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'emissao')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.entrega), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_DT_ENTREGA')}
              >
                ENTREGA {sortConfig.key === 'PED_DT_ENTREGA' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'entrega')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.codCliente), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('CLI_IN_CODIGO')}
              >
                COD {sortConfig.key === 'CLI_IN_CODIGO' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'codCliente')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.cliente), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('CLIENTE_NOME')}
              >
                Cliente {sortConfig.key === 'CLIENTE_NOME' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'cliente')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.rep), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('REP_NOME')}
              >
                Representante {sortConfig.key === 'REP_NOME' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'rep')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.status), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_CH_SITUACAO')}
              >
                Status {sortConfig.key === 'PED_CH_SITUACAO' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'status')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.vlMerc), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_RE_VLMERCADORIA')}
              >
                VLR LIQUIDO {sortConfig.key === 'PED_RE_VLMERCADORIA' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'vlMerc')} style={resizerStyle} />
              </th>
              <th 
                style={{ ...thStyle(widths.total), textAlign: 'center', cursor: 'pointer' }}
                onClick={() => requestSort('PED_RE_VALORTOTAL')}
              >
                VLR BRUTO {sortConfig.key === 'PED_RE_VALORTOTAL' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                <div onMouseDown={(e) => onMouseDown(e, 'total')} style={resizerStyle} />
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((pedido, index) => (
              <tr 
                key={`${pedido.ORG_IN_CODIGO}-${pedido.SER_ST_CODIGO}-${pedido.PED_IN_CODIGO}`}
                style={{ backgroundColor: index % 2 !== 0 ? '#f1f5f9' : 'transparent' }}
              >
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', width: widths.pedido, overflow: 'hidden', textAlign: 'center' }}>
                  <button
                    onClick={() => handleOpenItens(pedido)}
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
                    #{pedido.PED_IN_CODIGO}
                  </button>
                </td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', width: widths.tipo, overflow: 'hidden', textAlign: 'center' }}>{getTipoDescricao(pedido.SER_ST_CODIGO)}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', width: widths.emissao, overflow: 'hidden', textAlign: 'center' }}>{formatDate(pedido.PED_DT_EMISSAO)}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', width: widths.entrega, overflow: 'hidden', textAlign: 'center' }}>{pedido.PED_DT_ENTREGA ? formatDate(pedido.PED_DT_ENTREGA) : '-'}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontWeight: '500', width: widths.codCliente, overflow: 'hidden' }}>{pedido.CLI_IN_CODIGO}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', fontWeight: '600', width: widths.cliente, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>{pedido.CLIENTE_NOME}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', width: widths.rep, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{pedido.REP_NOME || 'Não encontrado'}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', width: widths.status, overflow: 'hidden' }}>{getStatusBadge(pedido.PED_CH_SITUACAO)}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', width: widths.vlMerc, overflow: 'hidden' }}>{formatCurrency(pedido.PED_RE_VLMERCADORIA)}</td>
                <td style={{ padding: '0.45rem 0.5rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center', fontWeight: '600', width: widths.total, overflow: 'hidden' }}>{formatCurrency(pedido.PED_RE_VALORTOTAL)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Controles de Paginação */}
        <div className="pagination-controls" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.35rem 0.75rem',
          borderTop: '1px solid var(--panel-border)',
          backgroundColor: 'var(--bg-color)',
          fontSize: '0.875rem'
        }}>
          <div style={{ color: 'var(--text-muted)' }}>
            Mostrando {indexOfFirstRow + 1} a {Math.min(indexOfLastRow, pedidos.length)} de {pedidos.length} registros
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid var(--panel-border)',
                backgroundColor: currentPage === 1 ? 'transparent' : 'var(--panel-bg)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              Anterior
            </button>
            
            <span style={{ fontWeight: '600', padding: '0 0.5rem' }}>
              Página {currentPage} de {totalPages}
            </span>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: '1px solid var(--panel-border)',
                backgroundColor: currentPage === totalPages ? 'transparent' : 'var(--panel-bg)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Impressão (Completa - Sem Paginação) */}
      <div className="print-only" style={{ display: 'none' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>PEDIDO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>TIPO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>EMISSÃO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>ENTREGA</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>COD</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>CLIENTE</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>REPRESENTANTE</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>STATUS</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>VLR LIQUIDO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontSize: '8pt' }}>VLR BRUTO</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => {
              const getStatusLabel = (s) => {
                switch(s) {
                  case 'E': return 'Encerrado';
                  case 'A': case 'P': return 'Em Aberto';
                  case 'C': return 'Cancelado';
                  case 'F': return 'Faturado';
                  case 'B': return 'Em Aprovação';
                  default: return s;
                }
              };

              return (
                <tr key={`print-${pedido.ORG_IN_CODIGO}-${pedido.SER_ST_CODIGO}-${pedido.PED_IN_CODIGO}`}>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>#{pedido.PED_IN_CODIGO}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{pedido.SER_ST_CODIGO === 'OV' ? 'Orçamento' : 'Pedido'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{formatDate(pedido.PED_DT_EMISSAO)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{pedido.PED_DT_ENTREGA ? formatDate(pedido.PED_DT_ENTREGA) : '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{pedido.CLI_IN_CODIGO}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'left' }}>{pedido.CLIENTE_NOME}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{pedido.REP_NOME}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{getStatusLabel(pedido.PED_CH_SITUACAO)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{formatCurrency(pedido.PED_RE_VLMERCADORIA)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', fontSize: '7pt', textAlign: 'center' }}>{formatCurrency(pedido.PED_RE_VALORTOTAL)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Itens */}
      {selectedPedido && (
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
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Itens do Pedido #{selectedPedido.PED_IN_CODIGO}</h2>
              {selectedPedido.NOTAS_FISCAIS && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong>NFs:</strong> {selectedPedido.NOTAS_FISCAIS} | <strong>Faturado em:</strong> {selectedPedido.DATAS_FATURAMENTO}
                </div>
              )}
            </div>
              <button 
                onClick={() => setSelectedPedido(null)}
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
                <div style={{ textAlign: 'center', padding: '2rem' }}>Nenhum item encontrado para este pedido.</div>
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
                onClick={() => setSelectedPedido(null)}
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
    </>
  );
};

export default OrdersTable;

