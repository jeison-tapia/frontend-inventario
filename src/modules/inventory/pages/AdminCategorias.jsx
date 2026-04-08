import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = { nombre: '', descripcion: '', activa: true };

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const res = await api.get('categorias/');
    setCategorias(res.data.results || res.data);
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (cat) => {
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion || '', activa: cat.activa });
    setEditando(cat.id);
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
        await api.put(`categorias/${editando}/`, form);
      } else {
        await api.post('categorias/', form);
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
      await api.delete(`categorias/${id}/`);
      setConfirmDelete(null);
      cargar();
    } catch {
      alert('No se puede eliminar. Puede tener productos asociados.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏷️ Gestión de Categorías</h1>
        <p className="page-subtitle">Organiza los productos en familias o grupos</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
        </span>
        <button className="btn-primary" onClick={abrirCrear}>+ Nueva Categoría</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat.id}>
                <td style={{ fontWeight: 600 }}>{cat.nombre}</td>
                <td style={{ color: 'var(--text-muted)' }}>{cat.descripcion || '—'}</td>
                <td>
                  <span className={`badge ${cat.activa ? 'badge-success' : 'badge-danger'}`}>
                    {cat.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(cat)}>✏️ Editar</button>
                    <button className="btn-sm btn-delete" onClick={() => setConfirmDelete(cat.id)}>🗑️ Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <h2 className="modal-title">{editando ? '✏️ Editar Categoría' : '+ Nueva Categoría'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input name="nombre" className="input-field" style={{marginBottom:0}} value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion"
                  className="input-field"
                  style={{ marginBottom: 0, resize: 'vertical', minHeight: '80px' }}
                  value={form.descripcion}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group form-checkbox-row">
                <input name="activa" type="checkbox" id="activa" checked={form.activa} onChange={handleChange} style={{width:'16px',height:'16px',cursor:'pointer'}} />
                <label htmlFor="activa" className="form-label" style={{marginBottom:0,cursor:'pointer'}}>Categoría Activa</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editando ? 'Guardar Cambios' : 'Crear Categoría'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 className="modal-title" style={{ justifyContent: 'center' }}>¿Eliminar esta categoría?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Solo se puede eliminar si no tiene productos asociados.
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={() => eliminar(confirmDelete)}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
