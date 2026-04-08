import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { username: '', email: '', rol: 'VENDEDOR', telefono: '', first_name: '', last_name: '', password: '' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('usuarios/?page_size=100');
      // Solo mostramos Administradores y Vendedores
      const personal = (res.data.results || res.data).filter(u => u.rol !== 'CLIENTE');
      setUsuarios(personal);
    } catch(e) { console.error(e); }
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null); setError(''); setModal(true);
  };

  const abrirEditar = (user) => {
    setForm({ 
      username: user.username, email: user.email || '', rol: user.rol, 
      telefono: user.telefono || '', first_name: user.first_name || '', 
      last_name: user.last_name || '', password: '' 
    });
    setEditando(user.id); setError(''); setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      const pData = { ...form };
      if (editando && !pData.password) delete pData.password; // Django no exige password en PATCH
      
      if (editando) await api.patch(`usuarios/${editando}/`, pData);
      else await api.post('usuarios/', pData);
      
      cerrarModal(); cargar();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Error al guardar.'));
    }
  };

  const eliminar = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este usuario del personal?")) return;
    try {
      await api.delete(`usuarios/${id}/`);
      cargar();
    } catch { alert("No se pudo eliminar el usuario."); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Personal de la Empresa</h1>
        <p className="page-subtitle">Administración de acceso para Empleados y Administradores</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)' }}>{usuarios.length} registros</span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nuevo Empleado</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Contacto</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>@{u.username}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td>
                  <div>{u.telefono || '—'}</div>
                  <div style={{color: 'var(--text-muted)', fontSize: '12px'}}>{u.email}</div>
                </td>
                <td>
                  <span className={`badge ${u.rol === 'ADMIN' ? 'badge-danger' : 'badge-primary'}`}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(u)}>✏️</button>
                    <button className="btn-sm btn-delete" onClick={() => eliminar(u.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">{editando ? '✏️ Editar Empleado' : '+ Nuevo Empleado'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Username de Acceso</label>
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
                <div className="form-group">
                  <label className="form-label">Rol del Sistema</label>
                  <select name="rol" className="form-select" value={form.rol} onChange={handleChange}>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador Total</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña {editando && '(Opcional)'}</label>
                  <input type="password" name="password" className="input-field" style={{marginBottom:0}} value={form.password} onChange={handleChange} required={!editando} />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editando ? 'Guardar Cambios' : 'Crear Empleado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
