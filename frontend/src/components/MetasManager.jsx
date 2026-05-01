import React, { useState, useEffect } from 'react';

const MetasManager = ({ repsList, metas, fetchMetas }) => {
  const [formData, setFormData] = useState({
    rep_in_codigo: '',
    mes_ano: new Date().toISOString().slice(0, 7), // YYYY-MM
    valor_meta: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.rep_in_codigo || !formData.valor_meta || !formData.mes_ano) return;

    const rep = repsList.find(r => r.CODIGO.toString() === formData.rep_in_codigo.toString());
    
    try {
      await fetch('http://localhost:3001/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rep_in_codigo: parseInt(formData.rep_in_codigo, 10),
          rep_nome: rep ? rep.NOME : 'Desconhecido',
          mes_ano: formData.mes_ano,
          valor_meta: parseFloat(formData.valor_meta)
        })
      });
      setFormData({ ...formData, valor_meta: '' });
      fetchMetas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta meta?')) return;
    try {
      await fetch(`http://localhost:3001/api/metas/${id}`, { method: 'DELETE' });
      fetchMetas();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const displayedMetas = formData.rep_in_codigo
    ? metas.filter(m => m.rep_in_codigo.toString() === formData.rep_in_codigo.toString())
    : metas;

  return (
    <div className="metas-container">
      <div className="metas-form-card" style={{ backgroundColor: 'var(--panel-bg)', padding: '2rem', border: '1px solid var(--panel-border)', marginBottom: '2rem', borderRadius: '6px' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Cadastrar Meta Mensal</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filter-group" style={{ flex: '2 1 300px' }}>
            <label>Representante</label>
            <select 
              value={formData.rep_in_codigo} 
              onChange={e => setFormData({...formData, rep_in_codigo: e.target.value})}
              required
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}
            >
              <option value="">Selecione...</option>
              {repsList.map(rep => (
                <option key={rep.CODIGO} value={rep.CODIGO}>{rep.NOME}</option>
              ))}
            </select>
          </div>
          <div className="filter-group" style={{ flex: '1 1 150px' }}>
            <label>Mês / Ano</label>
            <input 
              type="month" 
              value={formData.mes_ano}
              onChange={e => setFormData({...formData, mes_ano: e.target.value})}
              required
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}
            />
          </div>
          <div className="filter-group" style={{ flex: '1 1 150px' }}>
            <label>Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.valor_meta}
              onChange={e => setFormData({...formData, valor_meta: e.target.value})}
              placeholder="Ex: 50000.00"
              required
              style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '6px' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '6px' }}>
            Salvar Meta
          </button>
        </form>
      </div>

      <div className="table-container">
        <div className="table-header-bar">
          <h2>Metas Cadastradas</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Mês/Ano</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Representante</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Valor da Meta</th>
              <th style={{ width: '100px', textAlign: 'center', padding: '1rem', borderBottom: '2px solid var(--panel-border)' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {displayedMetas.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma meta encontrada.</td></tr>
            ) : (
              displayedMetas.map(meta => (
                <tr key={meta.id}>
                  <td style={{ fontWeight: '600', padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                    {meta.mes_ano.split('-').reverse().join('/')}
                  </td>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{meta.rep_nome}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cód: {meta.rep_in_codigo}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--accent-color)', padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                    {formatCurrency(meta.valor_meta)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
                    <button 
                      onClick={() => handleDelete(meta.id)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', borderRadius: '4px' }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MetasManager;
