import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { razon_social: '', identificacion_fiscal: '', email: '', telefono: '', direccion: '', activo: true };

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const res = await api.get('proveedores/?page_size=100');
    setProveedores(res.data.results || res.data);
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (prov) => {
    setForm({ 
      razon_social: prov.razon_social, 
      identificacion_fiscal: prov.identificacion_fiscal, 
      email: prov.email || '', 
      telefono: prov.telefono || '', 
      direccion: prov.direccion || '',
      activo: prov.activo 
    });
    setEditando(prov.id);
    setError('');
    setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editando) {
        await api.put(`proveedores/${editando}/`, form);
      } else {
        await api.post('proveedores/', form);
      }
      cerrarModal();
      cargar();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Error al guardar.');
    }
  };

  const eliminar = async (id) => {
    try {
      await api.delete(`proveedores/${id}/`);
      setConfirmDelete(null);
      cargar();
    } catch {
      alert('No se puede eliminar. Puede tener compras asociadas.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 Gestión de Proveedores</h1>
        <p className="page-subtitle">Directorio de mayoristas y distribuidores</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''}
        </span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nuevo Proveedor</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Identificación</th>
              <th>Razón Social</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map(prov => (
              <tr key={prov.id}>
                <td style={{ color: 'var(--text-muted)' }}>{prov.identificacion_fiscal}</td>
                <td style={{ fontWeight: 600 }}>{prov.razon_social}</td>
                <td>
                  <div style={{ fontSize: '12px' }}>{prov.telefono || '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{prov.email || '—'}</div>
                </td>
                <td>
                  <span className={`badge ${prov.activo ? 'badge-success' : 'badge-danger'}`}>
                    {prov.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(prov)}>✏️</button>
                    <button className="btn-sm btn-delete" onClick={() => setConfirmDelete(prov.id)}>🗑️</button>
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
            <h2 className="modal-title">{editando ? '✏️ Editar Proveedor' : '+ Nuevo Proveedor'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Identificación Fiscal (RUT/RFC)</label>
                <input name="identificacion_fiscal" className="input-field" style={{marginBottom:0}} value={form.identificacion_fiscal} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Razón Social</label>
                <input name="razon_social" className="input-field" style={{marginBottom:0}} value={form.razon_social} onChange={handleChange} required />
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
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input name="direccion" className="input-field" style={{marginBottom:0}} value={form.direccion} onChange={handleChange} />
              </div>
              <div className="form-group form-checkbox-row">
                <input name="activo" type="checkbox" id="activo" checked={form.activo} onChange={handleChange} style={{width:'16px',height:'16px',cursor:'pointer'}} />
                <label htmlFor="activo" className="form-label" style={{marginBottom:0,cursor:'pointer'}}>Proveedor Activo</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editando ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 className="modal-title" style={{ justifyContent: 'center' }}>¿Eliminar proveedor?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Solo se puede eliminar si no tiene transacciones asociadas.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={() => eliminar(confirmDelete)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
