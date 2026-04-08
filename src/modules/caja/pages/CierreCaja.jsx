import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

export default function CierreCaja() {
  const [turno, setTurno] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [montoInicial, setMontoInicial] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movTipo, setMovTipo] = useState('INGRESO');
  const [efectivoDeclarado, setEfectivoDeclarado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [modalCierre, setModalCierre] = useState(false);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    cargarTurnoActivo();
    cargarHistorial();
  }, []);

  const cargarTurnoActivo = async () => {
    setCargando(true);
    try {
      const res = await api.get('turnos-caja/turno_activo/');
      setTurno(res.data.turno_activo !== null ? res.data : null);
      if (res.data && res.data.id) setTurno(res.data);
      else setTurno(null);
    } catch { setTurno(null); }
    finally { setCargando(false); }
  };

  const cargarHistorial = async () => {
    try {
      const res = await api.get('turnos-caja/?page_size=10');
      setHistorial(res.data.results || res.data);
    } catch {}
  };

  const abrirTurno = async () => {
    if (!montoInicial && montoInicial !== '0') return alert('Ingresa el monto inicial en caja.');
    try {
      await api.post('turnos-caja/abrir/', { monto_inicial: parseFloat(montoInicial) || 0 });
      setMontoInicial('');
      await cargarTurnoActivo();
    } catch (err) { alert('Error: ' + JSON.stringify(err.response?.data || err.message)); }
  };

  const agregarMovimiento = async (tipo) => {
    if (!movMonto || !movMotivo) return alert('Completa el monto y el motivo.');
    if (!turno?.id) return alert('No hay turno activo.');
    try {
      await api.post('movimientos-caja/', {
        turno: turno.id,
        tipo,
        monto: parseFloat(movMonto),
        motivo: movMotivo,
      });
      setMovMonto(''); setMovMotivo('');
      await cargarTurnoActivo();
    } catch (err) { alert('Error: ' + JSON.stringify(err.response?.data || err.message)); }
  };

  const cerrarTurno = async () => {
    if (!efectivoDeclarado && efectivoDeclarado !== '0') return alert('Declara el efectivo contado.');
    if (!turno?.id) return;
    try {
      const res = await api.post(`turnos-caja/${turno.id}/cerrar/`, {
        efectivo_declarado: parseFloat(efectivoDeclarado),
        observaciones,
      });
      setModalCierre(false);
      setEfectivoDeclarado('');
      setObservaciones('');
      setTurno(null);
      await cargarHistorial();
      const d = res.data;
      const diff = parseFloat(d.diferencia);
      alert(`✅ Turno cerrado.\nEsperado: $${parseFloat(d.total_efectivo_esperado).toFixed(2)}\nDeclarado: $${parseFloat(d.total_efectivo_declarado).toFixed(2)}\nDiferencia: ${diff >= 0 ? '✅' : '⚠️'} $${diff.toFixed(2)} ${diff >= 0 ? '(sobrante)' : '(faltante)'}`);
    } catch (err) { alert('Error: ' + JSON.stringify(err.response?.data || err.message)); }
  };

  // Totales calculados del turno activo
  const efectivoVentas  = turno?.total_ventas_efectivo || 0;
  const tarjetaVentas   = turno?.total_ventas_tarjeta || 0;
  const transVentas     = turno?.total_ventas_transferencia || 0;
  const ingresosManuales = turno?.total_ingresos_manuales || 0;
  const egresosManuales  = turno?.total_egresos_manuales || 0;
  const baseInicial     = parseFloat(turno?.monto_inicial || 0);
  const efectivoEsperado = baseInicial + efectivoVentas + ingresosManuales - egresosManuales;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏦 Control de Caja</h1>
        <p className="page-subtitle">Apertura de turno, movimientos manuales y arqueo final</p>
      </div>

      {cargando ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando estado de caja...</p>
      ) : !turno ? (
        /* ── SIN TURNO ACTIVO ── */
        <div className="modal-box" style={{ maxWidth: '500px', position: 'static', transform: 'none' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>📭 Sin turno activo</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            Abre un turno para empezar a registrar ventas en esta sesión de caja.
          </p>
          <div className="form-group">
            <label className="form-label">💵 Efectivo en caja al iniciar ($)</label>
            <input type="number" min="0" step="0.01" className="input-field"
              placeholder="Ej: 50.00"
              value={montoInicial} onChange={e => setMontoInicial(e.target.value)} />
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '15px' }}
            onClick={abrirTurno}>
            ▶ Abrir Turno de Caja
          </button>
        </div>
      ) : (
        /* ── TURNO ACTIVO ── */
        <>
          {/* ESTADO DEL TURNO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Base Inicial', value: `$${baseInicial.toFixed(2)}`, color: '#3b82f6', icon: '💰' },
              { label: 'Ventas Efectivo', value: `$${efectivoVentas.toFixed(2)}`, color: '#10b981', icon: '💵' },
              { label: 'Ventas Tarjeta', value: `$${tarjetaVentas.toFixed(2)}`, color: '#8b5cf6', icon: '💳' },
              { label: 'Ventas Transf.', value: `$${transVentas.toFixed(2)}`, color: '#06b6d4', icon: '🏦' },
              { label: 'Ingresos Manuales', value: `$${ingresosManuales.toFixed(2)}`, color: '#f59e0b', icon: '⬆️' },
              { label: 'Egresos Manuales', value: `$${egresosManuales.toFixed(2)}`, color: '#ef4444', icon: '⬇️' },
              { label: 'Efectivo Esperado', value: `$${efectivoEsperado.toFixed(2)}`, color: '#10b981', icon: '🧮' },
            ].map(k => (
              <div key={k.label} className="kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-value" style={{ color: k.color, fontSize: '20px' }}>{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* MOVIMIENTOS MANUALES */}
          <div className="modal-box" style={{ maxWidth: '700px', position: 'static', transform: 'none', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>📋 Registrar Movimiento Manual</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monto ($)</label>
                <input type="number" min="0" step="0.01" className="input-field"
                  placeholder="Ej: 15.00"
                  value={movMonto} onChange={e => setMovMonto(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Motivo</label>
                <input type="text" className="input-field"
                  placeholder="Ej: Pago de servicios públicos"
                  value={movMotivo} onChange={e => setMovMotivo(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn-primary" style={{ background: '#10b981', flex: 1 }}
                onClick={() => agregarMovimiento('INGRESO')}>
                ⬆️ Registrar Ingreso
              </button>
              <button className="btn-primary" style={{ background: '#ef4444', flex: 1 }}
                onClick={() => agregarMovimiento('EGRESO')}>
                ⬇️ Registrar Egreso
              </button>
            </div>
          </div>

          {/* TABLA DE MOVIMIENTOS DEL TURNO */}
          {turno.movimientos?.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: '24px' }}>
              <table className="admin-table">
                <thead><tr><th>Tipo</th><th>Monto</th><th>Motivo</th><th>Hora</th></tr></thead>
                <tbody>
                  {turno.movimientos.map(m => (
                    <tr key={m.id}>
                      <td><span style={{ color: m.tipo === 'INGRESO' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{m.tipo === 'INGRESO' ? '⬆️ Ingreso' : '⬇️ Egreso'}</span></td>
                      <td style={{ fontWeight: 700 }}>${parseFloat(m.monto).toFixed(2)}</td>
                      <td>{m.motivo}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(m.fecha).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CIERRE */}
          <button onClick={() => setModalCierre(true)}
            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
            🔒 Cerrar Turno y Hacer Arqueo
          </button>
        </>
      )}

      {/* HISTORIAL DE TURNOS */}
      {historial.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📜 Historial de Turnos</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Apertura</th><th>Cajero</th><th>Estado</th><th>Base</th><th>Esperado</th><th>Declarado</th><th>Diferencia</th></tr>
              </thead>
              <tbody>
                {historial.map(t => {
                  const diff = parseFloat(t.diferencia);
                  return (
                    <tr key={t.id}>
                      <td style={{ fontSize: '12px' }}>{new Date(t.fecha_apertura).toLocaleString()}</td>
                      <td>{t.apertura_por_nombre || `#${t.apertura_por}`}</td>
                      <td><span className={`badge ${t.estado === 'ABIERTO' ? 'badge-success' : 'badge-warning'}`}>{t.estado}</span></td>
                      <td>${parseFloat(t.monto_inicial).toFixed(2)}</td>
                      <td>${parseFloat(t.total_efectivo_esperado).toFixed(2)}</td>
                      <td>${parseFloat(t.total_efectivo_declarado).toFixed(2)}</td>
                      <td style={{ color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CIERRE */}
      {modalCierre && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>🔒 Cierre de Turno — Arqueo</h2>
            <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Efectivo esperado en caja:</span>
                <strong style={{ color: '#10b981', fontSize: '16px' }}>${efectivoEsperado.toFixed(2)}</strong>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                = Base ${baseInicial.toFixed(2)} + Ventas efectivo ${efectivoVentas.toFixed(2)} + Ingresos ${ingresosManuales.toFixed(2)} - Egresos ${egresosManuales.toFixed(2)}
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">💵 Efectivo CONTADO físicamente ($)</label>
              <input type="number" min="0" step="0.01" className="input-field"
                placeholder="¿Cuánto hay en el cajón?"
                value={efectivoDeclarado} onChange={e => setEfectivoDeclarado(e.target.value)} />
            </div>
            {efectivoDeclarado !== '' && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', marginTop: '4px',
                background: (parseFloat(efectivoDeclarado) - efectivoEsperado) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${(parseFloat(efectivoDeclarado) - efectivoEsperado) >= 0 ? '#10b981' : '#ef4444'}`,
              }}>
                <strong style={{ color: (parseFloat(efectivoDeclarado) - efectivoEsperado) >= 0 ? '#10b981' : '#ef4444' }}>
                  Diferencia: ${(parseFloat(efectivoDeclarado) - efectivoEsperado).toFixed(2)} 
                  {' '}{(parseFloat(efectivoDeclarado) - efectivoEsperado) >= 0 ? '✅ Sobrante' : '⚠️ Faltante'}
                </strong>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Observaciones (opcional)</label>
              <textarea className="input-field" rows={2}
                placeholder="Notas del cierre..."
                value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setModalCierre(false)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-main)' }}>
                Cancelar
              </button>
              <button onClick={cerrarTurno}
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                🔒 Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
