import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/auth/pages/Login';
import Dashboard from './modules/dashboard/pages/Dashboard';
import Layout from './shared/components/Layout';
import AdminCategorias from './modules/inventory/pages/AdminCategorias';
import AdminProductos from './modules/inventory/pages/AdminProductos';
import AdminBodegas from './modules/inventory/pages/AdminBodegas';
import Catalogo from './modules/inventory/pages/Catalogo';
import Proveedores from './modules/inventory/pages/Proveedores';
import Compras from './modules/inventory/pages/Compras';
import Usuarios from './modules/users/pages/Usuarios';
import Clientes from './modules/users/pages/Clientes';
import Auditoria from './modules/users/pages/Auditoria';
import Reportes from './modules/inventory/pages/Reportes';
import Perfil from './modules/users/pages/Perfil';
import PuntoDeVenta from './modules/inventory/pages/PuntoDeVenta';
import HistorialVentas from './modules/inventory/pages/HistorialVentas';
import Factura from './modules/inventory/pages/Factura';
import CierreCaja from './modules/caja/pages/CierreCaja';
import Etiquetas from './modules/inventory/pages/Etiquetas';
import Empresas from './modules/saas/pages/Empresas';
import Planes from './modules/saas/pages/Planes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/empresas" element={<Layout><Empresas /></Layout>} />
        <Route path="/planes" element={<Layout><Planes /></Layout>} />
        <Route path="/categorias" element={<Layout><AdminCategorias /></Layout>} />
        <Route path="/bodegas" element={<Layout><AdminBodegas /></Layout>} />
        <Route path="/productos" element={<Layout><AdminProductos /></Layout>} />
        <Route path="/catalogo" element={<Layout><Catalogo /></Layout>} />
        <Route path="/proveedores" element={<Layout><Proveedores /></Layout>} />
        <Route path="/compras" element={<Layout><Compras /></Layout>} />
        <Route path="/usuarios" element={<Layout><Usuarios /></Layout>} />
        <Route path="/clientes" element={<Layout><Clientes /></Layout>} />
        <Route path="/auditoria" element={<Layout><Auditoria /></Layout>} />
        <Route path="/reportes" element={<Layout><Reportes /></Layout>} />
        <Route path="/perfil" element={<Layout><Perfil /></Layout>} />
        <Route path="/ventas/nueva" element={<Layout><PuntoDeVenta /></Layout>} />
        <Route path="/ventas/historial" element={<Layout><HistorialVentas /></Layout>} />
        <Route path="/ventas/:id/factura" element={<Factura />} />
        <Route path="/caja" element={<Layout><CierreCaja /></Layout>} />
        <Route path="/etiquetas" element={<Layout><Etiquetas /></Layout>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
