import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/api/axiosInstance';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('token/', { username, password });
      sessionStorage.setItem('access_token', res.data.access);
      sessionStorage.setItem('refresh_token', res.data.refresh);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas o error de conexión al servidor.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleLogin} className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Bienvenido a Tecnologias M&J</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        
        <div>
          <input 
            type="text" 
            placeholder="Usuario" 
            className="input-field"
            value={username} onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="input-field"
            value={password} onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
          Entrar al Sistema
        </button>
      </form>
    </div>
  );
}
