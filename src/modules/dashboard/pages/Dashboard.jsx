import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    productos: 0, 
    categorias: 0, 
    stockBajo: [],
    productosData: [],
    categoriasData: []
  });
  const [loading, setLoading] = useState(true);
  const [productosVencer, setProductosVencer] = useState([]);

  useEffect(() => {
    cargarStats();
    cargarVencimientos();
  }, []);

  const cargarVencimientos = async () => {
    try {
      const res = await api.get('productos/proximos_a_vencer/');
      setProductosVencer(res.data.results || res.data);
    } catch {}
  };

  const cargarStats = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('productos/?page_size=100'),
        api.get('categorias/'),
      ]);
      const productos = prodRes.data.results || prodRes.data;
      const categorias = catRes.data.results || catRes.data;
      
      const stockBajo = productos.filter(p => parseFloat(p.stock_actual) <= parseFloat(p.stock_minimo));
      
      // Calculate category distribution
      const categoriesMap = {};
      categorias.forEach(c => {
        categoriesMap[c.id] = c.nombre;
      });

      const catCounts = {};
      productos.forEach(p => {
        const catId = p.categoria || p.categoria_id;
        const catName = categoriesMap[catId] || 'Sin Categoría';
        catCounts[catName] = (catCounts[catName] || 0) + 1;
      });
      
      const categoriasData = Object.keys(catCounts).map(key => ({
        name: key,
        cantidad: catCounts[key]
      }));

      // Calculate Stock Status distribution for pie chart
      const stockNormalCount = productos.length - stockBajo.length;
      const stockStatusData = [
        { name: 'Stock Normal', value: stockNormalCount },
        { name: 'Stock Crítico', value: stockBajo.length }
      ];

      setStats({ 
        productos: productos.length, 
        categorias: categorias.length, 
        stockBajo,
        productosData: stockStatusData,
        categoriasData
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { icon: '📦', label: 'Productos',      value: stats.productos,                    color: '#3b82f6' },
    { icon: '🏷️', label: 'Categorías',     value: stats.categorias,                   color: '#8b5cf6' },
    { icon: '⚠️', label: 'Stock Crítico',  value: stats.stockBajo.length,             color: '#f59e0b' },
    { icon: '✅', label: 'Stock Normal',   value: stats.productos - stats.stockBajo.length, color: '#10b981' },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del sistema de inventario</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando estadísticas...</p>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="kpi-grid">
            {kpis.map(k => (
              <div className="kpi-card" key={k.label} style={{ borderTop: `3px solid ${k.color}` }}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* CHARTS SECTION */}
          {(stats.productos > 0 || stats.categorias > 0) && (
            <div className="charts-grid">
              {/* Bar Chart: Products per Category */}
              <div className="chart-card">
                <h3 className="chart-title">Productos por Categoría</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.categoriasData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-main)' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                        {stats.categoriasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart: Stock Status */}
              <div className="chart-card">
                <h3 className="chart-title">Estado del Stock</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.productosData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {stats.productosData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Stock Normal' ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'var(--text-main)', fontSize: '13px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* STOCK CRITICO */}
          {stats.stockBajo.length > 0 && (
            <div>
              <div className="admin-toolbar" style={{ marginTop: '16px' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700 }}>
                  ⚠️ Productos con stock crítico
                </h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Stock Actual</th>
                      <th>Stock Mínimo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.stockBajo.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.codigo_sku}</td>
                        <td className="stock-low">{Number(p.stock_actual)} {p.unidad_medida}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{Number(p.stock_minimo)}</td>
                        <td>
                          <span className="badge badge-warning">Crítico</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRODUCTOS PRÓXIMOS A VENCER */}
          {productosVencer.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div className="admin-toolbar" style={{ marginBottom: '0' }}>
                <h3 style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 700 }}>
                  ⏰ Productos próximos a vencer o vencidos ({productosVencer.length})
                </h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>SKU</th>
                      <th>Vence</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosVencer.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.codigo_sku}</td>
                        <td>{p.fecha_vencimiento}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                            background: p.estado_vencimiento === 'VENCIDO' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                            color: p.estado_vencimiento === 'VENCIDO' ? '#ef4444' : '#f59e0b',
                          }}>
                            {p.estado_vencimiento === 'VENCIDO' ? '❌ Vencido' : `⚠️ Vence en ${p.dias_para_vencer} días`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats.stockBajo.length === 0 && (
            <div className="alert-box" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', marginTop: '32px' }}>
              ✅ Todos los productos tienen stock sobre el mínimo requerido.
            </div>
          )}
        </>
      )}
    </div>
  );
}
