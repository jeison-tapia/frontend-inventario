import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { 
  nombre: '', descripcion: '', 
  modulo_inventario: true, modulo_ventas: true, 
  modulo_compras: false, modulo_caja: true, 
  modulo_reportes: false, modulo_auditoria: false,
  modulo_clientes: true, modulo_catalogo: true,
  modulo_etiquetas: true, modulo_usuarios: true,
  max_usuarios: 5, max_productos: 100
};

export default function Planes() {
  const [planes, setPlanes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('planes/');
      setPlanes(res.data.results || res.data);
    } catch(e) { console.error(e); }
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null); setError(''); setModal(true);
  };

  const abrirEditar = (p) => {
    setForm({ ...p });
    setEditando(p.id); setError(''); setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const guardar = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (editando) await api.patch(`planes/${editando}/`, form);
      else await api.post('planes/', form);
      cerrarModal(); cargar();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || 'Error al guardar.'));
    }
  };

  const eliminar = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este plan?")) return;
    try {
      await api.delete(`planes/${id}/`);
      cargar();
    } catch { alert("No se pudo eliminar el plan."); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">💎 Planes SaaS</h1>
        <p className="page-subtitle">Configura qué módulos y límites tiene cada suscripción</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)' }}>{planes.length} planes configurados</span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nuevo Plan</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre del Plan</th>
              <th>Módulos Incluidos</th>
              <th>Límites de Capacidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {planes.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{p.descripcion}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {p.modulo_inventario && <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>📦 Inventario</span>}
                    {p.modulo_ventas && <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>🛒 Ventas</span>}
                    {p.modulo_compras && <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>📥 Compras</span>}
                    {p.modulo_caja && <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>💰 Caja</span>}
                    {p.modulo_clientes && <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>🤝 Clientes</span>}
                    {p.modulo_catalogo && <span className="badge" style={{ background: '#fff7ed', color: '#c2410c' }}>🛍️ Catálogo</span>}
                    {p.modulo_etiquetas && <span className="badge" style={{ background: '#fdf2f8', color: '#be185d' }}>🏷️ Etiquetas</span>}
                    {p.modulo_usuarios && <span className="badge" style={{ background: '#f0f9ff', color: '#0369a1' }}>👥 Personal</span>}
                    {p.modulo_reportes && <span className="badge" style={{ background: '#ffedd5', color: '#9a3412' }}>📊 Reportes</span>}
                    {p.modulo_auditoria && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>🛡️ Auditoría</span>}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '13px' }}>👥 Máx Usuarios: <strong>{p.max_usuarios}</strong></div>
                  <div style={{ fontSize: '13px' }}>📦 Máx Productos: <strong>{p.max_productos}</strong></div>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(p)}>✏️ Editar</button>
                    <button className="btn-sm btn-delete" onClick={() => eliminar(p.id)}>🗑️ Borrar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">{editando ? '✏️ Editar Plan SaaS' : '💎 Nuevo Plan SaaS'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Plan</label>
                  <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} required placeholder="Ej: Plan Pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input name="descripcion" className="input-field" value={form.descripcion} onChange={handleChange} placeholder="Ej: Ideal para medianas empresas" />
                </div>
              </div>

              <h4 style={{ margin: '20px 0 12px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Módulos Habilitados</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_inventario" checked={form.modulo_inventario} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Inventario</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_ventas" checked={form.modulo_ventas} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Ventas</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_compras" checked={form.modulo_compras} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Compras</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_caja" checked={form.modulo_caja} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Caja</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_clientes" checked={form.modulo_clientes} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Clientes</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_catalogo" checked={form.modulo_catalogo} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Catálogo</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_etiquetas" checked={form.modulo_etiquetas} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Etiquetas</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_usuarios" checked={form.modulo_usuarios} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Personal</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_reportes" checked={form.modulo_reportes} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Reportes</span>
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input type="checkbox" name="modulo_auditoria" checked={form.modulo_auditoria} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>Auditoría</span>
                </label>
              </div>

              <h4 style={{ margin: '20px 0 12px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Límites del Sistema</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Máx Usuarios</label>
                  <input type="number" name="max_usuarios" className="input-field" value={form.max_usuarios} onChange={handleChange} min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Máx Productos</label>
                  <input type="number" name="max_productos" className="input-field" value={form.max_productos} onChange={handleChange} min="1" />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '25px' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Configuración</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
