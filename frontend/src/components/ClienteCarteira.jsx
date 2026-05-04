import React, { useState, useMemo } from 'react';

const ClienteCarteira = ({ clientes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const filteredClientes = useMemo(() => {
    if (!clientes) return [];
    return clientes.filter(c => 
      c.AGN_ST_NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.AGN_ST_CGC.includes(searchTerm)
    );
  }, [clientes, searchTerm]);

  const totalPages = Math.ceil(filteredClientes.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredClientes.slice(indexOfFirstRow, indexOfLastRow);

  return (
    <div className="panel animate-up">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="panel-title">Carteira de Clientes</h2>
          <p className="panel-subtitle">Listagem de clientes ativos vinculados à sua conta</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Buscar por nome ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--panel-border)',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CÓDIGO</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>RAZÃO SOCIAL / NOME</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CNPJ / CPF</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CIDADE / UF</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CONTATO</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              currentRows.map((cliente, index) => (
                <tr key={cliente.AGN_IN_CODIGO} style={{ backgroundColor: index % 2 !== 0 ? 'var(--bg-color)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.85rem', fontWeight: '500' }}>
                    #{cliente.AGN_IN_CODIGO}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.85rem', fontWeight: '600' }}>
                    {cliente.AGN_ST_NOME}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {cliente.AGN_ST_CGC}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
                    {cliente.AGN_ST_MUNICIPIO} / {cliente.UF_ST_SIGLA}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem' }}>{cliente.AGN_ST_TELEFONE || '-'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>{cliente.AGN_ST_EMAIL || ''}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Mostrando {indexOfFirstRow + 1} a {Math.min(indexOfLastRow, filteredClientes.length)} de {filteredClientes.length} clientes
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.4rem 0.8rem' }}
            >
              Anterior
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '0.4rem 0.8rem' }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteCarteira;
