import React from 'react';
import StatCard from './StatCard';

const RankingMetas = ({ pedidos, metas, representantes, startDate }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Processar dados para o ranking
  const ranking = representantes.map(rep => {
    // Buscar meta do representante para o mês selecionado
    const currentMonth = startDate ? startDate.substring(0, 7) : null;
    const metaRep = metas.find(m => m.rep_in_codigo === rep.CODIGO && m.mes_ano === currentMonth);
    const valorMeta = metaRep ? metaRep.valor_meta : 0;

    // Calcular realizado (apenas pedidos PD que não estão cancelados)
    const realizado = pedidos
      .filter(p => p.REP_IN_CODIGO === rep.CODIGO && p.SER_ST_CODIGO === 'PD' && p.PED_CH_SITUACAO !== 'C')
      .reduce((sum, p) => sum + (p.PED_RE_VALORTOTAL || 0), 0);

    const percentual = valorMeta > 0 ? (realizado / valorMeta) * 100 : 0;

    return {
      codigo: rep.CODIGO,
      nome: rep.NOME,
      meta: valorMeta,
      realizado: realizado,
      percentual: percentual
    };
  });

  // Ordenar por percentual de atingimento (maior para menor)
  const sortedRanking = ranking
    .filter(r => r.meta > 0 || r.realizado > 0) // Mostrar apenas quem tem meta ou venda
    .sort((a, b) => b.percentual - a.percentual);

  const getProgressColor = (percent) => {
    if (percent < 40) return '#ef4444'; // Vermelho
    if (percent < 100) return '#f59e0b'; // Amarelo
    return '#10b981'; // Verde
  };

  const totalMeta = ranking.reduce((acc, curr) => acc + curr.meta, 0);
  const totalRealizado = ranking.reduce((acc, curr) => acc + curr.realizado, 0);
  const totalAtingimento = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard title="Total Meta" value={formatCurrency(totalMeta)} />
        <StatCard title="Total Realizado" value={formatCurrency(totalRealizado)} />
        <StatCard 
          title="Total Atingimento" 
          value={`${totalAtingimento.toFixed(1)}%`} 
          trend={totalAtingimento >= 100 ? 'up' : 'down'}
        />
      </section>

      <div className="table-container">
      <div className="table-header-bar" style={{ padding: '0.5rem 0.75rem' }}>
        <h2 style={{ fontSize: '0.9rem' }}>Ranking de Atingimento por Representante</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem', textAlign: 'center' }}>Rank</th>
              <th style={{ textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem' }}>Representante</th>
              <th style={{ textAlign: 'center', width: '250px', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem' }}>Atingimento</th>
              <th style={{ textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem' }}>Meta</th>
              <th style={{ textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', padding: '0.35rem' }}>Realizado</th>
            </tr>
          </thead>
          <tbody>
            {sortedRanking.map((item, index) => (
              <tr key={item.codigo}>
                <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {index + 1}º
                </td>
                <td style={{ padding: '0.45rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.7rem' }}>{item.nome}</span>
                  </div>
                </td>
                <td style={{ padding: '0.45rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700' }}>
                      <span style={{ color: getProgressColor(item.percentual) }}>
                        {item.percentual.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: '#e2e8f0', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${Math.min(item.percentual, 100)}%`, 
                        height: '100%', 
                        backgroundColor: getProgressColor(item.percentual),
                        transition: 'width 0.5s ease-out'
                      }}></div>
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '0.45rem', fontSize: '0.7rem', fontWeight: '600' }}>{formatCurrency(item.meta)}</td>
                <td style={{ textAlign: 'center', padding: '0.45rem', fontWeight: '600', fontSize: '0.7rem' }}>{formatCurrency(item.realizado)}</td>
              </tr>
            ))}
            {sortedRanking.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Nenhum dado disponível para o ranking neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default RankingMetas;
