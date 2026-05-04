import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h1 style={styles.title}>SalesPay Pro</h1>
          <p style={styles.subtitle}>Gestão de Vendas Mega ERP</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && (
            <div style={styles.errorBadge}>
              {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail de Acesso</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
          </button>
        </form>

        <div style={styles.footer}>
          <p>© 2026 SalesPay Pro. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // Light gray/blue neutral background
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  loginBox: {
    width: '100%',
    maxWidth: '380px',
    padding: '3rem 2.5rem',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    animation: 'fadeIn 0.6s ease-out',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  logoContainer: {
    marginBottom: '1.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#0f172a',
    fontSize: '1.5rem',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '0.05em',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    marginTop: '0.4rem',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    color: '#475569',
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s',
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.875rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1e293b', // Dark navy for contrast
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    transition: 'all 0.2s',
  },
  errorBadge: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#ef4444',
    fontSize: '0.8rem',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    marginTop: '2.5rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.7rem',
  }
};

export default Login;
