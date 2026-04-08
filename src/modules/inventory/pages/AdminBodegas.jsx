import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

export default function AdminBodegas() {
  const [bodegas, setBodegas] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [modalBodega, setModalBodega] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [modalStock, setModalStock] = useState(false);
  const [stockEdit, setStockEdit] = useState({ id: null, bodega_nombre: '', producto_nombre: '', cantidad: 0 });

  // Formulario de Bodega
  const [formData, setFormData] = useState({ id: null, nombre: '', ubicacion: '', activa: true });

  // Formulario Transferencia
  const [transfData, setTransfData] = useState({ bodega_origen: '', bodega_destino: '', observaciones: '' });
  const [detallesT, setDetallesT] = useState([]);
  const [prodSelect, setProdSelect] = useState('');
  const [cantSelect, setCantSelect] = useState('');
  const [errorTransf, setErrorTransf] = useState('');
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    cargarBodegas();
    cargarInventario();
    cargarProductos();
    cargarCategorias();
  }, [filtroCategoria]);

  const cargarBodegas = async () => {
    const res = await api.get('bodegas/');
    setBodegas(res.data.results || res.data);
  };

  const cargarInventario = async () => {
    const params = filtroCategoria ? `?categoria=${filtroCategoria}&page_size=1000` : '?page_size=1000';
    const res = await api.get(`inventario-bodegas/${params}`);
    setInventarios(res.data.results || res.data);
  };

  const cargarProductos = async () => {
    const res = await api.get('productos/?page_size=1000');
    setProductos(res.data.results || res.data);
  };

  const cargarCategorias = async () => {
    const res = await api.get('categorias/');
    setCategorias(res.data.results || res.data);
  };

  const editarStock = (inv) => {
    setStockEdit(inv);
    setModalStock(true);
  };

  const guardarStock = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`inventario-bodegas/${stockEdit.id}/`, { cantidad: parseFloat(stockEdit.cantidad) });
      setModalStock(false);
      cargarInventario();
      cargarProductos();
    } catch {
      alert("Error al actualizar el stock");
    }
  };

  // --- CRUD BODEGAS ---
  const guardarBodega = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`bodegas/${formData.id}/`, formData);
      } else {
        await api.post('bodegas/', formData);
      }
      setModalBodega(false);
      cargarBodegas();
    } catch {
      alert("Error al guardar la bodega");
    }
  };

  const editarBodega = (b) => {
    setFormData(b);
    setModalBodega(true);
  };

  const eliminarBodega = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar esta bodega? Se perderá si no tiene stock, si tiene stock, no se podrá borrar.")) return;
    try {
      await api.delete(`bodegas/${id}/`);
      cargarBodegas();
    } catch(err) {
      alert("No se puede eliminar la bodega (posiblemente existan productos en ella o histórico de transacciones). Puedes Inactivarla en vez de borrarla.");
    }
  };

  // --- TRANSFERENCIAS ---
  const agregarDetalleT = () => {
    if(!prodSelect || parseFloat(cantSelect) <= 0) return;
    const prodObj = productos.find(p => p.id.toString() === prodSelect);
    
    // Validar Stock Origen en Frontend si hay origen seleccionado
    if(transfData.bodega_origen) {
      const invBodega = prodObj.inventarios?.find(i => i.bodega === parseInt(transfData.bodega_origen));
      if (!invBodega || parseFloat(invBodega.cantidad) < parseFloat(cantSelect)) {
        alert("Stock insuficiente en la bodega de origen seleccionada para este producto.");
        return;
      }
    }

    setDetallesT(prev => [...prev, { producto: prodObj, cantidad: parseFloat(cantSelect) }]);
    setProdSelect('');
    setCantSelect('');
  };

  const guardarTransferencia = async () => {
    if (!transfData.bodega_origen || !transfData.bodega_destino) return setErrorTransf("Origen y destino obligatorios.");
    if (transfData.bodega_origen === transfData.bodega_destino) return setErrorTransf("Origen y destino no pueden ser iguales.");
    if (detallesT.length === 0) return setErrorTransf("Requiere al menos 1 producto.");

    try {
      // Cabecera
      const cab = await api.post('transacciones/', {
        tipo_documento: 'TRANSFERENCIA',
        bodega: transfData.bodega_origen,
        bodega_destino: transfData.bodega_destino,
        estado: 'BORRADOR',
        observaciones: transfData.observaciones
      });

      // Detalles
      for (const d of detallesT) {
        await api.post('detalles/', {
          transaccion: cab.data.id,
          producto: d.producto.id,
          cantidad: d.cantidad
        });
      }

      // Emitir (Descuenta y suma en BD)
      await api.patch(`transacciones/${cab.data.id}/`, { estado: 'EMITIDA' });

      setModalTransferencia(false);
      cargarInventario();
      cargarProductos();
      alert("Transferencia completada con éxito");
    } catch (e) {
      setErrorTransf("Error realizando transferencia: " + JSON.stringify(e.response?.data || e.message));
    }
  };

  // --- RENDER ---
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 Recintos Físicos y Transferencias</h1>
        <p className="page-subtitle">Gestiona sucursales y mueve mercancía entre ellas.</p>
      </div>

      <div className="admin-toolbar">
        <div>
          <button className="btn-primary" onClick={() => { setFormData({ id: null, nombre: '', ubicacion: '', activa: true }); setModalBodega(true); }} style={{marginRight: '12px'}}>
            + Nueva Bodega
          </button>
          <button className="btn-secondary" onClick={() => { 
            setTransfData({bodega_origen: '', bodega_destino: '', observaciones: ''}); 
            setDetallesT([]); setErrorTransf(''); setModalTransferencia(true); 
          }}>
            🚚 Efectuar Transferencia
          </button>
        </div>
      </div>

      {/* LISTA BODEGAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 2fr', gap: '24px' }}>
        <div className="admin-table-wrap">
          <h3 style={{padding: '16px', margin: 0, borderBottom: '1px solid var(--border)'}}>Locaciones Registradas</h3>
          <table className="admin-table">
            <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {bodegas.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{fontWeight:'bold'}}>{b.nombre}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{b.ubicacion || 'Sin ubicación'}</div>
                  </td>
                  <td>
                    <span className={`badge ${b.activa ? 'badge-success' : 'badge-danger'}`}>
                      {b.activa ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-sm btn-secondary" onClick={() => editarBodega(b)}>✏️</button>
                    <button className="btn-sm btn-delete" onClick={() => eliminarBodega(b.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-table-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>Inventario Desglosado</h3>
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
          <table className="admin-table">
            <thead><tr><th>Bodega</th><th>Producto</th><th>Cantidad</th><th>Acciones</th></tr></thead>
            <tbody>
              {inventarios.filter(i => parseFloat(i.cantidad) > 0).slice(0, 100).map(i => (
                <tr key={i.id}>
                  <td style={{fontWeight: 600, color: 'var(--primary)'}}>{i.bodega_nombre}</td>
                  <td>{i.producto_nombre}</td>
                  <td style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{Number(parseFloat(i.cantidad).toFixed(3))}</td>
                  <td>
                    <button className="btn-sm btn-secondary" onClick={() => editarStock(i)}>✏️</button>
                  </td>
                </tr>
              ))}
              {inventarios.length === 0 && (
                <tr><td colSpan="4" style={{textAlign:'center', padding: '16px'}}>No hay productos almacenados aún.</td></tr>
              )}
            </tbody>
          </table>
          <div style={{padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center'}}>
            Mostrando stock positivo actual distribuido. (Máximo 100 registros)
          </div>
        </div>
      </div>

      {/* MODAL EDITAR STOCK */}
      {modalStock && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ borderTop: '4px solid var(--primary)' }}>
            <h2 className="modal-title">📦 Ajustar Stock en Bodega</h2>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.05)', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Producto:</div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stockEdit.producto_nombre}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>SKU: {stockEdit.producto_sku || 'N/A'}</div>
              
              <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ubicación:</div>
              <div style={{ fontWeight: 600 }}>{stockEdit.bodega_nombre}</div>
            </div>

            <form onSubmit={guardarStock}>
              <div className="form-group">
                <label className="form-label">Unidades Disponibles (Cantidad)</label>
                <input 
                  type="number" 
                  step="0.001"
                  required 
                  className="input-field" 
                  autoFocus
                  value={stockEdit.cantidad} 
                  onChange={e => setStockEdit({...stockEdit, cantidad: e.target.value})} 
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  * Este cambio se reflejará inmediatamente en el stock global del producto.
                </p>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalStock(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Actualizar Inventario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR BODEGA */}
      {modalBodega && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h2 className="modal-title">{formData.id ? 'Editar' : 'Nueva'} Bodega</h2>
            <form onSubmit={guardarBodega}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input required className="input-field" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación Fila/Dirección</label>
                <input className="input-field" value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} />
              </div>
              <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                <input type="checkbox" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} />
                <label style={{margin: 0}}>Almacén Operativo</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalBodega(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERENCIA */}
      {modalTransferencia && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{maxWidth: '700px'}}>
            <h2 className="modal-title">🚚 Transferencia Interna (Inter-Bodega)</h2>
            {errorTransf && <div className="alert-box alert-warning">{errorTransf}</div>}
            
            <div className="form-row" style={{marginBottom: '24px'}}>
              <div className="form-group">
                <label className="form-label">Recinto ORIGEN (Saca mercancía)</label>
                <select className="form-select" value={transfData.bodega_origen} onChange={e => setTransfData({...transfData, bodega_origen: e.target.value})}>
                  <option value="">- Selecciona de dónde sale -</option>
                  {bodegas.filter(b=>b.activa).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Recinto DESTINO (Ingresa mercancía)</label>
                <select className="form-select" value={transfData.bodega_destino} onChange={e => setTransfData({...transfData, bodega_destino: e.target.value})}>
                  <option value="">- Selecciona dónde entra -</option>
                  {bodegas.filter(b=>b.activa).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border)' }}>
              <label className="form-label">Añadir Ítems a Transferir</label>
              <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr auto', gap: '8px' }}>
                <select className="form-select" value={prodSelect} onChange={e => setProdSelect(e.target.value)}>
                  <option value="">-- Producto --</option>
                  {productos.map(p => {
                    // Validar si hay stock en Origen
                    const qDisp = transfData.bodega_origen 
                      ? parseFloat(p.inventarios?.find(i => i.bodega === parseInt(transfData.bodega_origen))?.cantidad || 0) 
                      : parseFloat(p.stock_actual);
                      
                    return (
                      <option key={p.id} value={p.id} disabled={!transfData.bodega_origen || qDisp <= 0}>
                        {qDisp <= 0 ? '❌ ' : ''}[{p.codigo_sku}] {p.nombre} (Disp: {qDisp})
                      </option>
                    )
                  })}
                </select>
                <input type="number" className="input-field" placeholder="Unidades" value={cantSelect} onChange={e => setCantSelect(e.target.value)} />
                <button type="button" className="btn-primary" onClick={agregarDetalleT}>Añadir</button>
              </div>
            </div>

            {detallesT.length > 0 && (
              <div className="admin-table-wrap" style={{marginBottom: '24px'}}>
                <table className="admin-table">
                  <thead><tr><th>Producto</th><th>Cantidad a mover</th><th></th></tr></thead>
                  <tbody>
                    {detallesT.map((d, i) => (
                      <tr key={i}>
                        <td>{d.producto.nombre}</td>
                        <td style={{fontWeight: 'bold'}}>🔄 {d.cantidad}</td>
                        <td><button className="btn-sm btn-delete" onClick={()=>setDetallesT(prev => prev.filter((_, idx)=>idx!==i))}>Quitar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-group">
              <input className="input-field" placeholder="Ej: Reabastecimiento de sede por agotamiento" value={transfData.observaciones} onChange={e => setTransfData({...transfData, observaciones: e.target.value})} />
            </div>

            <div className="modal-actions" style={{marginTop: '24px'}}>
              <button className="btn-secondary" onClick={() => setModalTransferencia(false)}>Cancelar</button>
              <button className="btn-primary" style={{background: '#3b82f6'}} onClick={guardarTransferencia}>Aplicar Transferencia 🚀</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
