import { useState, useEffect } from 'react';
import axiosInstance from '../../../shared/api/axiosInstance';

export default function Reportes() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descargando, setDescargando] = useState('');
  
  // Rentabilidad
  const [rentabilidad, setRentabilidad] = useState(null);
  const [cargandoRent, setCargandoRent] = useState(false);

  const handleDescargar = async (formato) => {
    try {
      setDescargando(formato);
      const url = `transacciones/exportar_${formato}/?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      const response = await axiosInstance.get(url, { responseType: 'blob' });
      const mimeType = formato === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'application/pdf';
      const extension = formato === 'excel' ? 'xlsx' : 'pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Reporte_${formato.toUpperCase()}_${new Date().getTime()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert(`Error al generar el reporte: ${error.message}`);
    } finally {
      setDescargando('');
    }
  };

  const cargarRentabilidad = async () => {
    setCargandoRent(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      const res = await axiosInstance.get(`transacciones/rentabilidad/?${params.toString()}`);
      setRentabilidad(res.data);
    } catch (e) {
      alert('Error al cargar rentabilidad: ' + (e.response?.data?.detail || e.message));
    } finally {
      setCargandoRent(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Centro de Reportes</h1>
        <p className="page-subtitle">Análisis de rentabilidad, exportación de datos e indicadores financieros.</p>
      </div>
      
      {/* FILTROS DE FECHA */}
      <div className="modal-box" style={{ maxWidth: '700px', margin: '0 0 24px 0', position: 'static', transform: 'none' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>🗓 Filtro de Período</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha Inicio</label>
            <input type="date" className="input-field" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha Fin</label>
            <input type="date" className="input-field" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={cargarRentabilidad} disabled={cargandoRent}
          style={{ marginRight: '12px' }}>
          {cargandoRent ? '⏳ Calculando...' : '📈 Ver Rentabilidad'}
        </button>
      </div>

      {/* TARJETAS DE RENTABILIDAD */}
      {rentabilidad && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Ingresos Totales', value: `$${rentabilidad.total_ingresos?.toFixed(2)}`, color: '#3b82f6', icon: '💰' },
            { label: 'Costo Total', value: `$${rentabilidad.total_costo?.toFixed(2)}`, color: '#ef4444', icon: '📦' },
            { label: 'Margen Bruto', value: `$${rentabilidad.margen_bruto?.toFixed(2)}`, color: '#10b981', icon: '📈' },
            { label: 'Margen %', value: `${rentabilidad.margen_porcentaje?.toFixed(1)}%`, color: '#8b5cf6', icon: '💹' },
          ].map(k => (
            <div key={k.label} className="kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
              <div className="kpi-icon">{k.icon}</div>
              <div className="kpi-value" style={{ color: k.color, fontSize: '22px' }}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* EXPORTACIÓN */}
      <div className="modal-box" style={{ maxWidth: '700px', position: 'static', transform: 'none' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>⬇️ Exportar Datos</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '12px', fontSize: '1rem', backgroundColor: '#107c41' }}
            onClick={() => handleDescargar('excel')}
            disabled={descargando !== ''}
          >
            {descargando === 'excel' ? '⏳ Generando...' : '📊 Excel (.xlsx)'}
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '12px', fontSize: '1rem', backgroundColor: '#d32f2f' }}
            onClick={() => handleDescargar('pdf')}
            disabled={descargando !== ''}
          >
            {descargando === 'pdf' ? '⏳ Generando...' : '📄 PDF (.pdf)'}
          </button>
        </div>
        <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
          El reporte usará el filtro de período seleccionado arriba. Si no seleccionas fechas, exportará todos los registros.
        </p>
      </div>
    </div>
  );
}
