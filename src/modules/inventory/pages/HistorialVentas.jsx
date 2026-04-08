import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';
import { useNavigate } from 'react-router-dom';

export default function HistorialVentas() {
  const navigate = useNavigate();
  const [transacciones, setTransacciones] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('VENTA');
  
  // Modal devolución
  const [modalDev, setModalDev] = useState(null); // transaccion seleccionada
  const [itemsDev, setItemsDev] = useState([]);   // [{producto_id, cantidad, nombre, max}]
  const [procesando, setProcesando] = useState(false);
  
  useEffect(() => { cargar(); }, [filtroTipo]);

  const cargar = async () => {
    try {
      const res = await api.get(`transacciones/?page_size=200`);
      const todas = res.data.results || res.data;
      setTransacciones(todas.filter(t => filtroTipo === 'TODOS' ? true : t.tipo_documento === filtroTipo));
    } catch (e) { console.error(e); }
  };

  const anular = async (id) => {
    if (!window.confirm("¿Seguro de ANULAR? La mercancía volverá al inventario.")) return;
    try {
      await api.patch(`transacciones/${id}/`, { estado: 'ANULADA' });
      cargar();
    } catch (err) { alert("Error al anular: " + JSON.stringify(err.response?.data || err.message)); }
  };

  const convertirCotizacion = async (id) => {
    if (!window.confirm("¿Convertir esta cotización a una Venta? Se creará un borrador listo para emitir.")) return;
    try {
      const res = await api.post(`transacciones/${id}/convertir_a_venta/`);
      alert(`✅ Creada venta borrador ${res.data.numero_documento}. Dirígete al Historial para emitirla.`);
      cargar();
    } catch (err) { alert("Error: " + JSON.stringify(err.response?.data || err.message)); }
  };

  const enviarCorreo = async (id) => {
    try {
      const res = await api.post(`transacciones/${id}/enviar_correo/`);
      alert(`✅ ${res.data.mensaje}`);
    } catch (err) { alert("Error: " + JSON.stringify(err.response?.data || err.message)); }
  };

  const abrirModalDevolucion = (venta) => {
    const items = (venta.detalles || []).map(d => ({
      producto_id: d.producto,
      nombre: d.producto_nombre || `Producto #${d.producto}`,
      max: parseFloat(d.cantidad),
      cantidad: parseFloat(d.cantidad),
    }));
    setItemsDev(items);
    setModalDev(venta);
  };

  const procesarDevolucion = async () => {
    const itemsValidos = itemsDev.filter(i => i.cantidad > 0 && i.cantidad <= i.max);
    if (itemsValidos.length === 0) return alert("Selecciona al menos un ítem a devolver.");
    setProcesando(true);
    try {
      const res = await api.post(`transacciones/${modalDev.id}/devolucion_parcial/`, {
        items: itemsValidos.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
      });
      // Emitir la devolución inmediatamente
      await api.patch(`transacciones/${res.data.id}/`, { estado: 'EMITIDA' });
      alert(`✅ Devolución ${res.data.numero_documento} procesada. El stock fue restituido.`);
      setModalDev(null);
      cargar();
    } catch (err) { alert("Error en devolución: " + JSON.stringify(err.response?.data || err.message)); }
    finally { setProcesando(false); }
  };

  const emitirBorrador = async (id) => {
    if (!window.confirm("¿Emitir esta venta en borrador? Se descontará el stock definitivamente.")) return;
    try {
      await api.patch(`transacciones/${id}/`, { estado: 'EMITIDA' });
      cargar();
    } catch (err) { alert("Error: " + JSON.stringify(err.response?.data || err.message)); }
  };

  const badgeEstado = (e) => {
    const cls = e === 'EMITIDA' ? 'badge-success' : e === 'ANULADA' ? 'badge-danger' : 'badge-warning';
    return <span className={`badge ${cls}`}>{e}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧾 Transacciones</h1>
        <p className="page-subtitle">Ventas, cotizaciones, compras y devoluciones registradas</p>
      </div>

      <div className="admin-toolbar">
        <div style={{ display: 'flex', gap: '8px' }}>
          {['TODOS', 'VENTA', 'COTIZACION', 'COMPRA', 'DEVOLUCION'].map(tipo => (
            <button key={tipo} onClick={() => setFiltroTipo(tipo)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                border: 'none', fontWeight: 600,
                background: filtroTipo === tipo ? 'var(--primary)' : 'var(--card-bg)',
                color: filtroTipo === tipo ? 'white' : 'var(--text-muted)',
                border: `1px solid ${filtroTipo === tipo ? 'var(--primary)' : 'var(--border-color)'}`,
              }}>
              {tipo}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => navigate('/ventas/nueva')} style={{ background: '#10b981' }}>
          + Nueva Venta
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Actor</th>
              <th>Ítems</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transacciones.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {v.numero_documento || `#${v.id}`}
                </td>
                <td>
                  <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '20px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)' }}>
                    {v.tipo_documento}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {new Date(v.fecha_creacion).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {v.cliente_nombre || v.proveedor_nombre || '—'}
                </td>
                <td>{v.detalles?.length || 0}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${parseFloat(v.total_final).toFixed(2)}</td>
                <td>{badgeEstado(v.estado)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Emitir borrador */}
                    {v.estado === 'BORRADOR' && (
                      <button className="btn-sm" style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => emitirBorrador(v.id)}>
                        ▶ Emitir
                      </button>
                    )}
                    {/* Convertir cotización */}
                    {v.tipo_documento === 'COTIZACION' && v.estado !== 'ANULADA' && (
                      <button className="btn-sm" style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => convertirCotizacion(v.id)}>
                        → Venta
                      </button>
                    )}
                    {/* Devolución parcial */}
                    {v.tipo_documento === 'VENTA' && v.estado === 'EMITIDA' && (
                      <button className="btn-sm" style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => abrirModalDevolucion(v)}>
                        ↩ Devolver
                      </button>
                    )}
                    {/* Anular */}
                    {v.estado === 'EMITIDA' && (
                      <button className="btn-sm btn-delete" onClick={() => anular(v.id)} style={{ fontSize: '12px' }}>
                        ✖ Anular
                      </button>
                    )}
                    {/* Ver Factura */}
                    {(v.tipo_documento === 'VENTA' || v.tipo_documento === 'COTIZACION') && (
                      <button className="btn-sm" style={{ background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => window.open(`/ventas/${v.id}/factura`, '_blank')}>
                        🖨️ Factura
                      </button>
                    )}
                    {/* Enviar Correo */}
                    {(v.tipo_documento === 'VENTA' || v.tipo_documento === 'COTIZACION') && v.estado === 'EMITIDA' && (
                      <button className="btn-sm" style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => enviarCorreo(v.id)}>
                        📧 Enviar PDF
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transacciones.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No hay transacciones de tipo {filtroTipo}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DEVOLUCIÓN */}
      {modalDev && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>↩ Devolución Parcial — {modalDev.numero_documento}</h2>
              <button onClick={() => setModalDev(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>
              Ajusta la cantidad a devolver por producto. Ponlo en 0 para no devolver ese ítem.
            </p>
            <table className="admin-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant. Original</th>
                  <th>Cant. a Devolver</th>
                </tr>
              </thead>
              <tbody>
                {itemsDev.map((item, i) => (
                  <tr key={i}>
                    <td>{item.nombre}</td>
                    <td>{item.max}</td>
                    <td>
                      <input type="number" min="0" max={item.max} step="0.001" value={item.cantidad}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          setItemsDev(prev => prev.map((x, xi) => xi === i ? { ...x, cantidad: Math.min(v, x.max) } : x));
                        }}
                        style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalDev(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-main)' }}>
                Cancelar
              </button>
              <button onClick={procesarDevolucion} disabled={procesando}
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {procesando ? 'Procesando...' : '↩ Confirmar Devolución'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
