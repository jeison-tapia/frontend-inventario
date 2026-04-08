import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import api from '../../../shared/api/axiosInstance';

export default function Etiquetas() {
  const [productos, setProductos] = useState([]);
  const [seleccion, setSeleccion] = useState({}); // { productoId: cantidad }
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api.get('productos/?page_size=200')
      .then(res => setProductos(res.data.results || res.data))
      .catch(console.error);
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

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Lista de etiquetas a imprimir (producto × cantidad)
  const etiquetasImprimir = Object.entries(seleccion).flatMap(([id, cant]) => {
    const prod = productos.find(p => p.id === parseInt(id));
    return prod ? Array(cant).fill(prod) : [];
  });

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
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>📦 Seleccionar Productos</h3>
            <input
              type="text"
              className="input-field"
              placeholder="🔍 Buscar por nombre o SKU..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ marginBottom: '12px' }}
            />
            <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {productosFiltrados.map(p => {
                const sel = seleccion[p.id];
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px', border: `1px solid ${sel ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: sel ? 'rgba(99,102,241,0.08)' : 'var(--bg-dark)',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                    onClick={() => toggleSeleccion(p.id)}
                  >
                    <input type="checkbox" checked={!!sel} readOnly style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.nombre}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>{p.codigo_sku}</div>
                    </div>
                    {sel && (
                      <input
                        type="number" min="1" max="100"
                        value={sel}
                        onClick={e => e.stopPropagation()}
                        onChange={e => { e.stopPropagation(); setCantidad(p.id, e.target.value); }}
                        style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)', textAlign: 'center' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => window.print()}
              disabled={etiquetasImprimir.length === 0}>
              🖨️ Imprimir {etiquetasImprimir.length} Etiqueta{etiquetasImprimir.length !== 1 ? 's' : ''}
            </button>
            <button onClick={() => setSeleccion({})} style={{
              padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px'
            }}>
              Limpiar
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA PREVIA */}
        <div>
          <div className="modal-box" style={{ position: 'static', transform: 'none' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>👁️ Vista Previa</h3>
            {etiquetasImprimir.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0', fontSize: '14px' }}>
                Selecciona productos para ver la vista previa
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {etiquetasImprimir.slice(0, 20).map((p, i) => (
                  <div key={i} style={{
                    width: '160px', border: '1px solid #ccc', borderRadius: '6px',
                    padding: '8px', textAlign: 'center', background: 'white', color: '#1a1a2e'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                    <Barcode value={p.codigo_sku} width={1.2} height={40} fontSize={9} margin={0} />
                    <div style={{ fontSize: '12px', fontWeight: 900, marginTop: '4px' }}>${parseFloat(p.precio_venta).toFixed(2)}</div>
                  </div>
                ))}
                {etiquetasImprimir.length > 20 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px', alignSelf: 'center' }}>
                    ...y {etiquetasImprimir.length - 20} más
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
