import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { parseSistemaCalif } from '../utils/calification';

export default function Historial() {
  const navigate = useNavigate();
  const { listEvaluaciones, deleteEvaluacion, setCurrentResumen, setToast, importarEvaluacion } = useAppStore();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [filterNombre, setFilterNombre] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterFecha, setFilterFecha] = useState('');

  const loadEvaluaciones = async () => {
    const list = await listEvaluaciones();
    setEvaluaciones(list.reverse());
  };

  useEffect(() => {
    loadEvaluaciones();
  }, []);

  const filteredEvals = evaluaciones.filter(ev => {
    if (filterNombre && !ev.nombre?.toLowerCase().includes(filterNombre.toLowerCase())) return false;
    if (filterPeriodo && ev.periodo !== parseInt(filterPeriodo)) return false;
    if (filterFecha && ev.fecha !== filterFecha) return false;
    return true;
  });

  const handleVerResumen = (id) => {
    setCurrentResumen(id);
    navigate(`/evaluacion/${id}`);
  };

  const handleVerRespuestas = (id) => {
    setCurrentResumen(id);
    navigate(`/evaluacion/${id}?view=respuestas`);
  };

  const handleEliminar = async (id, nombre) => {
    if (confirm(`Eliminar "${nombre}"?`)) {
      const ok = await deleteEvaluacion(id);
      if (ok) {
        setToast({ message: 'Evaluacion eliminada' });
        loadEvaluaciones();
      }
    }
  };

  const clearFilters = () => {
    setFilterNombre('');
    setFilterPeriodo('');
    setFilterFecha('');
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      await importarEvaluacion(file);
      setToast({ message: 'Evaluación importada correctamente' });
      loadEvaluaciones();
    } catch (err) {
      setToast({ message: err.message || 'Error al importar', isError: true });
    }
    
    e.target.value = '';
  };

  return (
    <main>
      <div className="card">
        <div className="card-title">Historial de evaluaciones</div>
        <div className="card-desc">Evaluaciones guardadas localmente en este dispositivo mediante IndexedDB.</div>
        
        <div className="hist-filters">
          <input type="text" placeholder="Buscar por nombre..." value={filterNombre} onChange={(e) => setFilterNombre(e.target.value)} />
          <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)}>
            <option value="">Todos los periodos</option>
            <option value="1">Periodo 1</option>
            <option value="2">Periodo 2</option>
            <option value="3">Periodo 3</option>
            <option value="4">Periodo 4</option>
          </select>
          <input type="date" value={filterFecha} onChange={(e) => setFilterFecha(e.target.value)} />
          <button className="btn btn-ghost" onClick={clearFilters} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>Limpiar</button>
        </div>

        <div className="hist-count">
          {filteredEvals.length} evaluacion(es)
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Importar CSV
            <input 
              type="file" 
              accept=".csv,.txt,text/csv,text/plain" 
              style={{ display: 'none' }}
              onChange={handleImportCSV}
            />
          </label>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Importar evaluacion desde archivo CSV exportado</span>
        </div>

        <div id="histList">
          {filteredEvals.length === 0 ? (
            <div className="hist-empty">
              <div className="hist-icon">📋</div>
              No hay evaluaciones guardadas.
            </div>
          ) : (
            filteredEvals.map(ev => (
              <div key={ev.id} className="eval-card">
                <div className="eval-card-info">
                  <div className="eval-card-title">
                    {ev.nombre}
                    <span className="periodo-pill">Periodo {ev.periodo}</span>
                  </div>
                  <div className="eval-card-meta">
                    <span>{ev.fecha || '-'}</span>
                    <span>{ev.numP} preguntas</span>
                    <span>{ev.numE} estudiantes</span>
                    <span>Escala: {ev.sistemaCalif || '1a5'}</span>
                  </div>
                </div>
                <div className="eval-card-actions">
                  <button className="btn btn-secondary" onClick={() => handleVerResumen(ev.id)}>Ver</button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ borderColor: 'var(--accent2)', color: 'var(--accent2)', padding: '7px 14px', fontSize: '0.75rem' }}
                    onClick={() => handleVerRespuestas(ev.id)}
                  >
                    Respuestas
                  </button>
                  <button className="btn btn-danger" onClick={() => handleEliminar(ev.id, ev.nombre)}>Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
