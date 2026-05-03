import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import OrdersTable from './components/OrdersTable';
import MetasManager from './components/MetasManager';
import RankingMetas from './components/RankingMetas';
import PipelineCRM from './components/PipelineCRM';
import FaturamentoTable from './components/FaturamentoTable';
import FollowUpList from './components/FollowUpList';
import './App.css';

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
  const [faturamentos, setFaturamentos] = useState([]);

  const fetchMetas = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/metas');
      const data = await res.json();
      setMetas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetas();
    fetch('http://localhost:3001/api/representantes')
      .then(res => res.json())
      .then(data => setRepsList(Array.isArray(data) ? data : []))
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
      setPedidos(Array.isArray(data) ? data : []);
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
    fetchFaturamentos();
  }, [filial, startDate, endDate, status, representante, activeTab]);

  const fetchFaturamentos = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        filial,
        startDate,
        endDate,
        ...(representante && { representante })
      }).toString();
      
      const response = await fetch(`http://localhost:3001/api/faturamentos?${query}`);
      if (!response.ok) throw new Error('Erro ao buscar faturamentos');
      const data = await response.json();
      setFaturamentos(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    : activeTab === 'FAT'
      ? faturamentos
      : pedidos.filter(p => p.SER_ST_CODIGO === activeTab);

  // Estatísticas baseadas nos dados filtrados
  const valorCancelados = activeTab === 'FAT'
    ? filteredData.filter(p => p.NOT_CH_SITUACAO === 'C').reduce((acc, curr) => acc + curr.NOT_RE_VALORTOTAL, 0)
    : filteredData.filter(p => p.PED_CH_SITUACAO === 'C').reduce((acc, curr) => acc + curr.NOT_RE_VALORTOTAL, 0); // Wait, Pedidos use PED_RE_VALORTOTAL
  
  // Refined stat calculation
  const isFat = activeTab === 'FAT';
  const valTotalKey = isFat ? 'NOT_RE_VALORTOTAL' : 'PED_RE_VALORTOTAL';
  const valMercKey = isFat ? 'NOT_RE_VALORMERCADORIA' : 'PED_RE_VLMERCADORIA';
  const sitKey = isFat ? 'NOT_CH_SITUACAO' : 'PED_CH_SITUACAO';

  const totalBruto = filteredData.reduce((acc, curr) => acc + (curr[valTotalKey] || 0), 0);
  const totalMercadoria = filteredData.reduce((acc, curr) => acc + (curr[valMercKey] || 0), 0);
  const valorCanceladosSum = filteredData.filter(p => p[sitKey] === 'C').reduce((acc, curr) => acc + (curr[valTotalKey] || 0), 0);
  const valorLiquido = totalMercadoria - valorCanceladosSum;
  const valorFaturados = faturamentos.reduce((acc, curr) => acc + (curr.NOT_RE_VALORTOTAL || 0), 0);
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

  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <div className="dashboard-container">
          <header className="dashboard-header" style={{ marginBottom: showFilters ? '1rem' : '2rem' }}>
            <div className="header-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  {activeTab === 'FAT' && 'Relatório de Faturamento'}
                </h1>
                {activeTab !== 'METAS' && (
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                      background: showFilters ? '#1e293b' : '#ffffff',
                      color: showFilters ? '#ffffff' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    {showFilters ? 'OCULTAR FILTROS' : 'FILTRAR'}
                  </button>
                )}
              </div>
              <p style={{ marginTop: '0.2rem' }}>Gerenciamento e acompanhamento de vendas Mega ERP</p>
            </div>
          </header>

          {activeTab !== 'METAS' && showFilters && (
            <div className="filters-panel" style={{ 
              backgroundColor: '#ffffff', 
              padding: '1rem', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'flex-end',
              animation: 'slideDown 0.3s ease-out'
            }}>
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
              <button 
                onClick={() => {
                  if (activeTab === 'FAT') {
                    fetchFaturamentos();
                  } else {
                    fetchPedidos();
                  }
                }}
                style={{
                  backgroundColor: '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.4rem 1rem',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                APLICAR
              </button>
            </div>
          )}

          {activeTab === 'METAS' ? (
            <MetasManager repsList={repsList} metas={metas} fetchMetas={fetchMetas} />
          ) : activeTab === 'RANKING' ? (
            <RankingMetas pedidos={pedidos} metas={metas} representantes={repsList} startDate={startDate} />
          ) : activeTab === 'CRM_PIPELINE' ? (
            <PipelineCRM pedidos={pedidos} />
          ) : activeTab === 'CRM_FOLLOWUP' ? (
            <FollowUpList />
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

              <section className="stats-grid" style={{ gridTemplateColumns: activeTab === 'FAT' ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {activeTab === 'FAT' ? (
                  <>
                    <StatCard title="Valor Total Faturamento" value={formatCurrency(totalBruto)} />
                    <StatCard title="Qtd. de Notas Fiscais" value={count} />
                  </>
                ) : (
                  <>
                    <StatCard title="Total Bruto" value={formatCurrency(totalBruto)} />
                    <StatCard title="Valor Líquido" value={formatCurrency(valorLiquido)} />
                    <StatCard 
                      title={activeTab === 'OV' ? "Orçamentos Cancelados" : activeTab === 'DV' ? "Desenvolvimentos Cancelados" : "Pedidos Cancelados"} 
                      value={formatCurrency(valorCanceladosSum)} 
                    />
                    {activeTab !== 'OV' && activeTab !== 'DV' && <StatCard title="Valor Faturado" value={formatCurrency(valorFaturados)} />}
                    <StatCard title="Qtd. Registros" value={count} />
                  </>
                )}
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
                                  activeTab === 'PD' ? 'Pedidos' : 
                                  activeTab === 'FAT' ? 'Faturamento' : 'Desenvolvimentos'}</h2>
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
                         const headers = activeTab === 'FAT' 
                           ? ["NF Numero", "Pedido", "Emissao Ped.", "Serie", "Emissao", "Cod Cliente", "Cliente", "Representante", "Status", "Vlr Mercadoria", "Vlr Total"]
                           : ["Pedido", "Tipo", "Emissao", "COD", "Cliente", "Representante", "Status", "VLR Liquido", "VLR Bruto"];
                         
                         const dataToExport = activeTab === 'FAT' ? faturamentos : filteredData;
                         
                         const rows = dataToExport.map(p => {
                           if (activeTab === 'FAT') {
                             return [
                               p.NOT_IN_NUMERO,
                               p.PEDIDOS || '',
                               p.PEDIDOS_DATAS || '',
                               p.SER_ST_CODIGO,
                               new Date(p.NOT_DT_EMISSAO).toLocaleDateString('pt-BR'),
                               p.AGN_IN_CODIGO,
                               p.CLIENTE_NOME,
                               p.REP_NOME || '',
                               p.NOT_CH_SITUACAO === 'N' || p.NOT_CH_SITUACAO === 'A' ? 'Ativa' : p.NOT_CH_SITUACAO,
                               formatCurrency(p.NOT_RE_VALORMERCADORIA).replace(/\u00a0/g, ' '),
                               formatCurrency(p.NOT_RE_VALORTOTAL).replace(/\u00a0/g, ' ')
                             ];
                           } else {
                             return [
                               p.PED_IN_CODIGO,
                               p.SER_ST_CODIGO === 'OV' ? 'Orçamento' : p.SER_ST_CODIGO === 'PD' ? 'Pedido' : 'Desenvolvimento',
                               new Date(p.PED_DT_EMISSAO).toLocaleDateString('pt-BR'),
                               p.CLI_IN_CODIGO,
                               p.CLIENTE_NOME,
                               p.REP_NOME || '',
                               getStatusNome(p.PED_CH_SITUACAO),
                               formatCurrency(p.PED_RE_VLMERCADORIA).replace(/\u00a0/g, ' '),
                               formatCurrency(p.PED_RE_VALORTOTAL).replace(/\u00a0/g, ' ')
                             ];
                           }
                         });

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
                  {activeTab === 'FAT' ? (
                    <FaturamentoTable faturamentos={faturamentos} />
                  ) : (
                    <OrdersTable pedidos={filteredData} />
                  )}
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
