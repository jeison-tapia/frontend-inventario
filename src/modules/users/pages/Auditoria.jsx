import { useEffect, useState } from 'react';
import axiosInstance from '../../../shared/api/axiosInstance';

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const cargarLogs = async () => {
    try {
      setLoading(true);
      const url = `audit-logs/?search=${searchTerm}`;
      const { data } = await axiosInstance.get(url);
      setLogs(data.results || data);
    } catch (err) {
      console.error('Error cargando logs:', err);
      // Optional UI alert to understand fatal errors instantly:
      // alert("Error de API: " + (err.response?.status || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Basic debounce implementation for search
    const delayDebounceFn = setTimeout(() => {
      cargarLogs();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const getActionColor = (accion) => {
    const acc = accion.toUpperCase();
    if (acc.includes('NUEV') || acc === 'CREATE') return { bg: '#d4edda', text: '#155724' };
    if (acc.includes('ELIMINAR') || acc === 'DELETE') return { bg: '#f8d7da', text: '#721c24' };
    return { bg: '#fff3cd', text: '#856404' }; // default to warning/yellow for update ops
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🛡️ Auditoría y Trazabilidad</h1>
        <p className="page-subtitle">Visualiza cronológicamente quién hizo qué en el sistema.</p>
      </div>
      
      <div className="admin-toolbar">
        <input 
          type="text" 
          placeholder="Buscar por usuario, acción o tabla..." 
          className="input-field"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px', marginBottom: 0 }}
        />
        <button className="btn-secondary" onClick={cargarLogs}>🔄 Recargar</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Tabla Afectada</th>
              <th>Descripción Detallada</th>
            </tr>
          </thead>
          <tbody>
            {(loading && logs.length === 0) ? (
              <tr><td colSpan="5" className="text-center">Cargando bitácora restrictiva...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-muted">No hay registros de auditoría que coincidan.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.fecha_creacion).toLocaleString()}</td>
                  <td><strong>{log.usuario_nombre || 'SISTEMA'}</strong></td>
                  <td>
                    {/* Add inline styles for colored tags. Dynamic parsing for human-readable terms */}
                    <span style={{
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: getActionColor(log.accion).bg,
                      color: getActionColor(log.accion).text
                    }}>
                      {log.accion}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', 
                      backgroundColor: '#e2e3e5', color: '#383d41'
                    }}>
                      {log.tabla_afectada}
                    </span>
                  </td>
                  <td>{log.descripcion}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
