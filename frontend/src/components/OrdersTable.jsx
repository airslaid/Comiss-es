const OrdersTable = ({ pedidos }) => {
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

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Tipo</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Filial</th>
            <th>Total Mercadoria</th>
            <th>Total Pedido</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={`${pedido.ORG_IN_CODIGO}-${pedido.PED_IN_CODIGO}`}>
              <td>
                <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                  #{pedido.PED_IN_CODIGO}
                </span>
              </td>
              <td>{getTipoDescricao(pedido.SER_ST_CODIGO)}</td>
              <td>{formatDate(pedido.PED_DT_EMISSAO)}</td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{pedido.CLIENTE_NOME || 'Cliente não encontrado'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {pedido.CLI_IN_CODIGO}</span>
                </div>
              </td>
              <td>{getStatusBadge(pedido.PED_CH_SITUACAO)}</td>
              <td>{getFilialNome(pedido.FIL_IN_CODIGO)}</td>
              <td>{formatCurrency(pedido.PED_RE_VLMERCADORIA)}</td>
              <td style={{ fontWeight: '600' }}>{formatCurrency(pedido.PED_RE_VALORTOTAL)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
