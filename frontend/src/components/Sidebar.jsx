const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'all', label: 'Visão Geral', icon: '📊' },
    { id: 'OV', label: 'Orçamentos', icon: '📝' },
    { id: 'PD', label: 'Pedidos', icon: '🛒' },
    { id: 'DV', label: 'Desenvolvimentos', icon: '⚙️' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🚀</span>
        <span className="logo-text">MegaCRM</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
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
