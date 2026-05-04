import { useState } from 'react';

const Sidebar = ({ activeTab, setActiveTab, permissions, session }) => {
  const [crmExpanded, setCrmExpanded] = useState(true);

  const role = permissions?.role || 'USER';
  const allowedModules = permissions?.allowed_modules || ['all'];

  const isAllowed = (id) => {
    if (role === 'ADMIN') return true;
    return allowedModules.includes(id);
  };

  const rawMenuItems = [
    { id: 'all', label: 'Visão Geral', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ) },
    { 
      id: 'CRM', 
      label: 'CRM', 
      isParent: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      ),
      subItems: [
        { id: 'CRM_PIPELINE', label: 'Pipeline' },
        { id: 'CRM_FOLLOWUP', label: 'Follow Up' },
        { id: 'CRM_AGENDA', label: 'Agenda' },
        { id: 'CRM_TAREFAS', label: 'Tarefas' },
      ]
    },
    { id: 'OV', label: 'Orçamentos', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ) },
    { id: 'PD', label: 'Pedidos', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
        <path d="M3 6h18"></path>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
      </svg>
    ) },
    { id: 'DV', label: 'Desenvolvimentos', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
      </svg>
    ) },
    { id: 'CLIENTES', label: 'Carteira de Clientes', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="23 18 20 18 17 18"></polyline>
        <rect x="15" y="2" width="7" height="9" rx="1"></rect>
      </svg>
    ) },
    { id: 'FAT', label: 'Faturamento', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ) },
    { id: 'RANKING', label: 'Meta x Realizado', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ) },
    { id: 'METAS', label: 'Gestão de Metas', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    ) },
    { id: 'USERS', label: 'Gestão de Usuários', icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <polyline points="23 11 20 11 17 11"></polyline>
      </svg>
    ) },
  ];

  // Filtra os itens baseado na permissão
  const menuItems = rawMenuItems
    .filter(item => {
      if (item.isParent) {
        // Se for pai (CRM), mostra se algum filho for permitido
        return item.subItems.some(sub => isAllowed(sub.id));
      }
      return isAllowed(item.id);
    })
    .map(item => {
      if (item.isParent) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => isAllowed(sub.id))
        };
      }
      return item;
    });

  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span className="logo-text" style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>AIR SALES</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              className={`nav-item ${activeTab.startsWith('CRM') && item.id === 'CRM' ? 'active' : activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.isParent) {
                  setCrmExpanded(!crmExpanded);
                  if (!activeTab.startsWith('CRM')) setActiveTab('CRM_PIPELINE');
                } else {
                  setActiveTab(item.id);
                }
              }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
              {item.isParent && (
                <svg 
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: crmExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
            </button>
            
            {item.isParent && crmExpanded && (
              <div className="submenu" style={{ display: 'flex', flexDirection: 'column' }}>
                {item.subItems.map(sub => (
                  <button
                    key={sub.id}
                    className={`nav-item submenu-item ${activeTab === sub.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(sub.id)}
                    style={{ 
                      paddingLeft: '2.5rem', 
                      background: activeTab === sub.id ? '#f1f5f9' : 'transparent', // Cinza azulado bem claro
                      color: activeTab === sub.id ? '#1e293b' : '#64748b',
                      fontWeight: activeTab === sub.id ? '700' : '600'
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-label">Usuário</span>
          <div className="user-name" style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '0.2rem' }}>
            <span className="status-dot"></span>
            {session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Carregando...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

