import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

const FORM_INICIAL = {
  nombre: '', codigo_sku: '', categoria: '',
  precio_costo: '', precio_venta: '',
  stock_actual: '', stock_minimo: '0',
  unidad_medida: 'Unidad', permite_fracciones: false,
  fecha_vencimiento: '', // [Hito 6] Opcional
  precio_venta_distribuidor: '', // [Hito 6] Precio VIP/Distribuidor
};

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, id = editar
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // id a eliminar
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => { cargar(); }, [filtroCategoria]);

  const cargar = async () => {
    const params = filtroCategoria ? `?categoria=${filtroCategoria}&page_size=100` : '?page_size=100';
    const [pRes, cRes] = await Promise.all([
      api.get(`productos/${params}`),
      api.get('categorias/'),
    ]);
    setProductos(pRes.data.results || pRes.data);
    setCategorias(cRes.data.results || cRes.data);
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (prod) => {
    setForm({
      nombre: prod.nombre,
      codigo_sku: prod.codigo_sku,
      categoria: prod.categoria,
      precio_costo: prod.precio_costo,
      precio_venta: prod.precio_venta,
      stock_actual: Number(prod.stock_actual),
      stock_minimo: Number(prod.stock_minimo),
      unidad_medida: prod.unidad_medida,
      permite_fracciones: prod.permite_fracciones,
      fecha_vencimiento: prod.fecha_vencimiento || '',
      precio_venta_distribuidor: prod.precio_venta_distribuidor || '',
    });
    setEditando(prod.id);
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
      // Limpiar campos opcionales: string vacío → null para que Django lo acepte
      const payload = {
        ...form,
        fecha_vencimiento: form.fecha_vencimiento?.trim() || null,
        precio_venta_distribuidor: form.precio_venta_distribuidor?.toString().trim() || null,
      };
      if (editando) {
        await api.put(`productos/${editando}/`, payload);
      } else {
        await api.post('productos/', payload);
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
      await api.delete(`productos/${id}/`);
      setConfirmDelete(null);
      cargar();
    } catch {
      alert('No se pudo eliminar el producto.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Gestión de Productos</h1>
        <p className="page-subtitle">Crear, editar y eliminar productos del catálogo</p>
      </div>

      <div className="admin-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
            {productos.length} producto{productos.length !== 1 ? 's' : ''}
          </span>
          <select 
            className="form-select" 
            style={{ maxWidth: '200px', margin: 0 }}
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>+ Nuevo Producto</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Precio Venta</th>
              <th>Stock</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.codigo_sku}</td>
                <td>{p.categoria_nombre}</td>
                <td style={{ color: 'var(--primary)', fontWeight: 700 }}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td>
                  <span className={parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo) ? 'stock-low' : 'stock-ok'}>
                    {Number(p.stock_actual)} {p.unidad_medida}
                  </span>
                </td>
                <td>
                  {p.fecha_vencimiento ? (
                    <span style={{
                      padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                      background: p.estado_vencimiento === 'VENCIDO' ? 'rgba(239,68,68,0.15)' :
                                  p.estado_vencimiento === 'POR_VENCER' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                      color: p.estado_vencimiento === 'VENCIDO' ? '#ef4444' :
                             p.estado_vencimiento === 'POR_VENCER' ? '#f59e0b' : '#10b981',
                    }}>
                      {p.estado_vencimiento === 'VENCIDO' ? '❌ Vencido' :
                       p.estado_vencimiento === 'POR_VENCER' ? `⚠️ ${p.dias_para_vencer}d` : '✅ Vigente'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>
                  )}
                </td>
                <td>
                  <div className="actions-cell">
                    <button className="btn-sm btn-edit" onClick={() => abrirEditar(p)}>✏️ Editar</button>
                    <button className="btn-sm btn-delete" onClick={() => setConfirmDelete(p.id)}>🗑️ Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box">
            <h2 className="modal-title">{editando ? '✏️ Editar Producto' : '+ Nuevo Producto'}</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input name="nombre" className="input-field" style={{marginBottom:0}} value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Código SKU</label>
                  <input name="codigo_sku" className="input-field" style={{marginBottom:0}} value={form.codigo_sku} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select name="categoria" className="form-select" value={form.categoria} onChange={handleChange} required>
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Precio Costo</label>
                  <input name="precio_costo" type="number" step="0.01" className="input-field" style={{marginBottom:0}} value={form.precio_costo} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Venta</label>
                  <input name="precio_venta" type="number" step="0.01" className="input-field" style={{marginBottom:0}} value={form.precio_venta} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Precio Distribuidor/VIP <span style={{color:'var(--text-muted)',fontWeight:400}}>(opcional)</span></label>
                  <input name="precio_venta_distribuidor" type="number" step="0.01" className="input-field" style={{marginBottom:0}} value={form.precio_venta_distribuidor} onChange={handleChange} placeholder="Dejar vacío si no aplica" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Vencimiento <span style={{color:'var(--text-muted)',fontWeight:400}}>(opcional)</span></label>
                  <input name="fecha_vencimiento" type="date" className="input-field" style={{marginBottom:0}} value={form.fecha_vencimiento} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Stock Actual</label>
                  <input name="stock_actual" type="number" step="0.001" className="input-field" style={{marginBottom:0}} value={form.stock_actual} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Mínimo</label>
                  <input name="stock_minimo" type="number" step="0.001" className="input-field" style={{marginBottom:0}} value={form.stock_minimo} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unidad de Medida</label>
                  <input name="unidad_medida" className="input-field" style={{marginBottom:0}} value={form.unidad_medida} onChange={handleChange} />
                </div>
                <div className="form-group form-checkbox-row">
                  <input name="permite_fracciones" type="checkbox" id="fracciones" checked={form.permite_fracciones} onChange={handleChange} style={{width:'16px',height:'16px',cursor:'pointer'}} />
                  <label htmlFor="fracciones" className="form-label" style={{marginBottom:0,cursor:'pointer'}}>Permite Fracciones</label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary">{editando ? 'Guardar Cambios' : 'Crear Producto'}</button>
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
            <h2 className="modal-title" style={{ justifyContent: 'center' }}>¿Eliminar este producto?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Esta acción no se puede deshacer.
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
