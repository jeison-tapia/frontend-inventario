import { useEffect, useState } from 'react';
import api from '../../../shared/api/axiosInstance';

// El username interno se genera automáticamente desde el NIT para uso del backend.
// El cliente NUNCA accede al sistema con estas credenciales.
const FORM_INICIAL = {
  nit: '',           // Campo visual — se usará como username interno
  razon_social: '',  // first_name en Django
  apellido: '',      // last_name en Django (opcional para personas naturales)
  telefono: '',
  email: '',
  credito_limite: 0,
  direccion: '',     // Usamos el campo email como dirección si no hay, pero lo guardamos aquí como observación visual
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const res = await api.get('usuarios/?page_size=500');
      const datos = (res.data.results || res.data).filter(u => u.rol === 'CLIENTE_FINAL');
      setClientes(datos);
    } catch (e) { console.error(e); }
  };

  const abrirCrear = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (cliente) => {
    setForm({
      nit: cliente.username,
      razon_social: cliente.first_name || '',
      apellido: cliente.last_name || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      credito_limite: cliente.credito_limite || 0,
      direccion: '',
    });
    setEditando(cliente.id);
    setError('');
    setModal(true);
  };

  const cerrarModal = () => { setModal(false); setEditando(null); setGuardando(false); };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);

    if (!form.nit.trim()) {
      setError('El NIT / Cédula es obligatorio.');
      setGuardando(false);
      return;
    }
    if (!form.razon_social.trim()) {
      setError('El nombre o razón social es obligatorio.');
      setGuardando(false);
      return;
    }

    try {
      // Mapeamos los campos visuales a los campos del modelo Django Usuario
      const payload = {
        username: form.nit.trim().replace(/\s+/g, ''),  // NIT sin espacios como username interno
        first_name: form.razon_social.trim(),
        last_name: form.apellido.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        credito_limite: parseFloat(form.credito_limite) || 0,
        rol: 'CLIENTE_FINAL',
      };

      // El cliente NUNCA usará esta contraseña — es solo un requisito técnico del modelo
      if (!editando) {
        payload.password = `cli_${Math.random().toString(36).slice(-10)}_${Date.now()}`;
      }

      if (editando) {
        await api.patch(`usuarios/${editando}/`, payload);
      } else {
        await api.post('usuarios/', payload);
      }

      cerrarModal();
      cargar();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.username) {
        setError('Ya existe un cliente registrado con ese NIT / Cédula.');
      } else {
        setError(JSON.stringify(errData || 'Error al guardar. Verifica los datos.'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al cliente "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`usuarios/${id}/`);
      cargar();
    } catch {
      alert('No se pudo eliminar el cliente. Probablemente tenga ventas o facturas asociadas.');
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const q = busqueda.toLowerCase();
    return (
      (c.username || '').toLowerCase().includes(q) ||
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.telefono || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const getIniciales = (c) => {
    const n = c.first_name || c.username || '?';
    const l = c.last_name || '';
    return `${n[0] || ''}${l[0] || ''}`.toUpperCase() || '?';
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="page-header">
        <h1 className="page-title">🤝 Directorio de Clientes</h1>
        <p className="page-subtitle">
          Registra y gestiona tu cartera de clientes para asociarlos a ventas y cotizaciones
        </p>
      </div>

      {/* Barra de herramientas */}
      <div className="admin-toolbar" style={{ gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <span style={{ fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, NIT, teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input-field"
            style={{ margin: 0, flex: 1, padding: '8px 12px' }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
          {clientesFiltrados.length} de {clientes.length} clientes
        </span>
        <button className="btn-primary" onClick={abrirCrear} id="btn-nuevo-cliente">
          + Nuevo Cliente
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)' }}>{clientes.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Clientes</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>
            {clientes.filter(c => parseFloat(c.credito_limite) > 0).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Con Crédito</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>
            {clientes.filter(c => parseFloat(c.deuda_actual) > 0).length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Con Deuda Pendiente</div>
        </div>
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b' }}>
            ${clientes.reduce((sum, c) => sum + parseFloat(c.deuda_actual || 0), 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cartera Total</div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>NIT / Cédula</th>
              <th>Contacto</th>
              <th>Crédito Autorizado</th>
              <th>Deuda Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(c => (
              <tr key={c.id}>
                {/* Avatar + nombre */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0,
                    }}>
                      {getIniciales(c)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {c.first_name || '—'} {c.last_name || ''}
                      </div>
                      {c.email && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* NIT (username interno) */}
                <td>
                  <span style={{
                    background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '6px',
                    fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px'
                  }}>
                    {c.username}
                  </span>
                </td>

                {/* Contacto */}
                <td>
                  <div>{c.telefono || <span style={{ color: 'var(--text-muted)' }}>Sin teléfono</span>}</div>
                </td>

                {/* Crédito */}
                <td>
                  <div style={{ fontWeight: 600, color: parseFloat(c.credito_limite) > 0 ? '#10b981' : 'var(--text-muted)' }}>
                    ${parseFloat(c.credito_limite || 0).toFixed(2)}
                  </div>
                </td>

                {/* Deuda */}
                <td>
                  <div style={{
                    fontWeight: 700,
                    color: parseFloat(c.deuda_actual) > 0 ? '#ef4444' : '#10b981'
                  }}>
                    ${parseFloat(c.deuda_actual || 0).toFixed(2)}
                  </div>
                </td>

                {/* Acciones */}
                <td>
                  <div className="actions-cell">
                    <button
                      className="btn-sm btn-edit"
                      onClick={() => abrirEditar(c)}
                      title="Editar cliente"
                    >✏️</button>
                    <button
                      className="btn-sm btn-delete"
                      onClick={() => eliminar(c.id, `${c.first_name} ${c.last_name}`.trim() || c.username)}
                      title="Eliminar cliente"
                    >🗑️</button>
                  </div>
                </td>
              </tr>
            ))}

            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                  {busqueda ? `No se encontraron clientes con "${busqueda}"` : 'No hay clientes registrados aún.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de registro / edición */}
      {modal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <h2 className="modal-title">
              {editando ? '✏️ Editar Cliente' : '🤝 Registrar Nuevo Cliente'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', marginTop: '-8px' }}>
              {editando
                ? 'Actualiza los datos comerciales del cliente.'
                : 'Registra el cliente en el directorio para asociarlo a futuras ventas y cotizaciones.'}
            </p>

            {error && <div className="alert-box alert-warning" style={{ marginBottom: '14px' }}>{error}</div>}

            <form onSubmit={guardar}>

              {/* NIT / Cédula */}
              <div className="form-group">
                <label className="form-label">
                  NIT / Cédula <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  name="nit"
                  id="campo-nit"
                  className="input-field"
                  style={{ marginBottom: 0 }}
                  placeholder="Ej: 900123456-7 o 12345678"
                  value={form.nit}
                  onChange={handleChange}
                  disabled={!!editando}  // No se puede cambiar el NIT en edición
                  required
                />
                {editando && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    El NIT es el identificador único y no puede modificarse.
                  </span>
                )}
              </div>

              {/* Nombre / Razón Social + Apellido */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Nombre / Razón Social <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    name="razon_social"
                    id="campo-razon-social"
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    placeholder="Ej: Ferretería López"
                    value={form.razon_social}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido (opcional)</label>
                  <input
                    name="apellido"
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    placeholder="Para persona natural"
                    value={form.apellido}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Teléfono + Email */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    name="telefono"
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    placeholder="Ej: 3001234567"
                    value={form.telefono}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (opcional)</label>
                  <input
                    type="email"
                    name="email"
                    className="input-field"
                    style={{ marginBottom: 0 }}
                    placeholder="cliente@empresa.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Crédito Límite */}
              <div className="form-group">
                <label className="form-label">Crédito Autorizado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="credito_limite"
                  className="input-field"
                  style={{ marginBottom: 0 }}
                  placeholder="0.00 = sin crédito"
                  value={form.credito_limite}
                  onChange={handleChange}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Monto máximo de crédito autorizado para este cliente. Dejar en 0 si es solo contado.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#3b82f6' }}
                  disabled={guardando}
                  id="btn-guardar-cliente"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
