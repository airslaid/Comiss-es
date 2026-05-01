import React, { useState } from 'react';

const OrdersTable = ({ pedidos }) => {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(false);

  if (!pedidos || pedidos.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</div>;
  }

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

  const getFilialNome = (filialCodigo) => {
    if (filialCodigo === 100) return 'AIRSLAID';
    if (filialCodigo === 200) return 'BIG TELAS';
    return filialCodigo; // Fallback
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
      const response = await fetch(`http://localhost:3001/api/pedidos/${pedido.ORG_IN_CODIGO}/${pedido.SER_ST_CODIGO}/${pedido.PED_IN_CODIGO}/itens`);
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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Pedido</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Tipo</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>EMISSÃO PD</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Cliente</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Representante</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Status</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Filial</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Total Mercadoria</th>
            <th style={{ padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Total Pedido</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={`${pedido.ORG_IN_CODIGO}-${pedido.SER_ST_CODIGO}-${pedido.PED_IN_CODIGO}`}>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
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
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>{getTipoDescricao(pedido.SER_ST_CODIGO)}</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>{formatDate(pedido.PED_DT_EMISSAO)}</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{pedido.CLIENTE_NOME || 'Cliente não encontrado'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {pedido.CLI_IN_CODIGO}</span>
                </div>
              </td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{pedido.REP_NOME || 'Não encontrado'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {pedido.REP_IN_CODIGO}</span>
                </div>
              </td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center' }}>{getStatusBadge(pedido.PED_CH_SITUACAO)}</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>{getFilialNome(pedido.FIL_IN_CODIGO)}</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>{formatCurrency(pedido.PED_RE_VLMERCADORIA)}</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(pedido.PED_RE_VALORTOTAL)}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
            maxWidth: '1000px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-color)'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Itens do Pedido #{selectedPedido.PED_IN_CODIGO}</h2>
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
            
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingItens ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando itens...</div>
              ) : itens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Nenhum item encontrado para este pedido.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--panel-bg)', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Seq.</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Cód. Alt.</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Produto</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Qtd.</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Un.</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Vl. Unitário</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Vl. Mercadoria</th>
                      <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--panel-border)' }}>Total Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => (
                      <tr key={item.SEQUENCIA}>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>{item.SEQUENCIA}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontWeight: '500' }}>
                          {item.PRODUTO_COD_ALT || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '500' }}>{item.DESCRICAO}</span>
                            {item.COMPLEMENTO && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.COMPLEMENTO}</span>
                            )}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {item.PRODUTO_COD}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>{item.QUANTIDADE}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'center' }}>{item.UNIDADE}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>{formatCurrency(item.VALOR_UNITARIO)}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>{formatCurrency(item.VALOR_MERCADORIA)}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(item.VALOR_TOTAL)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-color)'
            }}>
              <button 
                onClick={() => setSelectedPedido(null)}
                style={{ 
                  padding: '0.5rem 1.5rem', 
                  backgroundColor: 'var(--panel-border)', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
