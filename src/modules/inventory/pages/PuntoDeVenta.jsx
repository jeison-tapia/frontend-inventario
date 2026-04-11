import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../shared/api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const METODOS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'];

export default function PuntoDeVenta() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [bodegas, setBodegas] = useState([]); // [Hito 7]
  
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(''); // [Hito 7]
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [detalles, setDetalles] = useState([]);
  const [prodSelect, setProdSelect] = useState('');
  const [cantSelect, setCantSelect] = useState('');
  const [descuentoGlobal, setDescuentoGlobal] = useState(''); // % descuento global
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  // [Hito 7B] Scanner de código de barras
  const [scannerActivo, setScannerActivo] = useState(true);
  const [skuScaneado, setSkuScaneado] = useState('');
  const scannerInputRef = useRef(null);
  // Dropdown custom de productos
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [busquedaProd, setBusquedaProd] = useState('');
  const dropdownRef = useRef(null);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    const fn = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownAbierto(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Mantener focus en el input invisible del scanner
  // SOLO si el usuario NO está interactuando con un input/select/textarea
  const refocusScanner = useCallback((e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const interactivo = ['input', 'select', 'textarea', 'button'].includes(tag);
    if (scannerActivo && !interactivo && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [scannerActivo]);

  useEffect(() => { refocusScanner(); }, [scannerActivo]);

  // Cuando el scanner envía un SKU (termina con Enter)
  const onScannerKeyDown = (e) => {
    if (e.key === 'Enter') {
      const sku = skuScaneado.trim();
      setSkuScaneado('');
      if (!sku) return;
      const prod = productos.find(p => p.codigo_sku === sku);
      if (!prod) { alert(`❌ Producto con SKU "${sku}" no encontrado.`); return; }
      // Agregar al carrito (+1 si ya existe)
      setDetalles(prev => {
        const idx = prev.findIndex(d => d.producto.id === prod.id);
        if (idx >= 0) {
          return prev.map((d, i) => i === idx ? { ...d, cantidad: d.cantidad + 1 } : d);
        }
        return [...prev, { producto: prod, cantidad: 1, descuento: '' }];
      });
    }
  };

  useEffect(() => { cargarCatalogos(); }, []);

  const cargarCatalogos = async () => {
    try {
      const [resCli, resProd, resBods] = await Promise.all([
        api.get('usuarios/?page_size=500'),
        api.get('productos/?page_size=1000'),
        api.get('bodegas/')
      ]);
      setClientes((resCli.data.results || resCli.data).filter(u => u.rol === 'CLIENTE_FINAL'));
      setProductos(resProd.data.results || resProd.data);
      
      const bds = resBods.data.results || resBods.data;
      setBodegas(bds);
      // Auto-seleccionar la principal si existe
      if (bds.length > 0) setBodegaSeleccionada(bds[0].id);
    } catch { setError("Error cargando catálogos"); }
  };

  const agregarDetalle = () => {
    if (!prodSelect || !cantSelect || parseFloat(cantSelect) <= 0) return;
    if (!bodegaSeleccionada) {
      alert("Seleccione una bodega de origen primero.");
      return;
    }
    const invBodega = prodObj.inventarios?.find(i => i.bodega === parseInt(bodegaSeleccionada)) || {cantidad: 0};
    const cantidadRequerida = parseFloat(cantSelect);
    if (cantidadRequerida > parseFloat(invBodega.cantidad)) {
      alert(`⚠️ Stock insuficiente. Solo quedan ${Number(invBodega.cantidad)} disponibles en esta bodega para "${prodObj.nombre}".`);
      return;
    }

    setDetalles(prev => [...prev, { 
      producto: prodObj, 
      cantidad: cantidadRequerida,
      descuento: '', // descuento individual por ítem (string para evitar problemas de tipeo)
    }]);
    setProdSelect(''); setCantSelect('');
  };

  const actualizarDescuentoItem = (index, valor) => {
    setDetalles(prev => prev.map((d, i) => i === index ? { ...d, descuento: valor } : d));
  };

  const quitarDetalle = (index) => setDetalles(prev => prev.filter((_, i) => i !== index));

  // Cálculos con descuentos
  const parseNum = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calcularSubtotalItem = (d) => {
    const base = d.cantidad * parseFloat(d.producto.precio_venta);
    return base * (1 - parseNum(d.descuento) / 100);
  };
  const subtotalBruto = detalles.reduce((acc, d) => acc + d.cantidad * parseFloat(d.producto.precio_venta), 0);
  const descuentoItemsTotal = detalles.reduce((acc, d) => {
    const base = d.cantidad * parseFloat(d.producto.precio_venta);
    return acc + base * (parseNum(d.descuento) / 100);
  }, 0);
  const subtotalConDescItems = subtotalBruto - descuentoItemsTotal;
  const descuentoGlobalValor = subtotalConDescItems * (parseNum(descuentoGlobal) / 100);
  const totalFinal = subtotalConDescItems - descuentoGlobalValor;

  const facturar = async (esCotizacion = false) => {
    if (!clienteSeleccionado) return setError("Por favor, identifique al cliente en la factura.");
    if (detalles.length === 0) return setError("El carrito está vacío.");
    setError('');
    setProcesando(true);

    try {
      // 1. Crear cabecera
      const resT = await api.post('transacciones/', {
        tipo_documento: esCotizacion ? 'COTIZACION' : 'VENTA',
        cliente: clienteSeleccionado,
        bodega: bodegaSeleccionada,
        estado: 'BORRADOR',
        observaciones: observaciones || undefined,
      });
      const tId = resT.data.id;

      // 2. Añadir líneas con descuentos individuales
      for (const d of detalles) {
        await api.post('detalles/', { 
          transaccion: tId, 
          producto: d.producto.id, 
          cantidad: d.cantidad,
          descuento_porcentaje: parseNum(d.descuento),
        });
      }

      // 3. Emitir (descuenta stock automáticamente en backend si es Venta)
      await api.patch(`transacciones/${tId}/`, { estado: 'EMITIDA' });

      // 4. Registrar el pago SOLO si es Venta
      if (!esCotizacion) {
        await api.post('pagos/', {
          transaccion: tId,
          metodo: metodoPago,
          monto: totalFinal.toFixed(2),
          referencia: referenciaPago || undefined,
        });
      }

      // Obtener el número de documento asignado
      const resVenta = await api.get(`transacciones/${tId}/`);
      const numDoc = resVenta.data.numero_documento || `#${tId}`;
      
      if (esCotizacion) {
        alert(`✅ Cotización ${numDoc} guardada exitosamente.`);
      } else {
        alert(`✅ Venta ${numDoc} completada. Pago registrado: ${metodoPago} $${totalFinal.toFixed(2)}`);
      }
      navigate('/ventas/historial');
    } catch (err) {
      const msj = err.response?.data?.error || JSON.stringify(err.response?.data || err.message);
      setError("Error en la venta: " + msj);
      setProcesando(false);
    }
  };

  return (
    <div onClick={refocusScanner}>
      {/* Input invisible del scanner USB/HID */}
      <input
        ref={scannerInputRef}
        value={skuScaneado}
        onChange={e => setSkuScaneado(e.target.value)}
        onKeyDown={onScannerKeyDown}
        style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
        tabIndex={-1}
        aria-hidden
      />
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">🛒 Punto de Venta (POS)</h1>
          <p className="page-subtitle">Sistema de facturación y salida de mercancía.</p>
        </div>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Operando en Bodega:</label>
          <select className="form-select" style={{ width: '200px', display: 'inline-block' }} 
            value={bodegaSeleccionada} onChange={e => setBodegaSeleccionada(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {bodegas.map(b => <option key={b.id} value={b.id} disabled={!b.activa}>{b.nombre}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
        
        {/* LADO IZQUIERDO: BUSCADOR Y CARRITO */}
        <div>
          <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Agregar Producto</h3>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 110px 110px auto', gap: '8px', alignItems: 'end' }}>
              {/* DROPDOWN CUSTOM CON COLORES */}
              <div ref={dropdownRef} style={{ position: 'relative', flex: 1 }}>
                {/* Botón disparador */}
                <div onClick={() => setDropdownAbierto(o => !o)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', fontSize: '14px',
                    color: prodSelect ? 'var(--text-main)' : 'var(--text-muted)',
                    userSelect: 'none'
                  }}
                >
                  <span>
                    {(() => {
                      const p = productos.find(x => x.id === parseInt(prodSelect));
                      if (!p) return '-- Seleccionar producto --';
                      const inv = p.inventarios?.find(i => i.bodega === parseInt(bodegaSeleccionada)) || { cantidad: 0 };
                      const disp = parseFloat(inv.cantidad);
                      return (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: disp > 0 ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                          [{p.codigo_sku}] {p.nombre}
                          <span style={{ color: disp > 0 ? '#10b981' : '#ef4444', marginLeft: '4px', fontSize: '12px' }}>
                            Stock: {disp} {p.unidad_medida}
                          </span>
                        </span>
                      );
                    })()}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px' }}>▼</span>
                </div>

                {/* Lista desplegable */}
                {dropdownAbierto && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                    borderRadius: '10px', boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
                    zIndex: 999, overflow: 'hidden', maxHeight: '340px', display: 'flex', flexDirection: 'column'
                  }}>
                    {/* Buscador interno */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="🔍 Buscar producto..."
                        value={busquedaProd}
                        onChange={e => setBusquedaProd(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {(() => {
                        const busqL = busquedaProd.toLowerCase();
                        const filtrados = productos.filter(p =>
                          p.nombre.toLowerCase().includes(busqL) || p.codigo_sku.toLowerCase().includes(busqL)
                        );
                        // Ordenar: disponibles primero, agotados al fondo
                        const ordenados = [...filtrados].sort((a, b) => {
                          const getDisp = (prod) => {
                            const bodDisp = parseFloat((prod.inventarios?.find(i => i.bodega === parseInt(bodegaSeleccionada)) || { cantidad: 0 }).cantidad);
                            const globDisp = parseFloat(prod.stock_actual ?? 0);
                            return Math.min(bodDisp, globDisp);
                          };
                          const dispA = getDisp(a);
                          const dispB = getDisp(b);
                          return dispB > 0 && dispA <= 0 ? 1 : dispA > 0 && dispB <= 0 ? -1 : 0;
                        });

                        if (ordenados.length === 0) return (
                          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Sin resultados
                          </div>
                        );

                        return ordenados.map(p => {
                          const inv = p.inventarios?.find(i => i.bodega === parseInt(bodegaSeleccionada)) || { cantidad: 0 };
                          const dispBodega = parseFloat(inv.cantidad);
                          // Usar el mínimo entre el stock de la bodega y el stock_actual global
                          // Si el admin editó stock_actual=0, debe reflejarse aunque InventarioBodega diga otra cosa
                          const dispGlobal = parseFloat(p.stock_actual ?? 0);
                          const disp = Math.min(dispBodega, dispGlobal);
                          const agotado = disp <= 0 || !bodegaSeleccionada;
                          const seleccionado = parseInt(prodSelect) === p.id;

                          return (
                            <div key={p.id}
                              onClick={() => {
                                if (agotado) return;
                                setProdSelect(p.id);
                                setDropdownAbierto(false);
                                setBusquedaProd('');
                              }}
                              style={{
                                padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: agotado ? 'not-allowed' : 'pointer',
                                background: seleccionado ? 'rgba(99,102,241,0.15)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                opacity: agotado ? 0.55 : 1,
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!agotado) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = seleccionado ? 'rgba(99,102,241,0.15)' : 'transparent'; }}
                            >
                              {/* Indicador de stock */}
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: agotado ? '#ef4444' : '#10b981', boxShadow: agotado ? '0 0 6px #ef4444' : '0 0 6px #10b981' }} />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: agotado ? '#ef4444' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: agotado ? 'line-through' : 'none' }}>
                                  [{p.codigo_sku}] {p.nombre}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  ${parseFloat(p.precio_venta).toFixed(2)} &nbsp;·&nbsp;
                                  <span style={{ color: agotado ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                    {agotado ? (!bodegaSeleccionada ? 'Selecciona bodega' : 'AGOTADO') : `Stock: ${disp} ${p.unidad_medida}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <input type="number" className="input-field" style={{ marginBottom: 0 }} placeholder="Cant." min="0" step="any" value={cantSelect} onChange={e => setCantSelect(e.target.value)} />
              </div>
              <div>
                <button type="button" className="btn-primary" onClick={agregarDetalle}>+ Añadir</button>
              </div>
            </div>
          </div>

          {/* TABLA DEL CARRITO CON DESCUENTOS POR ÍTEM */}
          <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Detalle de Factura</h3>
            {detalles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                🛒 El carrito está vacío
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Cant.</th>
                    <th>P.Unit</th>
                    <th>Desc. %</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((d, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{d.producto.nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>${parseFloat(d.producto.precio_venta).toFixed(2)}</td>
                      <td>
                        <input 
                          type="number" min="0" max="100" step="any" placeholder="0"
                          value={d.descuento}
                          onChange={e => actualizarDescuentoItem(i, e.target.value)}
                          style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '13px' }}
                        />
                        <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>%</span>
                      </td>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${calcularSubtotalItem(d).toFixed(2)}</td>
                      <td>
                        <button className="btn-sm btn-delete" onClick={() => quitarDetalle(i)}>✖</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* RESUMEN DE DESCUENTOS Y OBSERVACIONES */}
            {detalles.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Descuento Global</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="number" min="0" max="100" step="any" placeholder="0" 
                        value={descuentoGlobal}
                        onChange={e => setDescuentoGlobal(e.target.value)}
                        className="input-field" style={{ marginBottom: 0 }} />
                      <span style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Observaciones</label>
                    <input type="text" className="input-field" style={{ marginBottom: 0 }}
                      placeholder="Nota interna..." value={observaciones}
                      onChange={e => setObservaciones(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: PANEL DE COBRO */}
        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'sticky', top: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            Resumen de Cobro
          </h2>
          {error && <div className="alert-box alert-warning" style={{ marginBottom: '16px' }}>{error}</div>}
          
          {/* CLIENTE */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 'bold' }}>Facturar A (Cliente)</label>
            <select className="form-select" value={clienteSeleccionado} onChange={e => setClienteSeleccionado(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.username})</option>
              ))}
            </select>
          </div>

          {/* MÉTODO DE PAGO */}
          <div className="form-group">
            <label className="form-label">Método de Pago</label>
            <select className="form-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {(metodoPago === 'TARJETA' || metodoPago === 'TRANSFERENCIA') && (
            <div className="form-group">
              <label className="form-label">Referencia / Voucher</label>
              <input type="text" className="input-field" placeholder="Nro. de comprobante..."
                value={referenciaPago} onChange={e => setReferenciaPago(e.target.value)} />
            </div>
          )}

          {/* DESGLOSE FINANCIERO */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '8px', margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '14px' }}>
              <span>Subtotal bruto:</span>
              <span>${subtotalBruto.toFixed(2)}</span>
            </div>
            {descuentoItemsTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#f59e0b', fontSize: '14px' }}>
                <span>Desc. por ítem:</span>
                <span>-${descuentoItemsTotal.toFixed(2)}</span>
              </div>
            )}
            {parseNum(descuentoGlobal) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#f59e0b', fontSize: '14px' }}>
                <span>Desc. global ({parseNum(descuentoGlobal)}%):</span>
                <span>-${descuentoGlobalValor.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', fontWeight: '900', color: 'var(--accent)', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <span>TOTAL:</span>
              <span>${totalFinal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, padding: '14px', fontSize: '14px', background: detalles.length > 0 ? '#6366f1' : undefined, color: 'white', border: 'none' }}
              disabled={detalles.length === 0 || procesando || !clienteSeleccionado}
              onClick={() => facturar(true)}
            >
              📄 Guardar Cotización
            </button>
            <button 
              className="btn-primary" 
              style={{ flex: 2, padding: '14px', fontSize: '16px', background: detalles.length > 0 ? '#10b981' : undefined }}
              disabled={detalles.length === 0 || procesando || !clienteSeleccionado}
              onClick={() => facturar(false)}
            >
              {procesando ? '⏳ Procesando...' : `💰 Emitir Factura — $${totalFinal.toFixed(2)}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
