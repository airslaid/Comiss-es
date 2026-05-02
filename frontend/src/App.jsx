import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import OrdersTable from './components/OrdersTable';
import MetasManager from './components/MetasManager';
import RankingMetas from './components/RankingMetas';
import PipelineCRM from './components/PipelineCRM';

function App() {
  // Datas padrão: Mês Atual
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados dos Filtros
  const [activeTab, setActiveTab] = useState('all');
  const [filial, setFilial] = useState('ALL');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [status, setStatus] = useState('ALL');
  const [representante, setRepresentante] = useState('');
  const [repsList, setRepsList] = useState([]);
  const [metas, setMetas] = useState([]);

  const fetchMetas = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/metas');
      const data = await res.json();
      setMetas(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetas();
    fetch('http://localhost:3001/api/representantes')
      .then(res => res.json())
      .then(data => setRepsList(data))
      .catch(err => console.error("Erro ao buscar representantes:", err));
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        filial,
        startDate,
        endDate,
        ...(status !== 'ALL' && { status }),
        ...(representante && { representante })
      }).toString();
      
      const response = await fetch(`http://localhost:3001/api/pedidos?${query}`);
      if (!response.ok) throw new Error('Erro ao buscar dados do servidor');
      const data = await response.json();
      setPedidos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Busca sempre que os filtros principais mudarem
  useEffect(() => {
    fetchPedidos();
  }, [filial, startDate, endDate, status, representante]);

  // Reseta o status se for inválido para a aba atual
  useEffect(() => {
    if (activeTab === 'OV' && status === 'F') {
      setStatus('ALL');
    }
    if (activeTab === 'PD' && (status === 'B' || status === 'E')) {
      setStatus('ALL');
    }
  }, [activeTab, status]);

  // Filtro local por aba (Série)
  const filteredData = activeTab === 'all' 
    ? pedidos 
    : pedidos.filter(p => p.SER_ST_CODIGO === activeTab);

  // Estatísticas baseadas nos dados filtrados
  const totalBruto = filteredData.reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0);
  const totalMercadoria = filteredData.reduce((acc, curr) => acc + curr.PED_RE_VLMERCADORIA, 0);
  const valorCancelados = filteredData.filter(p => p.PED_CH_SITUACAO === 'C').reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0);
  const valorLiquido = totalMercadoria - valorCancelados;
  const valorFaturados = filteredData.filter(p => p.PED_CH_SITUACAO === 'F').reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0);
  const count = filteredData.length;

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Lógica de Metas para o Dashboard
  const currentMonth = startDate ? startDate.substring(0, 7) : null;
  let currentMetaValue = 0;
  
  if (currentMonth) {
    if (representante && representante !== 'ALL') {
      const repMeta = metas.find(m => m.mes_ano === currentMonth && m.rep_in_codigo.toString() === representante.toString());
      if (repMeta) currentMetaValue = repMeta.valor_meta;
    } else {
      const monthMetas = metas.filter(m => m.mes_ano === currentMonth);
      currentMetaValue = monthMetas.reduce((acc, curr) => acc + curr.valor_meta, 0);
    }
  }

  const atingimento = currentMetaValue > 0 ? (valorLiquido / currentMetaValue) * 100 : 0;
  let progressColor = '#ef4444'; // Vermelho (Abaixo de 40%)
  if (atingimento >= 40 && atingimento < 100) progressColor = '#f59e0b'; // Amarelo (40% até 99.9%)
  if (atingimento >= 100) progressColor = '#10b981'; // Verde (100% ou mais)

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div className="header-title">
              <h1>
                {activeTab === 'all' && 'Visão Geral das Vendas'}
                {activeTab === 'OV' && 'Orçamentos'}
                {activeTab === 'PD' && 'Pedidos'}
                {activeTab === 'CRM_PIPELINE' && 'CRM: Pipeline de Orçamentos'}
                {activeTab === 'CRM_FOLLOWUP' && 'CRM: Follow Up'}
                {activeTab === 'CRM_AGENDA' && 'CRM: Agenda'}
                {activeTab === 'DV' && 'Desenvolvimentos'}
                {activeTab === 'METAS' && 'Gestão de Metas'}
                {activeTab === 'RANKING' && 'Ranking: Meta x Realizado'}
              </h1>
              <p>Gerenciamento e acompanhamento de vendas Mega ERP</p>
            </div>

            {activeTab !== 'METAS' && (
              <div className="filters-bar">
                <div className="filter-group">
                  <label>Filial</label>
                  <select value={filial} onChange={(e) => setFilial(e.target.value)}>
                    <option value="ALL">Todas</option>
                    <option value="100">AIRSLAID (100)</option>
                    <option value="200">BIG TELAS (200)</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ALL">Todos</option>
                    <option value="AP">Em Aberto</option>
                    {activeTab !== 'PD' && <option value="B">Em Aprovação</option>}
                    {activeTab !== 'OV' && <option value="F">Faturado</option>}
                    <option value="C">Cancelado</option>
                    {activeTab !== 'PD' && <option value="E">Encerrado</option>}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Representante</label>
                  <select 
                    value={representante} 
                    onChange={(e) => setRepresentante(e.target.value)}
                    style={{ width: '220px' }}
                  >
                    <option value="">Todos</option>
                    {repsList.map(rep => (
                      <option key={rep.CODIGO} value={rep.CODIGO}>
                        {rep.NOME}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Início</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="filter-group">
                  <label>Fim</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </header>

          {activeTab === 'METAS' ? (
            <MetasManager repsList={repsList} metas={metas} fetchMetas={fetchMetas} />
          ) : activeTab === 'RANKING' ? (
            <RankingMetas pedidos={pedidos} metas={metas} representantes={repsList} startDate={startDate} />
          ) : activeTab === 'CRM_PIPELINE' ? (
            <PipelineCRM pedidos={pedidos} />
          ) : activeTab === 'CRM_FOLLOWUP' ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <h2 style={{ color: 'var(--text-main)' }}>Módulo Follow Up</h2>
              <p style={{ color: 'var(--text-muted)' }}>Gerenciamento de retornos e acompanhamento de clientes em desenvolvimento.</p>
            </div>
          ) : activeTab === 'CRM_AGENDA' ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <h2 style={{ color: 'var(--text-main)' }}>Módulo Agenda</h2>
              <p style={{ color: 'var(--text-muted)' }}>Sincronização de visitas e compromissos comerciais em desenvolvimento.</p>
            </div>
          ) : (
            <>
              {currentMetaValue > 0 && (activeTab === 'PD' || activeTab === 'all') && (
                <div className="meta-dashboard-panel" style={{ backgroundColor: 'var(--panel-bg)', padding: '0.85rem 1rem', marginBottom: '0.75rem', border: '1px solid var(--panel-border)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Meta do Mês ({currentMonth.split('-').reverse().join('/')})
                      </h3>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                        {formatCurrency(currentMetaValue)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h3 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atingimento</h3>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: progressColor, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {atingimento >= 100 && <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#10b981' }}>🎉 Meta atingida!</span>}
                        {atingimento.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(atingimento, 100)}%`, height: '100%', backgroundColor: progressColor, transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                </div>
              )}

              <section className="stats-grid">
                <StatCard title="Total Bruto" value={formatCurrency(totalBruto)} />
                <StatCard title="Valor Líquido" value={formatCurrency(valorLiquido)} />
                <StatCard 
                  title={activeTab === 'OV' ? "Orçamentos Cancelados" : activeTab === 'DV' ? "Desenvolvimentos Cancelados" : "Pedidos Cancelados"} 
                  value={formatCurrency(valorCancelados)} 
                />
                {activeTab !== 'OV' && activeTab !== 'DV' && <StatCard title="Valor Faturado" value={formatCurrency(valorFaturados)} />}
                <StatCard title="Qtd. Registros" value={count} />
              </section>

              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Atualizando dados...</p>
                </div>
              ) : error ? (
                <div style={{ padding: '2rem', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <p style={{ color: '#dc2626', fontWeight: '500' }}>Erro: {error}</p>
                </div>
              ) : (
                <section className="table-container">
                  {/* Resumo apenas para o PDF */}
                  <div className="print-only-summary" style={{ display: 'none' }}>
                    <h1 style={{ margin: '0 0 10px 0' }}>Relatório de {activeTab === 'all' ? 'Registros' : activeTab === 'OV' ? 'Orçamentos' : activeTab === 'PD' ? 'Pedidos' : 'Desenvolvimentos'}</h1>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <span><strong>Total Bruto:</strong> {formatCurrency(totalBruto)}</span>
                      <span><strong>Valor Líquido:</strong> {formatCurrency(valorLiquido)}</span>
                      {activeTab !== 'OV' && activeTab !== 'DV' && <span><strong>Valor Faturado:</strong> {formatCurrency(valorFaturados)}</span>}
                      <span><strong>Cancelados:</strong> {formatCurrency(valorCancelados)}</span>
                      <span><strong>Qtd:</strong> {count}</span>
                    </div>
                  </div>

                  <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Lista de {activeTab === 'all' ? 'Registros' : 
                                  activeTab === 'OV' ? 'Orçamentos' : 
                                  activeTab === 'PD' ? 'Pedidos' : 'Desenvolvimentos'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => window.print()}
                        className="export-btn"
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        Exportar PDF
                      </button>
                      
                      <button 
                        onClick={() => {
                        const getStatusNome = (s) => {
                          switch(s) {
                            case 'E': return 'Encerrado';
                            case 'A': case 'P': return 'Em Aberto';
                            case 'C': return 'Cancelado';
                            case 'F': return 'Faturado';
                            case 'B': return 'Em Aprovação';
                            default: return s;
                          }
                        };

                        const headers = ["Pedido", "Tipo", "Emissao", "COD", "Cliente", "Representante", "Status", "VLR Liquido", "VLR Bruto"];
                        const rows = filteredData.map(p => [
                          p.PED_IN_CODIGO,
                          p.SER_ST_CODIGO === 'OV' ? 'Orçamento' : p.SER_ST_CODIGO === 'PD' ? 'Pedido' : 'Desenvolvimento',
                          new Date(p.PED_DT_EMISSAO).toLocaleDateString('pt-BR'),
                          p.CLI_IN_CODIGO,
                          p.CLIENTE_NOME,
                          p.REP_NOME || '',
                          getStatusNome(p.PED_CH_SITUACAO),
                          formatCurrency(p.PED_RE_VLMERCADORIA).replace(/\u00a0/g, ' '),
                          formatCurrency(p.PED_RE_VALORTOTAL).replace(/\u00a0/g, ' ')
                        ]);

                        // Adiciona BOM (\ufeff) para o Excel reconhecer UTF-8 (acentos)
                        let csvContent = "\ufeff" 
                          + headers.join(";") + "\n"
                          + rows.map(e => e.join(";")).join("\n");

                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.setAttribute("href", url);
                        link.setAttribute("download", `Exportacao_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="export-btn"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      Exportar Excel
                    </button>
                  </div>
                </div>
                  <OrdersTable pedidos={filteredData} />
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
