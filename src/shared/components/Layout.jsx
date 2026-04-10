import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './Layout.css';

// Decodifica el payload del JWT sin librería externa
function getPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '🏠', roles: ['ADMIN', 'VENDEDOR', 'CLIENTE'] },
  { to: '/ventas/nueva', label: 'Punto de Venta', icon: '🛒', roles: ['ADMIN', 'VENDEDOR'], modulo: 'modulo_ventas' },
  { to: '/ventas/historial', label: 'Ventas', icon: '🧾', roles: ['ADMIN', 'VENDEDOR'], modulo: 'modulo_ventas' },
  { to: '/clientes',    label: 'Clientes',    icon: '🤝', roles: ['ADMIN', 'VENDEDOR'], modulo: 'modulo_clientes' },
  { to: '/catalogo',    label: 'Catálogo',    icon: '🛍️', roles: ['ADMIN', 'VENDEDOR', 'CLIENTE'], modulo: 'modulo_catalogo' },
  { to: '/productos',   label: 'Productos',   icon: '📦', roles: ['ADMIN'], modulo: 'modulo_inventario' },
  { to: '/categorias',  label: 'Categorías',  icon: '🏷️', roles: ['ADMIN'], modulo: 'modulo_inventario' },
  { to: '/bodegas',     label: 'Bodegas',     icon: '🏢', roles: ['ADMIN'], modulo: 'modulo_inventario' },
  { to: '/proveedores', label: 'Proveedores', icon: '🚚', roles: ['ADMIN'], modulo: 'modulo_compras' },
  { to: '/compras',     label: 'Compras',     icon: '📥', roles: ['ADMIN'], modulo: 'modulo_compras' },
  { to: '/caja',        label: 'Caja',        icon: '💰', roles: ['ADMIN', 'VENDEDOR'], modulo: 'modulo_caja' },
  { to: '/etiquetas',   label: 'Etiquetas',   icon: '🏷️', roles: ['ADMIN'], modulo: 'modulo_etiquetas' },
  { to: '/usuarios',    label: 'Personal',    icon: '👥', roles: ['ADMIN'], modulo: 'modulo_usuarios' },
  { to: '/auditoria',   label: 'Auditoría',   icon: '🛡️', roles: ['ADMIN'], modulo: 'modulo_auditoria' },
  { to: '/reportes',    label: 'Reportes',    icon: '📊', roles: ['ADMIN'], modulo: 'modulo_reportes' },
  { to: '/perfil',      label: 'Mi Perfil',   icon: '👤', roles: ['ADMIN', 'VENDEDOR', 'CLIENTE'] },
  // Accesos exclusivos de Superusuario del Sistema (SaaS)
  { to: '/empresas',    label: 'Empresas',    icon: '🏢', roles: ['ADMIN'], isSuperuserOnly: true },
  { to: '/planes',      label: 'Planes SaaS', icon: '💎', roles: ['ADMIN'], isSuperuserOnly: true },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('access_token');
  const payload = getPayload(token || '');
  const rol = payload.rol || 'CLIENTE';
  const username = payload.username || 'Usuario';
  const isSuperuser = payload.is_superuser || false;
  const planModules = payload.plan || {};

  const filteredNavItems = NAV_ITEMS.filter(item => {
    // 1. Verificar si es solo para superusuarios
    if (item.isSuperuserOnly && !isSuperuser) return false;
    
    // 2. Si el usuario es superusuario, ve todo lo que no sea de cliente final
    if (isSuperuser) return true;

    // 3. Verificar roles básicos
    if (!item.roles.includes(rol)) return false;

    // 4. Verificar módulos del plan (si aplica)
    if (item.modulo && planModules[item.modulo] === false) return false;

    return true;
  });

  const [alertas, setAlertas] = useState(0);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [productosAlerta, setProductosAlerta] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // === SISTEMA DE TEMAS ===
  const getInitialTheme = () => {
    // 1. Verificar preferencia guardada
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    // 2. Detectar preferencia del SO
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const fetchAlerts = () => {
      if (rol === 'ADMIN' || rol === 'VENDEDOR') {
        axiosInstance.get('/api/productos/bajo_stock/')
          .then(res => {
            const items = res.data.results || res.data;
            setAlertas(items.length);
            setProductosAlerta(items.slice(0, 5));
          })
          .catch(console.error);
      }
    };
    
    fetchAlerts(); // Llamada inicial
    const intervalId = setInterval(fetchAlerts, 5 * 60 * 1000); // Polling cada 5 minutos
    
    return () => clearInterval(intervalId);
  }, [rol]);

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    navigate('/');
  };

  // Hook de Cierre por Inactividad Global (Seguridad)
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      // 15 minutos = 900,000 ms (Podemos ajustarlo si se necesita)
      timeout = setTimeout(() => {
        alert("Tu sesión corporativa ha caducado por inactividad. Por seguridad, presiona ACEPTAR e inicia sesión nuevamente.");
        logout();
      }, 900000); 
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer(); // Start the timer on mount

    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  return (
    <div className="app-layout">
      {/* OVERLAY PARA MÓVILES */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📦</span>
          <span className="sidebar-logo-text">B2B Sistema</span>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
              }
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{username.charAt(0).toUpperCase()}</div>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/perfil')}>
              <div className="sidebar-user-name">{username}</div>
              <div className="sidebar-user-role">{rol}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* TOPBAR PARA NOTIFICACIONES */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
          </div>
          <div className="topbar-right">
          {/* Botón de Toggle de Tema */}
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} style={{
            background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            border: '1px solid var(--border-color)',
            borderRadius: '50px', padding: '7px 16px', cursor: 'pointer',
            fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center',
            gap: '8px', transition: 'all 0.2s ease', fontFamily: 'inherit'
          }}>
            <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
          <div onClick={() => setMostrarAlertas(!mostrarAlertas)} style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', 
            background: 'var(--card-bg)', padding: '6px 16px', borderRadius: '50px', border: '1px solid var(--border-color)',
            transition: 'all 0.2s ease'
          }}>
            <span style={{ position: 'relative', fontSize: '1.2rem' }}>
              🔔
              {alertas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-8px', background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>{alertas}</span>}
            </span>
            {alertas > 0 ? (
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                {alertas} alerta{alertas !== 1 ? 's' : ''} de stock
              </span>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Stock normal</span>
            )}
          </div>

          {mostrarAlertas && (
            <div style={{ position: 'absolute', top: '65px', right: '2rem', width: '320px', background: 'var(--card-bg)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', borderRadius: '8px', zIndex: 1000, padding: '1.5rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--text-light)' }}>Alertas de Inventario</h4>
              {alertas === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Stock en niveles óptimos. ✅</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {productosAlerta.map(p => (
                    <li key={p.id} style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#fca5a5' }}>
                      <strong>{p.codigo_sku}</strong>: Quedan {Number(p.stock_actual)} {p.unidad_medida}. (Mín: {Number(p.stock_minimo)})
                    </li>
                  ))}
                  {alertas > 5 && (
                    <li style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      <button onClick={() => navigate('/productos')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Ver los {alertas} productos en rojo</button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          </div>
        </header>

        <div className="main-content-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
