import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import api from '../../../shared/api/axiosInstance';

export default function Etiquetas() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [seleccion, setSeleccion] = useState({}); // { productoId: cantidad }
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true);
      try {
        const [resProd, resCat] = await Promise.all([
          api.get('productos/?page_size=500'),
          api.get('categorias/'),
        ]);
        setProductos(resProd.data.results || resProd.data);
        setCategorias(resCat.data.results || resCat.data);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, []);

  const toggleSeleccion = (id) => {
    setSeleccion(prev => {
      const nuevo = { ...prev };
      if (nuevo[id]) delete nuevo[id];
      else nuevo[id] = 1;
      return nuevo;
    });
  };

  const setCantidad = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setSeleccion(prev => ({ ...prev, [id]: n }));
  };

  // Filtrar por búsqueda (nombre, SKU e ID) y categoría
  const productosFiltrados = productos.filter(p => {
    const q = busqueda.toLowerCase().trim();
    const coincideBusqueda = !q || (
      p.nombre.toLowerCase().includes(q) ||
      p.codigo_sku.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
    const coincideCategoria = !filtroCategoria || String(p.categoria) === filtroCategoria;
    return coincideBusqueda && coincideCategoria;
  });

  // Lista de etiquetas a imprimir (producto × cantidad)
  const etiquetasImprimir = Object.entries(seleccion).flatMap(([id, cant]) => {
    const prod = productos.find(p => p.id === parseInt(id));
    return prod ? Array(cant).fill(prod) : [];
  });

  const totalSeleccionados = Object.keys(seleccion).length;

  const seleccionarTodosFiltrados = () => {
    const nuevo = { ...seleccion };
    productosFiltrados.forEach(p => { if (!nuevo[p.id]) nuevo[p.id] = 1; });
    setSeleccion(nuevo);
  };

  const deseleccionarTodosFiltrados = () => {
    const nuevo = { ...seleccion };
    productosFiltrados.forEach(p => { delete nuevo[p.id]; });
    setSeleccion(nuevo);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏷️ Generador de Etiquetas</h1>
        <p className="page-subtitle">Selecciona productos y la cantidad de etiquetas a imprimir</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* COLUMNA IZQUIERDA: SELECCIÓN */}
        <div>
          <div className="modal-box" style={{ position: 'static', transform: 'none', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>📦 Seleccionar Productos</h3>

            {/* Buscador */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }}>🔍</span>
              <input
                type="text"
                className="input-field"
                placeholder="Buscar por nombre, SKU o ID..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ marginBottom: 0, paddingLeft: '36px' }}
              />
            </div>

            {/* Filtro por Categoría */}
            <select
              className="form-select"
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              style={{ marginBottom: '12px' }}
            >
              <option value="">📂 Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>

            {/* Barra de resultados y acciones rápidas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>
                {cargando ? 'Cargando...' : `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`}
                {totalSeleccionados > 0 && <span style={{ color: 'var(--primary)', marginLeft: '8px', fontWeight: 600 }}>• {totalSeleccionados} seleccionado{totalSeleccionados !== 1 ? 's' : ''}</span>}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={seleccionarTodosFiltrados}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', padding: '2px 6px' }}
                >
                  ✓ Seleccionar todos
                </button>
                {totalSeleccionados > 0 && (
                  <button
                    onClick={deseleccionarTodosFiltrados}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '12px', padding: '2px 6px' }}
                  >
                    ✕ Quitar filtrados
                  </button>
                )}
              </div>
            </div>

            {/* Lista de productos */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {cargando ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>⏳ Cargando productos...</div>
              ) : productosFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {busqueda || filtroCategoria ? `Sin resultados para la búsqueda actual.` : 'No hay productos.'}
                </div>
              ) : (
                productosFiltrados.map(p => {
                  const sel = seleccion[p.id];
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 12px', borderRadius: '8px',
                      border: `1px solid ${sel ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: sel ? 'rgba(99,102,241,0.08)' : 'var(--bg-dark)',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                      onClick={() => toggleSeleccion(p.id)}
                    >
                      <input type="checkbox" checked={!!sel} readOnly style={{ cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                          SKU: {p.codigo_sku}
                          <span style={{ marginLeft: '8px', opacity: 0.6 }}>ID: #{p.id}</span>
                          {p.categoria_nombre && <span style={{ marginLeft: '8px', opacity: 0.6 }}>• {p.categoria_nombre}</span>}
                        </div>
                      </div>
                      <div style={{ color: '#10b981', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ${parseFloat(p.precio_venta).toFixed(2)}
                      </div>
                      {sel && (
                        <input
                          type="number" min="1" max="200"
                          value={sel}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); setCantidad(p.id, e.target.value); }}
                          style={{ width: '58px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--card-bg)', color: 'var(--text-main)', textAlign: 'center', fontSize: '13px' }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => window.print()}
              disabled={etiquetasImprimir.length === 0}
            >
              🖨️ Imprimir {etiquetasImprimir.length} Etiqueta{etiquetasImprimir.length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => setSeleccion({})}
              disabled={totalSeleccionados === 0}
              style={{
                padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px'
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA PREVIA */}
        <div>
          <div className="modal-box" style={{ position: 'static', transform: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>👁️ Vista Previa</h3>
              {etiquetasImprimir.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '3px 10px', borderRadius: '20px' }}>
                  {etiquetasImprimir.length} etiqueta{etiquetasImprimir.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {etiquetasImprimir.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏷️</div>
                Selecciona productos para ver la vista previa
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
                {etiquetasImprimir.slice(0, 24).map((p, i) => (
                  <div key={i} style={{
                    width: '155px', border: '1px solid #ccc', borderRadius: '6px',
                    padding: '8px', textAlign: 'center', background: 'white', color: '#1a1a2e'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                    <Barcode value={p.codigo_sku} width={1.2} height={38} fontSize={8} margin={0} />
                    <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '3px' }}>${parseFloat(p.precio_venta).toFixed(2)}</div>
                  </div>
                ))}
                {etiquetasImprimir.length > 24 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px', alignSelf: 'center', textAlign: 'center' }}>
                    ...y {etiquetasImprimir.length - 24} etiqueta{etiquetasImprimir.length - 24 !== 1 ? 's' : ''} más
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN (solo visible al imprimir) */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .etiquetas-print, .etiquetas-print * { visibility: visible !important; }
          .etiquetas-print {
            position: absolute; left: 0; top: 0;
            display: flex !important; flex-wrap: wrap;
            gap: 4mm; padding: 5mm;
          }
          .etiqueta-item {
            width: 50mm; border: 1px solid #999;
            padding: 2mm; text-align: center;
            page-break-inside: avoid;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="etiquetas-print" style={{ display: 'none' }}>
        {etiquetasImprimir.map((p, i) => (
          <div key={i} className="etiqueta-item">
            <div style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '2mm', lineHeight: 1.2 }}>{p.nombre}</div>
            <Barcode value={p.codigo_sku} width={1} height={35} fontSize={7} margin={0} />
            <div style={{ fontSize: '11pt', fontWeight: 900, marginTop: '1mm' }}>${parseFloat(p.precio_venta).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
