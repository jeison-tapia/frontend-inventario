import { useState, useEffect } from 'react';
import axiosInstance from '../../../shared/api/axiosInstance';

export default function Perfil() {
  const [perfil, setPerfil] = useState({ username: '', email: '', telefono: '', first_name: '', last_name: '' });
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    axiosInstance.get('usuarios/mi_perfil/')
      .then(res => setPerfil(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      const dataToUpdate = { ...perfil };
      if (password) dataToUpdate.password = password;
      
      await axiosInstance.patch('usuarios/mi_perfil/', dataToUpdate);
      setMensaje({ texto: 'Perfil actualizado exitosamente. ✅', tipo: 'success' });
      setPassword(''); 
    } catch (error) {
      console.error(error);
      const resData = error.response?.data;
      const errorMsg = typeof resData === 'object' ? JSON.stringify(resData) : error.message;
      setMensaje({ texto: `Error al actualizar perfil: ${errorMsg}`, tipo: 'error' });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👤 Mi Perfil corporativo</h1>
        <p className="page-subtitle">Configura tu información personal y credenciales de acceso.</p>
      </div>
      
      {mensaje.texto && (
        <div className="alert-box" style={{ 
          backgroundColor: mensaje.tipo === 'success' ? '#d4edda' : '#f8d7da', 
          color: mensaje.tipo === 'success' ? '#155724' : '#721c24',
          border: 'none'
        }}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleGuardar} className="modal-box" style={{ maxWidth: '500px', margin: '2rem auto', position: 'static', transform: 'none' }}>
        
        <div className="form-group">
          <label className="form-label">Nombre de Usuario (Solo Lectura)</label>
          <input type="text" className="input-field" value={perfil.username} disabled style={{ backgroundColor: '#f8f9fa' }} />
        </div>

        <div className="form-group">
          <label className="form-label">Nombres</label>
          <input type="text" className="input-field" value={perfil.first_name} onChange={e => setPerfil({...perfil, first_name: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Apellidos</label>
          <input type="text" className="input-field" value={perfil.last_name} onChange={e => setPerfil({...perfil, last_name: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Correo Electrónico</label>
          <input type="email" className="input-field" value={perfil.email || ''} onChange={e => setPerfil({...perfil, email: e.target.value})} />
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Nueva Contraseña (Opcional)</label>
          <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="Dejar en blanco para no cambiarla" />
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}>💾 Guardar Cambios</button>
      </form>
    </div>
  );
}
