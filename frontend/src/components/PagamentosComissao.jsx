import React, { useState, useEffect, useMemo } from 'react';

const PagamentosComissao = ({ faturamentos, metas, atingimentoMensal, manualDates, session }) => {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('COMISSOES_REPS');
  const [submitting, setSubmitting] = useState(false);

  const fetchPagamentos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/comissoes/pagamentos');
      if (response.ok) {
        const data = await response.json();
        setPagamentos(data);
      }
    } catch (error) {
      console.error("Erro ao buscar pagamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPagamentos();
  }, []);

  const getCommissionData = (fat, role) => {
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

  const dataComStatus = useMemo(() => {
    return faturamentos.map(fat => {
      const commData = getCommissionData(fat, selectedRole);
      const pagamento = pagamentos.find(p => 
        p.nf_numero === fat.NOT_IN_NUMERO && 
        p.org_in_codigo === fat.ORG_IN_CODIGO && 
        p.role === selectedRole
      );
      
      return {
        ...fat,
        ...commData,
        pago: !!pagamento,
        pagamentoId: pagamento?.id
      };
    });
  }, [faturamentos, pagamentos, selectedRole, metas, atingimentoMensal, manualDates]);

  const handlePagar = async (fat) => {
    if (submitting) return;
    setSubmitting(true);

    let orderDateStr = fat.PEDIDOS_DATAS;
    if (!orderDateStr && manualDates[fat.NOT_IN_NUMERO]) {
        orderDateStr = manualDates[fat.NOT_IN_NUMERO]; // YYYY-MM-DD
    }

    let mesAno = "";
    if (fat.PEDIDOS_DATAS) {
        const [d, m, y] = fat.PEDIDOS_DATAS.split(',')[0].trim().split('/');
        mesAno = `${y}-${m}`;
    } else {
        const [y, m, d] = manualDates[fat.NOT_IN_NUMERO].split('-');
        mesAno = `${y}-${m}`;
    }

    try {
      const response = await fetch('/api/comissoes/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nf_numero: fat.NOT_IN_NUMERO,
          org_in_codigo: fat.ORG_IN_CODIGO,
          role: selectedRole,
          valor_comissao: fat.valor,
          mes_ano_referencia: mesAno,
          rep_in_codigo: fat.REP_IN_CODIGO,
          pago_por: session?.user?.id
        })
      });

      if (response.ok) {
        fetchPagamentos();
      } else {
        const err = await response.json();
        alert(err.error || "Erro ao registrar pagamento");
      }
    } catch (error) {
      console.error("Erro ao pagar:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstornar = async (id) => {
    if (!window.confirm("Deseja realmente estornar este pagamento?")) return;
    try {
      const response = await fetch(`/api/comissoes/pagamentos/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchPagamentos();
      }
    } catch (error) {
      console.error("Erro ao estornar:", error);
    }
  };

  const handlePagarLote = async () => {
    const pendentes = dataComStatus.filter(d => !d.pago && d.valor > 0);
    if (pendentes.length === 0) {
      alert("Não há lançamentos pendentes com valor para este período/cargo.");
      return;
    }

    if (!window.confirm(`Deseja marcar os ${pendentes.length} lançamentos pendentes como PAGOS?`)) return;
    
    setSubmitting(true);

    const items = pendentes.map(fat => {
      let mesAno = "";
      if (fat.PEDIDOS_DATAS) {
          const [d, m, y] = fat.PEDIDOS_DATAS.split(',')[0].trim().split('/');
          mesAno = `${y}-${m}`;
      } else {
          const [y, m, d] = manualDates[fat.NOT_IN_NUMERO].split('-');
          mesAno = `${y}-${m}`;
      }
      return {
        nf_numero: fat.NOT_IN_NUMERO,
        org_in_codigo: fat.ORG_IN_CODIGO,
        role: selectedRole,
        valor_comissao: fat.valor,
        mes_ano_referencia: mesAno,
        rep_in_codigo: fat.REP_IN_CODIGO,
        pago_por: session?.user?.id
      };
    });

    try {
      const response = await fetch('/api/comissoes/pagamentos/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        fetchPagamentos();
      } else {
        const err = await response.json();
        alert(err.error || "Erro ao registrar pagamentos em lote");
      }
    } catch (error) {
      console.error("Erro ao pagar lote:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const totalAPagar = dataComStatus.filter(d => !d.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const totalPago = dataComStatus.filter(d => d.pago).reduce((acc, curr) => acc + curr.valor, 0);

  const thStyle = {
    padding: '0.45rem 0.5rem',
    borderBottom: '2px solid var(--panel-border)',
    backgroundColor: 'var(--bg-color)',
    fontSize: '0.6rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '0.45rem 0.5rem',
    borderBottom: '1px solid var(--panel-border)',
    fontSize: '0.7rem',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    textAlign: 'center'
  };

  return (
    <div className="pagamentos-container" style={{ padding: '1rem' }}>
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>CARGO:</label>
          <select 
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--panel-border)', fontSize: '0.8rem' }}
          >
            <option value="COMISSOES_REPS">Representantes</option>
            <option value="COMISSOES_GERENTE">Gerente Comercial</option>
            <option value="COMISSOES_SUPERVISOR">Supervisor de Vendas</option>
            <option value="COMISSOES_EXECUTIVO">Executivo de Vendas</option>
            <option value="COMISSOES_ASSISTENTE">Assistente / Orçamentista</option>
          </select>
          <button 
            onClick={handlePagarLote}
            disabled={submitting || dataComStatus.filter(d => !d.pago && d.valor > 0).length === 0}
            style={{ 
              padding: '0.4rem 0.8rem', 
              backgroundColor: '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Pagar Lote
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>A Pagar</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444' }}>{formatCurrency(totalAPagar)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Já Pago</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#10b981' }}>{formatCurrency(totalPago)}</div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', backgroundColor: 'var(--panel-bg)', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={thStyle}>NF</th>
              <th style={thStyle}>Pedido</th>
              <th style={thStyle}>Emissão Ped.</th>
              <th style={thStyle}>Emissão</th>
              <th style={thStyle}>Cód Cliente</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Cliente</th>
              <th style={thStyle}>Representante</th>
              <th style={thStyle}>Vlr Total</th>
              <th style={thStyle}>% Comiss.</th>
              <th style={thStyle}>Vlr Comissão</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {dataComStatus.map((fat, idx) => (
              <tr key={`${fat.NOT_IN_NUMERO}-${idx}`} style={{ backgroundColor: idx % 2 !== 0 ? '#f1f5f9' : 'transparent' }}>
                <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--accent-color)' }}>#{fat.NOT_IN_NUMERO}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{fat.PEDIDOS || '-'}</td>
                <td style={tdStyle}>{fat.PEDIDOS_DATAS || manualDates[fat.NOT_IN_NUMERO] || '-'}</td>
                <td style={tdStyle}>{new Date(fat.NOT_DT_EMISSAO).toLocaleDateString('pt-BR')}</td>
                <td style={tdStyle}>{fat.AGN_IN_CODIGO}</td>
                <td style={{ ...tdStyle, textAlign: 'left', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fat.CLIENTE_NOME}</td>
                <td style={tdStyle}>{fat.REP_NOME}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{formatCurrency(fat.NOT_RE_VALORTOTAL)}</td>
                <td style={{ ...tdStyle, fontWeight: '700', color: '#10b981' }}>
                  {fat.pct}%
                  <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                    ({fat.atingimento.toFixed(1)}% base)
                  </div>
                </td>
                <td style={{ ...tdStyle, fontWeight: '700', color: 'var(--accent-color)' }}>{formatCurrency(fat.valor)}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '12px', 
                    fontSize: '0.6rem', 
                    fontWeight: '700',
                    backgroundColor: fat.pago ? '#d1fae5' : '#fee2e2',
                    color: fat.pago ? '#065f46' : '#991b1b'
                  }}>
                    {fat.pago ? 'PAGO' : 'PENDENTE'}
                  </span>
                </td>
                <td style={tdStyle}>
                  {fat.pago ? (
                    <button 
                      onClick={() => handleEstornar(fat.pagamentoId)}
                      style={{ padding: '0.2rem 0.5rem', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}
                    >
                      Estornar
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePagar(fat)}
                      disabled={fat.valor === 0}
                      style={{ 
                        padding: '0.2rem 0.5rem', 
                        backgroundColor: fat.valor === 0 ? '#e2e8f0' : '#10b981', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: fat.valor === 0 ? 'not-allowed' : 'pointer', 
                        fontSize: '0.65rem',
                        fontWeight: '700'
                      }}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PagamentosComissao;
