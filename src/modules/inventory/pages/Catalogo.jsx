import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await api.get('productos/?page_size=100');
      setProductos(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🛍️ Catálogo de Productos</h1>
        <p className="page-subtitle">Vista pública del inventario disponible</p>
      </div>

      <div className="admin-toolbar">
        <input
          className="input-field"
          style={{ maxWidth: '320px', marginBottom: 0 }}
          placeholder="🔍 Buscar por nombre o SKU..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando productos...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filtrados.map(prod => (
            <div key={prod.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>{prod.nombre}</h4>
                <span className={`badge ${parseFloat(prod.stock_actual) > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {parseFloat(prod.stock_actual) > 0 ? 'En Stock' : 'Agotado'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>SKU: {prod.codigo_sku}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Categoría: {prod.categoria_nombre}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>
                  ${parseFloat(prod.precio_venta).toFixed(2)}
                </span>
                <span style={{ fontSize: '13px', color: parseFloat(prod.stock_actual) > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                  {prod.stock_actual} {prod.unidad_medida}
                </span>
              </div>
            </div>
          ))}

          {filtrados.length === 0 && !loading && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
              No se encontraron productos con "{busqueda}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
