import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { parseSistemaCalif, calcNota } from '../utils/calification';
import { jsPDF } from 'jspdf';

export default function Resumen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvaluacion, setToast } = useAppStore();
  const [evaluacion, setEvaluacion] = useState(null);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [detalleIdx, setDetalleIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const ev = await getEvaluacion(parseInt(id));
      setEvaluacion(ev);
    };
    load();
  }, [id]);

  if (!evaluacion) {
    return <main><div className="card">Cargando...</div></main>;
  }

  const { notaMaxima, notaMinima } = parseSistemaCalif(evaluacion.sistemaCalif);
  const notaAprobacion = evaluacion.notaAprobacion || 3;

  const stats = {
    total: evaluacion.numE,
    aprobaron: evaluacion.notas.filter(n => n.nota >= notaAprobacion).length,
    reprobaron: evaluacion.numE - evaluacion.notas.filter(n => n.nota >= notaAprobacion).length,
    promedio: (evaluacion.notas.reduce((acc, n) => acc + n.nota, 0) / evaluacion.numE).toFixed(2),
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(evaluacion.nombre, 20, 20);
    doc.setFontSize(12);
    doc.text(`Periodo: ${evaluacion.periodo} | Fecha: ${evaluacion.fecha}`, 20, 30);
    doc.text(`Preguntas: ${evaluacion.numP} | Estudiantes: ${evaluacion.numE}`, 20, 38);
    doc.text(`Escala: ${notaMinima}-${notaMaxima} | Aprobación: ${notaAprobacion}`, 20, 46);
    
    let y = 60;
    doc.setFontSize(14);
    doc.text('Resultados:', 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Aprobaron: ${stats.aprobaron} | Reprobaron: ${stats.reprobaron}`, 20, y);
    y += 8;
    doc.text(`Promedio: ${stats.promedio}`, 20, y);
    y += 15;
    
    doc.setFontSize(12);
    doc.text('Detalle:', 20, y);
    y += 8;
    doc.setFontSize(10);
    evaluacion.notas.forEach((n, i) => {
      const estado = n.nota >= notaAprobacion ? 'Aprobado' : 'Reprobado';
      doc.text(`${i + 1}. ${n.nombre}: ${n.nota} (${n.aciertos} aciertos) - ${estado}`, 20, y);
      y += 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    doc.save(`${evaluacion.nombre}_resultados.pdf`);
    setToast({ message: 'PDF exportado' });
  };

  const handleExportCSV = () => {
    const ev = evaluacion;
    const evCalif = ev.sistemaCalif || '1a5';
    const { notaMaxima, notaMinima } = parseSistemaCalif(evCalif);
    const defaultPeso = (notaMaxima - notaMinima) / ev.numP;
    const pesos = ev.pesosPreguntas || new Array(ev.numP).fill(defaultPeso);
    
    const metadata = [
      '# ===== METADATA (para importacion) =====',
      `nombre,${ev.nombre}`,
      `fecha,${ev.fecha || ''}`,
      `periodo,${ev.periodo}`,
      `numP,${ev.numP}`,
      `numE,${ev.numE}`,
      `sistemaCalif,${evCalif}`,
      `notaMaxima,${ev.notaMaxima || notaMaxima}`,
      `notaAprobacion,${ev.notaAprobacion || 3}`,
      `pesoMode,${ev.pesoMode || 'igual'}`,
      `pesosPreguntas,${pesos.map(p => p.toFixed(4)).join(',')}`,
      `claveRespuestas,${ev.claveRespuestas.join(',')}`,
    ].join('\n');
    
    const estudiantes = ev.estudiantesRespuestas.map((resp, i) => {
      const nombre = ev.estudiantesNombres[i] || '';
      const respuestas = resp.map(rp => rp || '-').join('|');
      return `${i + 1}|${nombre}|${respuestas}|Si`;
    });
    
    const estudiantesSection = [
      '# ===== ESTUDIANTES =====',
      '#num,nombre,respuestas,calificado',
      ...estudiantes,
    ].join('\n');
    
    const csv = [metadata, estudiantesSection].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_evaluacion.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'CSV exportado' });
  };

  const getDetalleEstudiante = (idx) => {
    const ev = evaluacion;
    const resp = ev.estudiantesRespuestas[idx] || [];
    const clave = ev.claveRespuestas;
    const nombre = ev.estudiantesNombres[idx] || '';
    const evCalif = ev.sistemaCalif || '1a5';
    const { notaMaxima, notaMinima } = parseSistemaCalif(evCalif);
    const defaultPeso = (notaMaxima - notaMinima) / ev.numP;
    const pesos = ev.pesosPreguntas || new Array(ev.numP).fill(defaultPeso);
    
    const aciertos = resp.filter((r, i) => r === clave[i]).length;
    const errores = ev.numP - aciertos;
    const pct = ev.numP > 0 ? ((aciertos / ev.numP) * 100).toFixed(0) : 0;
    const nota = calcNota(resp, clave, pesos, evCalif);
    const notaAprueba = ev.notaAprobacion || 3;
    const aprobado = nota >= notaAprueba;
    
    return { nombre, resp, clave, aciertos, errores, pct, nota, aprobado, pesos };
  };

  const handlePrevEstudiante = () => {
    if (detalleIdx > 0) setDetalleIdx(detalleIdx - 1);
  };

  const handleNextEstudiante = () => {
    if (detalleIdx < evaluacion.numE - 1) setDetalleIdx(detalleIdx + 1);
  };

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button className="rsm-back" onClick={() => navigate('/historial')}>← Volver al historial</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Exportar PDF</button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Exportar CSV</button>
        </div>
      </div>

      <div className="card">
        <div className="rsm-header">
          <div className="rsm-title">{evaluacion.nombre}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Periodo {evaluacion.periodo} · {evaluacion.fecha}
          </div>
        </div>

        <div className="rsm-chips">
          <div className="rsm-chip">
            <div className="rsm-chip-label">Total</div>
            <div className="rsm-chip-val">{stats.total}</div>
          </div>
          <div className="rsm-chip">
            <div className="rsm-chip-label">Aprobaron</div>
            <div className="rsm-chip-val" style={{ color: 'var(--green)' }}>{stats.aprobaron}</div>
          </div>
          <div className="rsm-chip">
            <div className="rsm-chip-label">Reprobaron</div>
            <div className="rsm-chip-val" style={{ color: 'var(--red)' }}>{stats.reprobaron}</div>
          </div>
          <div className="rsm-chip">
            <div className="rsm-chip-label">Promedio</div>
            <div className="rsm-chip-val">{stats.promedio}</div>
          </div>
        </div>

        <table className="rsm-table">
          <thead>
            <tr>
              <th>#</th><th>Estudiante</th><th>Aciertos</th><th>Errores</th><th>Nota</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {evaluacion.notas.map((n, i) => {
              const aprobado = n.nota >= notaAprobacion;
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{n.nombre}</td>
                  <td style={{ color: 'var(--green)' }}>{n.aciertos}</td>
                  <td style={{ color: 'var(--red)' }}>{evaluacion.numP - n.aciertos}</td>
                  <td>{n.nota.toFixed(1)}</td>
                  <td>
                    <span className={`tag ${aprobado ? 'tag-green' : 'tag-red'}`}>
                      {aprobado ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      onClick={() => { setDetalleIdx(i); setDetalleModalOpen(true); }}
                    >
                      Respuestas
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detalleModalOpen && (() => {
        const detalle = getDetalleEstudiante(detalleIdx);
        return (
          <div className="modal-det-bg" onClick={() => setDetalleModalOpen(false)}>
            <div className="modal-det" onClick={e => e.stopPropagation()}>
              <div className="modal-det-header">
                <div className="modal-det-header-info">
                  <div className="modal-det-name">
                    <button 
                      className="btn btn-ghost" 
                      onClick={handlePrevEstudiante}
                      disabled={detalleIdx === 0}
                      style={{ padding: '4px 8px', marginRight: '8px', opacity: detalleIdx === 0 ? 0.3 : 1 }}
                    >
                      ◀
                    </button>
                    {detalle.nombre}
                    <button 
                      className="btn btn-ghost" 
                      onClick={handleNextEstudiante}
                      disabled={detalleIdx === evaluacion.numE - 1}
                      style={{ padding: '4px 8px', marginLeft: '8px', opacity: detalleIdx === evaluacion.numE - 1 ? 0.3 : 1 }}
                    >
                      ▶
                    </button>
                  </div>
                  <div className="modal-det-meta">
                    <span>Aciertos: <strong style={{ color: 'var(--green)' }}>{detalle.aciertos}</strong></span>
                    <span>Errores: <strong style={{ color: 'var(--red)' }}>{detalle.errores}</strong></span>
                    <span>{detalle.pct}% de acierto</span>
                    <span>Preguntas: {evaluacion.numP}</span>
                  </div>
                </div>
                <div className="modal-det-nota">
                  <div className="modal-det-nota-val" style={{ color: detalle.aprobado ? 'var(--green)' : 'var(--red)' }}>
                    {detalle.nota.toFixed(1)}
                  </div>
                  <div className="result-bar-wrap" style={{ width: '80px', margin: '8px auto 4px' }}>
                    <div className="result-bar" style={{ width: `${detalle.pct}%`, background: detalle.aprobado ? 'var(--green)' : 'var(--red)' }}></div>
                  </div>
                  <div className="modal-det-nota-sub">{detalle.aprobado ? 'Aprobó' : 'Reprobó'}</div>
                </div>
              </div>
              <div className="modal-det-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                  {detalle.resp.map((r, i) => {
                    const c = detalle.clave[i];
                    const ok = r === c;
                    return (
                      <div key={i} className={`resp-item ${ok ? 'resp-ok' : 'resp-err'}`}>
                        <div className="resp-item-num">Pregunta {i + 1}</div>
                        <div className="resp-item-opts">
                          {['A', 'B', 'C', 'D'].map(o => {
                            let cls = 'resp-pip';
                            if (o === r && o === c) cls += ' pip-correct';
                            else if (o === r && o !== c) cls += ' pip-wrong';
                            else if (o === c) cls += ' pip-show';
                            return <div key={o} className={cls}>{o}</div>;
                          })}
                        </div>
                        {evaluacion.pesoMode === 'diferente' && (
                          <span style={{ color: 'var(--muted)', float: 'right', fontSize: '0.62rem' }}>
                            {detalle.pesos[i].toFixed(3)} pts
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-det-close">
                <button className="btn btn-ghost" onClick={() => setDetalleModalOpen(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
