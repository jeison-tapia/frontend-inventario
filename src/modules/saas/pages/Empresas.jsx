import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { 
  nombre: '', nit: '', plan: '', activo: true,
  admin_user: { username: '', email: '', password: '', first_name: '', last_name: '' }
};

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');

  useEffect(() => { 
    cargar(); 
    cargarPlanes();
  }, []);

  const cargar = async () => {
    try {
      const res = await api.get('empresas/?page_size=100');
      setEmpresas(res.data.results || res.data);
    } catch(e) { console.error(e); }
  };

  const cargarPlanes = async () => {
    try {
      const res = await api.get('planes/');
      setPlanes(res.data.results || res.data);
    } catch(e) { console.error(e); }
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null); setError(''); setModal(true);
  };

  const abrirEditar = (emp) => {
    setForm({ 
      nombre: emp.nombre, nit: emp.nit || '', 
      plan: emp.plan, activo: emp.activo 
    });
    setEditando(emp.id); setError(''); setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('admin.')) {
      const field = name.split('.')[1];
      setForm({
        ...form,
        admin_user: { ...form.admin_user, [field]: value }
      });
    } else {
      setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editando) await api.patch(`empresas/${editando}/`, form);
      else await api.post('empresas/', form);
      cerrarModal(); cargar();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Error al guardar.'));
    }
  };

  const eliminar = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar esta empresa?")) return;
    try {
      await api.delete(`empresas/${id}/`);
      cargar();
    } catch { alert("No se pudo eliminar la empresa."); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 Gestión de Empresas (SaaS)</h1>
        <p className="page-subtitle">Administra los negocios que utilizan tu plataforma</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)' }}>{empresas.length} empresas registradas</span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nueva Empresa</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre del Negocio</th>
              <th>NIT / Identificación</th>
              <th>Admin Principal</th>
              <th>Plan Contratado</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{e.nit || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>👤 {e.admin_username}</span>
                  </div>
                </td>
                <td>
                  <span className="badge badge-primary" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    💎 {e.plan_nombre}
                  </span>
                </td>
                <td>
                  <span className={`badge ${e.activo ? 'badge-success' : 'badge-danger'}`}>
                    {e.activo ? '✅ ACTIVA' : '❌ INACTIVA'}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(e)}>✏️ Editar</button>
                    <button className="btn-sm btn-delete" onClick={() => eliminar(e.id)}>🗑️ Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '450px' }}>
            <h2 className="modal-title">{editando ? '✏️ Editar Empresa' : '🏢 Nueva Empresa'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Nombre del Negocio</label>
                <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} required placeholder="Ej: Ferretería El Martillo" />
              </div>
              <div className="form-group">
                <label className="form-label">NIT / Identificación Fiscal</label>
                <input name="nit" className="input-field" value={form.nit} onChange={handleChange} placeholder="Ej: 900.123.456-7" />
              </div>
              <div className="form-group">
                <label className="form-label">Plan SaaS</label>
                <select name="plan" className="form-select" value={form.plan} onChange={handleChange} required>
                  <option value="">Seleccione un plan...</option>
                  {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {!editando && (
                <>
                  <h4 style={{ margin: '20px 0 10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>👤 Usuario Administrador Inicial</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Usuario</label>
                      <input name="admin.username" className="input-field" value={form.admin_user.username} onChange={handleChange} required placeholder="ej: admin_ferreteria" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña</label>
                      <input name="admin.password" type="password" className="input-field" value={form.admin_user.password} onChange={handleChange} required placeholder="******" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input name="admin.email" type="email" className="input-field" value={form.admin_user.email} onChange={handleChange} required placeholder="admin@empresa.com" />
                  </div>
                </>
              )}

              <div className="form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                <label className="form-label" style={{ marginBottom: 0 }}>Empresa Activa (Acceso Habilitado)</label>
              </div>
              
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
