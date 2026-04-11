import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/api/axiosInstance';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// Tooltip personalizado para los charts
const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: '10px', padding: '10px 14px', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '12px' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontWeight: 700, margin: 0 }}>
            {prefix}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ productos: 0, categorias: 0, stockBajo: 0, clientes: 0, ventasHoy: 0, ingresosMes: 0 });
  const [graficaVentas, setGraficaVentas] = useState([]);   // Ventas por día (últimos 14 días)
  const [categoriasData, setCategoriasData] = useState([]);  // Productos por categoría
  const [stockData, setStockData] = useState([]);            // Estado del stock (pie)
  const [stockBajoLista, setStockBajoLista] = useState([]);  // Lista detallada stock crítico
  const [productosVencer, setProductosVencer] = useState([]);
  const [ultimasVentas, setUltimasVentas] = useState([]);    // Últimas 5 ventas
  const [alertaVisible, setAlertaVisible] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [resProd, resCat, resVentas, resClientes, resVencer] = await Promise.all([
        api.get('productos/?page_size=500'),
        api.get('categorias/'),
        api.get('transacciones/?tipo_documento=VENTA&page_size=200'),
        api.get('usuarios/?page_size=500'),
        api.get('productos/proximos_a_vencer/'),
      ]);

      const productos = resProd.data.results || resProd.data;
      const categorias = resCat.data.results || resCat.data;
      const todasVentas = (resVentas.data.results || resVentas.data)
        .filter(v => v.tipo_documento === 'VENTA' && v.estado === 'EMITIDA');
      const clientes = (resClientes.data.results || resClientes.data)
        .filter(u => u.rol === 'CLIENTE_FINAL');

      // ── Bajo stock ──
      const bajos = productos.filter(p => parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo));
      setStockBajoLista(bajos.slice(0, 8));

      // ── KPIs ──
      const hoy = new Date().toISOString().slice(0, 10);
      const ventasHoy = todasVentas.filter(v => v.fecha_creacion?.slice(0, 10) === hoy);
      const inicioMes = new Date(); inicioMes.setDate(1);
      const ventasMes = todasVentas.filter(v => new Date(v.fecha_creacion) >= inicioMes);
      const ingresosMes = ventasMes.reduce((s, v) => s + parseFloat(v.total_final || 0), 0);

      setKpis({
        productos: productos.length,
        categorias: categorias.length,
        stockBajo: bajos.length,
        clientes: clientes.length,
        ventasHoy: ventasHoy.length,
        ingresosMes,
      });

      // ── Últimas 5 ventas ──
      setUltimasVentas(todasVentas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)).slice(0, 5));

      // ── Gráfica ventas últimos 14 días ──
      const dias14 = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
        dias14[key] = { fecha: label, ventas: 0, ingresos: 0 };
      }
      todasVentas.forEach(v => {
        const key = v.fecha_creacion?.slice(0, 10);
        if (dias14[key]) {
          dias14[key].ventas += 1;
          dias14[key].ingresos += parseFloat(v.total_final || 0);
        }
      });
      setGraficaVentas(Object.values(dias14));

      // ── Productos por categoría ──
      const mapCat = {};
      categorias.forEach(c => { mapCat[c.id] = c.nombre; });
      const catCount = {};
      productos.forEach(p => {
        const name = mapCat[p.categoria] || 'Sin categoría';
        catCount[name] = (catCount[name] || 0) + 1;
      });
      setCategoriasData(Object.entries(catCount).map(([name, cantidad]) => ({ name, cantidad })));

      // ── Pie stock ──
      setStockData([
        { name: 'Stock Normal', value: productos.length - bajos.length },
        { name: 'Stock Crítico', value: bajos.length },
      ]);

      setProductosVencer(resVencer.data.results || resVencer.data);
      setUltimaActualizacion(new Date().toLocaleTimeString('es'));
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(cargar, 60000);
    return () => clearInterval(interval);
  }, [cargar]);

  const kpiCards = [
    { icon: '💰', label: 'Ingresos este mes', value: `$${kpis.ingresosMes.toFixed(2)}`, color: '#10b981', sub: 'ventas emitidas', link: '/ventas/historial' },
    { icon: '🧾', label: 'Ventas hoy', value: kpis.ventasHoy, color: '#3b82f6', sub: 'transacciones', link: '/ventas/historial' },
    { icon: '👥', label: 'Clientes', value: kpis.clientes, color: '#8b5cf6', sub: 'registrados', link: '/clientes' },
    { icon: '📦', label: 'Productos', value: kpis.productos, color: '#06b6d4', sub: 'en catálogo', link: '/productos' },
    { icon: '⚠️', label: 'Stock crítico', value: kpis.stockBajo, color: kpis.stockBajo > 0 ? '#f59e0b' : '#10b981', sub: 'bajo mínimo', link: '/productos' },
    { icon: '🏷️', label: 'Categorías', value: kpis.categorias, color: '#ec4899', sub: 'activas', link: '/categorias' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cargando dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">📊 Panel de Control</h1>
          <p className="page-subtitle">
            Visión en tiempo real de tu negocio
            {ultimaActualizacion && (
              <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '2px 8px', borderRadius: '10px' }}>
                🔄 Actualizado: {ultimaActualizacion}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={cargar}
          style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* ALERTAS */}
      {alertaVisible && (kpis.stockBajo > 0 || productosVencer.length > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderRadius: '10px', marginBottom: '24px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          fontSize: '14px'
        }}>
          <span>
            {kpis.stockBajo > 0 && <span style={{ marginRight: '16px' }}>⚠️ <strong>{kpis.stockBajo}</strong> producto{kpis.stockBajo !== 1 ? 's' : ''} con stock crítico</span>}
            {productosVencer.length > 0 && <span>⏰ <strong>{productosVencer.length}</strong> producto{productosVencer.length !== 1 ? 's' : ''} próximo{productosVencer.length !== 1 ? 's' : ''} a vencer</span>}
          </span>
          <button onClick={() => setAlertaVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {kpiCards.map(k => (
          <div
            key={k.label}
            onClick={() => navigate(k.link)}
            style={{
              background: 'var(--card-bg)', borderRadius: '14px', padding: '20px',
              borderTop: `3px solid ${k.color}`, cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s', border: `1px solid var(--border-color)`,
              borderTopColor: k.color,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{k.icon}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICA VENTAS — área temporal */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
            📈 Ingresos — últimos 14 días
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={graficaVentas} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradIngresos)" dot={false} activeDot={{ r: 5, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PIE — Estado del stock */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
            📦 Estado del Stock
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stockData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                {stockData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'Stock Normal' ? '#10b981' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
              <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ color: 'var(--text-main)', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICA CATEGORÍAS + ÚLTIMAS VENTAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Bar — Productos por categoría */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-main)' }}>
            🏷️ Productos por Categoría
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoriasData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {categoriasData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Últimas ventas */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>🧾 Últimas Ventas</h3>
            <button onClick={() => navigate('/ventas/historial')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>Ver todas →</button>
          </div>
          {ultimasVentas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Sin ventas emitidas aún
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ultimasVentas.map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {v.numero_documento || `#${v.id}`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {v.cliente_nombre || 'Sin cliente'} · {new Date(v.fecha_creacion).toLocaleDateString('es')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '14px' }}>
                    ${parseFloat(v.total_final || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STOCK CRÍTICO */}
      {stockBajoLista.length > 0 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>⚠️ Productos con Stock Crítico</h3>
            <button onClick={() => navigate('/productos')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>Gestionar →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {stockBajoLista.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.codigo_sku}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '15px' }}>{Number(p.stock_actual)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>mín: {Number(p.stock_minimo)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRÓXIMOS A VENCER */}
      {productosVencer.length > 0 && (
        <div style={{ background: 'var(--card-bg)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(239,68,68,0.25)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', marginBottom: '14px' }}>⏰ Próximos a vencer o vencidos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {productosVencer.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.nombre}</span>
                  <span style={{ marginLeft: '10px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.codigo_sku}</span>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: p.estado_vencimiento === 'VENCIDO' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                  color: p.estado_vencimiento === 'VENCIDO' ? '#ef4444' : '#f59e0b',
                }}>
                  {p.estado_vencimiento === 'VENCIDO' ? '❌ Vencido' : `⚠️ Vence en ${p.dias_para_vencer}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TODO OK */}
      {kpis.stockBajo === 0 && productosVencer.length === 0 && kpis.productos > 0 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '16px 20px', color: '#10b981', fontSize: '14px', fontWeight: 600 }}>
          ✅ Todo en orden — No hay alertas de stock ni vencimientos pendientes.
        </div>
      )}
    </div>
  );
}
