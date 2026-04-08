import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../shared/api/axiosInstance';

export default function Factura() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaccion, setTransaccion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const facturaRef = useRef();

  useEffect(() => {
    cargar();
  }, [id]);

  const cargar = async () => {
    try {
      const [resT, resP] = await Promise.all([
        api.get(`transacciones/${id}/`),
        api.get(`pagos/?transaccion=${id}`),
      ]);
      setTransaccion(resT.data);
      setPagos(resP.data.results || resP.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const imprimir = () => window.print();

  const enviarCorreo = async () => {
    try {
      const res = await api.post(`transacciones/${id}/enviar_correo/`);
      alert(`✅ ${res.data.mensaje}`);
    } catch (err) { alert("Error: " + JSON.stringify(err.response?.data || err.message)); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
        Cargando factura...
      </div>
    );
  }

  if (!transaccion) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <p>Transacción no encontrada.</p>
        <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  const fecha = new Date(transaccion.fecha_creacion).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const totalPagado = pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);
  const vuelto = totalPagado - parseFloat(transaccion.total_final);

  return (
    <>
      {/* BARRA DE HERRAMIENTAS (no se imprime) */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px',
        background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', marginBottom: '24px'
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px',
          padding: '8px 16px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px'
        }}>
          ← Volver
        </button>
        <button onClick={imprimir} style={{
          background: '#3b82f6', border: 'none', borderRadius: '8px',
          padding: '8px 20px', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '14px'
        }}>
          🖨️ Imprimir / Guardar PDF
        </button>
        {transaccion.estado === 'EMITIDA' && (
          <button onClick={enviarCorreo} style={{
            background: '#8b5cf6', border: 'none', borderRadius: '8px',
            padding: '8px 20px', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '14px'
          }}>
            📧 Enviar al Cliente
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: 'auto' }}>
          Usa Ctrl+P o el botón para guardar como PDF
        </span>
      </div>

      {/* FACTURA IMPRIMIBLE */}
      <div ref={facturaRef} className="factura-print" style={{
        maxWidth: '800px', margin: '0 auto', padding: '40px',
        background: 'white', color: '#1a1a2e', fontFamily: "'Segoe UI', Arial, sans-serif",
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)', borderRadius: '12px',
      }}>

        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '24px', borderBottom: '3px solid #3b82f6' }}>
          <div>
            {/* Logo / Nombre del negocio */}
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px' }}>
              🏢 Mi Empresa S.A.
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px', lineHeight: '1.6' }}>
              NIT: 900.000.000-1<br />
              Dirección: Calle Principal #123, Ciudad<br />
              Tel: +57 300 000 0000 · contacto@miempresa.com
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: transaccion.tipo_documento === 'VENTA' ? '#3b82f6' :
                          transaccion.tipo_documento === 'COTIZACION' ? '#8b5cf6' :
                          transaccion.tipo_documento === 'DEVOLUCION' ? '#f59e0b' : '#10b981',
              color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700,
              display: 'inline-block', marginBottom: '8px'
            }}>
              {transaccion.tipo_documento}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.5px', fontFamily: 'monospace' }}>
              {transaccion.numero_documento || `#${transaccion.id}`}
            </div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
              Estado: <strong style={{ color: transaccion.estado === 'EMITIDA' ? '#10b981' : transaccion.estado === 'ANULADA' ? '#ef4444' : '#f59e0b' }}>{transaccion.estado}</strong>
            </div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Fecha: {fecha}</div>
          </div>
        </div>

        {/* DATOS DEL CLIENTE/PROVEEDOR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              {transaccion.tipo_documento === 'COMPRA' ? 'Proveedor' : 'Cliente'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
              {transaccion.cliente_nombre || transaccion.proveedor_nombre || 'Consumidor Final'}
            </div>
          </div>
          {pagos.length > 0 && (
            <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Forma de Pago
              </div>
              {pagos.map((p, i) => (
                <div key={i} style={{ fontWeight: 600, fontSize: '14px', color: '#166534' }}>
                  {p.metodo}: ${parseFloat(p.monto).toFixed(2)}
                  {p.referencia && <span style={{ fontWeight: 400, color: '#64748b', fontSize: '12px' }}> · Ref: {p.referencia}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TABLA DE ÍTEMS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Cant.</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>P. Unit.</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Desc.</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(transaccion.detalles || []).map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                  {d.producto_nombre || `Producto #${d.producto}`}
                  {d.producto_sku && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '12px', display: 'block' }}>{d.producto_sku}</span>}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{Number(d.cantidad)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>${parseFloat(d.precio_historico_venta || 0).toFixed(2)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', color: parseFloat(d.descuento_porcentaje) > 0 ? '#f59e0b' : '#94a3b8', fontWeight: parseFloat(d.descuento_porcentaje) > 0 ? 700 : 400 }}>
                  {parseFloat(d.descuento_porcentaje) > 0 ? `${Number(d.descuento_porcentaje)}%` : '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>${parseFloat(d.subtotal_linea || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#64748b', fontSize: '14px' }}>
              <span>Subtotal:</span>
              <span>${parseFloat(transaccion.total_final).toFixed(2)}</span>
            </div>
            {totalPagado > 0 && totalPagado !== parseFloat(transaccion.total_final) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#64748b', fontSize: '14px' }}>
                <span>Pagado:</span>
                <span>${totalPagado.toFixed(2)}</span>
              </div>
            )}
            {vuelto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#10b981', fontWeight: 600, fontSize: '14px' }}>
                <span>Cambio/Vuelto:</span>
                <span>${vuelto.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '14px 16px', marginTop: '8px',
              background: '#1e293b', color: 'white', borderRadius: '8px', fontSize: '18px', fontWeight: 900
            }}>
              <span>TOTAL:</span>
              <span>${parseFloat(transaccion.total_final).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* OBSERVACIONES */}
        {transaccion.observaciones && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
            <strong>Observaciones:</strong> {transaccion.observaciones}
          </div>
        )}

        {/* PIE DE PÁGINA */}
        <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '2px dashed #e2e8f0', color: '#94a3b8', fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>¡Gracias por su preferencia!</div>
          <div>Este documento es una constancia de la transacción realizada · Generado el {new Date().toLocaleDateString('es-ES')}</div>
          {transaccion.tipo_documento === 'COTIZACION' && (
            <div style={{ marginTop: '8px', color: '#f59e0b', fontWeight: 600 }}>
              ⚠️ Este es un documento de cotización y no representa una factura de venta definitiva.
            </div>
          )}
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .factura-print {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </>
  );
}
