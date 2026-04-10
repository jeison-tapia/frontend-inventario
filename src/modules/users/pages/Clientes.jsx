import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { username: '', email: '', rol: 'CLIENTE_FINAL', telefono: '', first_name: '', last_name: '', credito_limite: 0 };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('usuarios/?page_size=300');
      // Solo mostramos Clientes
      const datos = (res.data.results || res.data).filter(u => u.rol === 'CLIENTE_FINAL');
      setClientes(datos);
    } catch(e) { console.error(e); }
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null); setError(''); setModal(true);
  };

  const abrirEditar = (user) => {
    setForm({ 
      username: user.username, email: user.email || '', rol: 'CLIENTE_FINAL', 
      telefono: user.telefono || '', first_name: user.first_name || '', 
      last_name: user.last_name || '', credito_limite: user.credito_limite || 0 
    });
    setEditando(user.id); setError(''); setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const pData = { ...form, rol: 'CLIENTE_FINAL' }; // Forzar rol CLIENTE_FINAL siempre
      if (!editando) pData.password = Math.random().toString(36).slice(-8); // Contraseña aleatoria ya que no ingresan al sistema 
      
      if (editando) await api.patch(`usuarios/${editando}/`, pData);
      else await api.post('usuarios/', pData);
      
      cerrarModal(); cargar();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Error al guardar.'));
    }
  };

  const eliminar = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este cliente del sistema?")) return;
    try {
      await api.delete(`usuarios/${id}/`);
      cargar();
    } catch { alert("No se pudo eliminar el cliente. Probablemente tenga facturas asociadas."); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🤝 Directorio de Clientes</h1>
        <p className="page-subtitle">Gestiona tu cartera de clientes para la facturación</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)' }}>{clientes.length} clientes registrados</span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nuevo Cliente</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Identificador (Username)</th>
              <th>Nombre Completo</th>
              <th>Contacto</th>
              <th>Crédito y Deuda</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td>
                  <div>{u.telefono || '—'}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '12px'}}>{u.email}</div>
                </td>
                <td>
                  <div style={{fontWeight: 600, color: 'var(--text-main)'}}>Límite: ${parseFloat(u.credito_limite || 0).toFixed(2)}</div>
                  <div style={{color: parseFloat(u.deuda_actual) > 0 ? '#ef4444' : '#10b981', fontSize: '12px', fontWeight: 600}}>
                    Deuda: ${parseFloat(u.deuda_actual || 0).toFixed(2)}
                  </div>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(u)}>✏️</button>
                    <button className="btn-sm btn-delete" onClick={() => eliminar(u.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan="4" style={{textAlign: 'center', color: 'var(--text-muted)'}}>No hay clientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">{editando ? '✏️ Editar Cliente' : '+ Nuevo Cliente'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Identificador / NIT / Documento (Username)</label>
                <input name="username" className="input-field" style={{marginBottom:0}} value={form.username} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input name="first_name" className="input-field" style={{marginBottom:0}} value={form.first_name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input name="last_name" className="input-field" style={{marginBottom:0}} value={form.last_name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" className="input-field" style={{marginBottom:0}} value={form.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input name="telefono" className="input-field" style={{marginBottom:0}} value={form.telefono} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ visibility: 'hidden', height: 0, overflow: 'hidden', marginBottom: 0 }}>
                  <label className="form-label">Contraseña Temporal</label>
                  <input type="password" name="password" className="input-field" value={form.password || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Crédito Límite ($)</label>
                  <input type="number" step="0.01" name="credito_limite" className="input-field" style={{marginBottom:0}} value={form.credito_limite} onChange={handleChange} />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{background: '#3b82f6'}}>{editando ? 'Guardar Cambios' : 'Crear Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
