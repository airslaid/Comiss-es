import React, { useState, useEffect, useMemo } from 'react';
import StatCard from './StatCard';

const VisaoGeralComissoes = ({ faturamentos, metas, atingimentoMensal, manualDates }) => {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    fetchPagamentos();
  }, []);

  const getCommissionValue = (fat, role) => {
    let orderDate = fat.PEDIDOS_DATAS;
    if (!orderDate && manualDates && manualDates[fat.NOT_IN_NUMERO]) {
      const parts = manualDates[fat.NOT_IN_NUMERO].split('-');
      orderDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    if (!orderDate) return 0;
    const firstDate = orderDate.split(',')[0].trim();
    const [day, month, year] = firstDate.split('/');
    const mesAno = `${year}-${month}`;
    const repId = Number(fat.REP_IN_CODIGO);

    const metaObj = metas.find(m => Number(m.rep_in_codigo) === repId && m.mes_ano === mesAno);
    const valorMeta = metaObj ? metaObj.valor_meta : 0;
    const realObj = atingimentoMensal.find(a => Number(a.REP_IN_CODIGO) === repId && a.MES_ANO === mesAno);
    const valorRealizado = realObj ? realObj.TOTAL_REALIZADO : 0;
    const atingimentoRep = valorMeta > 0 ? (valorRealizado / valorMeta) * 100 : 0;

    let pct = 0;

    if (role === 'COMISSOES_GERENTE') {
      const totalMetaMes = metas.filter(m => m.mes_ano === mesAno).reduce((acc, curr) => acc + curr.valor_meta, 0);
      const totalRealMes = atingimentoMensal.filter(a => a.MES_ANO === mesAno).reduce((acc, curr) => acc + curr.TOTAL_REALIZADO, 0);
      const atingimentoGeral = totalMetaMes > 0 ? (totalRealMes / totalMetaMes) * 100 : 0;
      pct = atingimentoGeral <= 85 ? 0.35 : 0.5;
    } 
    else if (role === 'COMISSOES_SUPERVISOR' || role === 'COMISSOES_EXECUTIVO') {
      pct = atingimentoRep <= 85 ? 0.15 : 0.25;
    }
    else if (role === 'COMISSOES_ASSISTENTE') {
      pct = 0.05;
    }
    else {
      // Exceção: AIR SLAID TECIDOS TÉCNICOS LTDA (Fixo 1%)
      if (fat.REP_NOME && fat.REP_NOME.toUpperCase().includes('AIR SLAID')) {
        pct = 1;
      }
      else if (valorMeta === 0) pct = 0;
      else if (atingimentoRep <= 65) pct = 1;
      else if (atingimentoRep <= 85) pct = 1.5;
      else pct = 2;
    }

    return (fat.NOT_RE_VALORTOTAL || 0) * (pct / 100);
  };

  const totals = useMemo(() => {
    const roles = ['COMISSOES_REPS', 'COMISSOES_GERENTE', 'COMISSOES_SUPERVISOR', 'COMISSOES_EXECUTIVO', 'COMISSOES_ASSISTENTE'];
    const summary = {
      totalGeral: 0,
      porCargo: {},
      pago: 0,
      pendente: 0,
      faturamentoTotal: 0
    };

    faturamentos.forEach(fat => {
      summary.faturamentoTotal += (fat.NOT_RE_VALORTOTAL || 0);
      roles.forEach(role => {
        const vlr = getCommissionValue(fat, role);
        summary.totalGeral += vlr;
        summary.porCargo[role] = (summary.porCargo[role] || 0) + vlr;

        const isPago = pagamentos.some(p => 
          p.nf_numero === fat.NOT_IN_NUMERO && 
          p.org_in_codigo === fat.ORG_IN_CODIGO && 
          p.role === role
        );

        if (isPago) summary.pago += vlr;
        else summary.pendente += vlr;
      });
    });

    return summary;
  }, [faturamentos, pagamentos, metas, atingimentoMensal, manualDates]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const roleLabels = {
    'COMISSOES_REPS': 'Representantes',
    'COMISSOES_GERENTE': 'Gerente Comercial',
    'COMISSOES_SUPERVISOR': 'Supervisor de Vendas',
    'COMISSOES_EXECUTIVO': 'Executivo de Vendas',
    'COMISSOES_ASSISTENTE': 'Assistente / Orçamentista'
  };

  return (
    <div className="visao-geral-comissoes" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <StatCard title="Comissão Total Gerada" value={formatCurrency(totals.totalGeral)} />
        <StatCard title="Total Pendente" value={formatCurrency(totals.pendente)} />
        <StatCard title="Total Já Pago" value={formatCurrency(totals.pago)} />
        <StatCard title="Atingimento Geral" value={`${((totals.pago / totals.totalGeral) * 100 || 0).toFixed(1)}%`} trend={totals.pago >= totals.totalGeral ? 'up' : 'down'} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Distribuição por Cargo */}
        <div className="panel" style={{ backgroundColor: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distribuição por Cargo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(totals.porCargo).sort((a,b) => b[1] - a[1]).map(([role, value]) => {
              const pct = (value / totals.totalGeral) * 100;
              return (
                <div key={role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '600' }}>{roleLabels[role]}</span>
                    <span style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{formatCurrency(value)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--accent-color)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="panel" style={{ backgroundColor: 'var(--panel-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eficiência de Comissão</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                {((totals.totalGeral / totals.faturamentoTotal) * 100 || 0).toFixed(2)}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Impacto Médio da Comissão sobre o Faturamento</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{formatCurrency(totals.totalGeral / (faturamentos.length || 1))}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Custo Médio por NF</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{faturamentos.length}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total de Notas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisaoGeralComissoes;
