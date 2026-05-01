const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'all', label: 'Visão Geral' },
    { id: 'OV', label: 'Orçamentos' },
    { id: 'PD', label: 'Pedidos' },
    { id: 'DV', label: 'Desenvolvimentos' },
    { id: 'METAS', label: 'Gestão de Metas' },
    { id: 'RANKING', label: 'Meta x Realizado' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-text">MegaCRM</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>v1.0.0</p>
      </div>
    </div>
  );
};

export default Sidebar;

