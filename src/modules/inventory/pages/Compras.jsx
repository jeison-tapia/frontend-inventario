import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [modal, setModal] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [bodegas, setBodegas] = useState([]); // [Hito 7]

  // Estado del formulario de nueva compra
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(''); // [Hito 7]
  const [detalles, setDetalles] = useState([]);
  const [prodSelect, setProdSelect] = useState('');
  const [cantSelect, setCantSelect] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('transacciones/?search=COMPRA&page_size=50');
      // Filtramos estrictamente del lado del cliente por si la búsqueda arrojó ventas que coinciden en texto
      const filtradas = (res.data.results || res.data).filter(t => t.tipo_documento === 'COMPRA');
      setCompras(filtradas);
    } catch (e) {
      console.error(e);
    }
  };

  const abrirModal = async () => {
    try {
      const [resProv, resProd, resBod] = await Promise.all([
        api.get('proveedores/?page_size=100'),
        api.get('productos/?page_size=500'),
        api.get('bodegas/')
      ]);
      setProveedores((resProv.data.results || resProv.data).filter(p => p.activo));
      setProductos(resProd.data.results || resProd.data);
      const bods = resBod.data.results || resBod.data;
      setBodegas(bods);

      setProveedorSeleccionado('');
      setBodegaSeleccionada(bods.length > 0 ? bods[0].id : '');
      setDetalles([]);
      setProdSelect('');
      setCantSelect('');
      setError('');
      setModal(true);
    } catch {
      alert("Error cargando catálogos de proveedores o productos.");
    }
  };

  const agregarDetalle = () => {
    if (!prodSelect || !cantSelect || parseFloat(cantSelect) <= 0) return;
    const prodObj = productos.find(p => p.id.toString() === prodSelect);
    if (!prodObj) return;
    
    setDetalles(prev => [...prev, { producto: prodObj, cantidad: parseFloat(cantSelect) }]);
    setProdSelect('');
    setCantSelect('');
  };

  const quitarDetalle = (index) => {
    setDetalles(prev => prev.filter((_, i) => i !== index));
  };

  const guardarCompra = async () => {
    if (!proveedorSeleccionado) return setError("Seleccione un proveedor válido.");
    if (!bodegaSeleccionada) return setError("Seleccione la Bodega destino.");
    if (detalles.length === 0) return setError("Agregue al menos un producto a la compra.");
    setError('');

    try {
      // 1. Crear Transacción (Estado BORRADOR no afecta inventario aún)
      const resT = await api.post('transacciones/', {
        tipo_documento: 'COMPRA',
        proveedor: proveedorSeleccionado,
        bodega: bodegaSeleccionada,
        estado: 'BORRADOR'
      });
      const tId = resT.data.id;

      // 2. Insertar Detalles de la Compra
      for (const d of detalles) {
        await api.post('detalles/', {
          transaccion: tId,
          producto: d.producto.id,
          cantidad: d.cantidad
        });
      }

      // 3. Emitir Transacción (Django ejecutará el .save() que SUMA el inventario)
      await api.patch(`transacciones/${tId}/`, { estado: 'EMITIDA' });

      setModal(false);
      cargar();
    } catch (err) {
      setError("Error procesando compra: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const anular = async (id) => {
    if (!window.confirm("¿SEGURO que deseas ANULAR esta compra?\n\nAl anularla, el stock ingresado se RESTARÁ nuevamente de los productos para corregir el inventario.")) return;
    try {
      await api.patch(`transacciones/${id}/`, { estado: 'ANULADA' });
      cargar();
    } catch (err) {
      alert("Error al anular: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📥 Entrada de Inventario (Compras)</h1>
        <p className="page-subtitle">Ingresa nueva mercancía al sistema asociándola a proveedores.</p>
      </div>

      <div className="admin-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Historial: {compras.length} registro{compras.length !== 1 ? 's' : ''}
        </span>
        <button className="btn-primary" onClick={abrirModal}>📦 Registrar Nueva Compra</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Artículos</th>
              <th>Total Costo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {compras.map(comp => (
              <tr key={comp.id}>
                <td style={{ fontWeight: 600 }}>#{comp.id}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(comp.fecha_creacion).toLocaleDateString()}</td>
                <td style={{ fontWeight: 500 }}>{comp.proveedor_nombre || '—'}</td>
                <td>{comp.detalles?.length || 0} ítems</td>
                <td style={{ color: 'var(--accent)' }}>${comp.total_final}</td>
                <td>
                  <span className={`badge ${
                    comp.estado === 'EMITIDA' ? 'badge-success' : 
                    comp.estado === 'ANULADA' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {comp.estado}
                  </span>
                </td>
                <td>
                  {comp.estado === 'EMITIDA' && (
                    <button className="btn-sm btn-delete" onClick={() => anular(comp.id)}>⛔ Anular</button>
                  )}
                </td>
              </tr>
            ))}
            {compras.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No se han registrado compras aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '700px' }}>
            <h2 className="modal-title">📦 Ingresar Compra a Inventario</h2>
            {error && <div className="alert-box alert-warning">{error}</div>}
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">📋 Proveedor</label>
              <select className="form-select" value={proveedorSeleccionado} onChange={e => setProveedorSeleccionado(e.target.value)}>
                <option value="">-- Selecciona un proveedor --</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.razon_social} ({p.identificacion_fiscal})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">🏢 Bodega Destino</label>
              <select className="form-select" value={bodegaSeleccionada} onChange={e => setBodegaSeleccionada(e.target.value)}>
                <option value="">-- Selecciona donde ingresará la mercancía --</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id} disabled={!b.activa}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border)' }}>
              <label className="form-label" style={{ marginBottom: '12px' }}>🛒 Añadir Productos al Lote</label>
              <div className="form-row" style={{ gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                <div>
                  <select className="form-select" value={prodSelect} onChange={e => setProdSelect(e.target.value)}>
                    <option value="">-- Selecciona producto --</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>[{p.codigo_sku}] {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input type="number" className="input-field" style={{marginBottom:0}} placeholder="Cantidad" value={cantSelect} onChange={e => setCantSelect(e.target.value)} />
                </div>
                <div>
                  <button type="button" className="btn-primary" onClick={agregarDetalle}>Añadir</button>
                </div>
              </div>
            </div>

            {detalles.length > 0 && (
              <div className="admin-table-wrap" style={{ marginBottom: '24px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Costo Un. (Ref)</th>
                      <th>Cantidad Entrante</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.producto.nombre}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{d.producto.codigo_sku}</td>
                        <td>${d.producto.precio_costo}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>+{d.cantidad}</td>
                        <td>
                          <button type="button" className="btn-sm btn-delete" onClick={() => quitarDetalle(i)}>Quitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '32px' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" style={{ background: '#10b981' }} onClick={guardarCompra}>
                ✅ Confirmar y Sumar al Inventario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
