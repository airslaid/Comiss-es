import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import OrdersTable from './components/OrdersTable';

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

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        filial,
        startDate,
        endDate
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
  }, [filial, startDate, endDate]);

  // Filtro local por aba (Série)
  const filteredData = activeTab === 'all' 
    ? pedidos 
    : pedidos.filter(p => p.SER_ST_CODIGO === activeTab);

  // Estatísticas baseadas nos dados filtrados
  const stats = {
    total: filteredData.reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0),
    mercadoria: filteredData.reduce((acc, curr) => acc + curr.PED_RE_VLMERCADORIA, 0),
    count: filteredData.length,
    ticket: filteredData.length ? (filteredData.reduce((acc, curr) => acc + curr.PED_RE_VALORTOTAL, 0) / filteredData.length) : 0
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div className="header-title">
              <h1>{activeTab === 'all' ? 'Visão Geral' : 
                   activeTab === 'OV' ? 'Orçamentos' : 
                   activeTab === 'PD' ? 'Pedidos' : 'Desenvolvimentos'}</h1>
              <p>Gerenciamento e acompanhamento de vendas Mega ERP</p>
            </div>

            <div className="filters-bar">
              <div className="filter-group">
                <label>Filial</label>
                <select value={filial} onChange={(e) => setFilial(e.target.value)}>
                  <option value="ALL">Todas as Filiais</option>
                  <option value="100">AIRSLAID (100)</option>
                  <option value="200">BIG TELAS (200)</option>
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
          </header>

          <section className="stats-grid">
            <StatCard title="Total Bruto" value={formatCurrency(stats.total)} />
            <StatCard title="Total Mercadoria" value={formatCurrency(stats.mercadoria)} />
            <StatCard title="Qtd. Registros" value={stats.count} />
            <StatCard title="Ticket Médio" value={formatCurrency(stats.ticket)} />
          </section>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Atualizando dados...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', backgroundColor: '#3b1a1a', borderRadius: '12px', border: '1px solid #ef4444' }}>
              <p style={{ color: '#f87171' }}>Erro: {error}</p>
            </div>
          ) : (
            <section className="table-container">
              <div className="table-header-bar">
                <h2>Lista de {activeTab === 'all' ? 'Registros' : 
                               activeTab === 'OV' ? 'Orçamentos' : 
                               activeTab === 'PD' ? 'Pedidos' : 'Desenvolvimentos'}</h2>
              </div>
              <OrdersTable pedidos={filteredData} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
