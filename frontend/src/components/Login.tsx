import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(username.trim());
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ width: 320, padding: '2rem', border: '1px solid #ccc', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>KSP Intelligence Portal</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Sign in to continue</p>
        <input
          type="text"
          placeholder="Officer ID"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
          autoFocus
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.5rem' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '0.75rem' }}>{error}</p>}
      </form>
    </div>
  );
};

export default Login;
