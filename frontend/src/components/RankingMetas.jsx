import React from 'react';

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

  return (
    <div className="table-container">
      <div className="table-header-bar">
        <h2>Ranking de Atingimento por Representante</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th style={{ textAlign: 'left' }}>Representante</th>
              <th style={{ textAlign: 'center', width: '300px' }}>Atingimento</th>
              <th style={{ textAlign: 'right' }}>Meta</th>
              <th style={{ textAlign: 'right' }}>Realizado</th>
            </tr>
          </thead>
          <tbody>
            {sortedRanking.map((item, index) => (
              <tr key={item.codigo}>
                <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {index + 1}º
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.nome}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {item.codigo}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '700' }}>
                      <span style={{ color: getProgressColor(item.percentual) }}>
                        {item.percentual.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: '#e2e8f0', 
                      borderRadius: '4px',
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
                <td style={{ textAlign: 'right', padding: '1rem' }}>{formatCurrency(item.meta)}</td>
                <td style={{ textAlign: 'right', padding: '1rem', fontWeight: '500' }}>{formatCurrency(item.realizado)}</td>
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
  );
};

export default RankingMetas;
