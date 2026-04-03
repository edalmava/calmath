import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { parseSistemaCalif, calcNota } from '../utils/calification';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Resumen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getEvaluacionWithPhotos, setToast } = useAppStore();
  const [evaluacion, setEvaluacion] = useState(null);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [detalleIdx, setDetalleIdx] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    const load = async () => {
      const ev = await getEvaluacionWithPhotos(parseInt(id));
      setEvaluacion(ev);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (evaluacion && searchParams.get('view') === 'respuestas') {
      setDetalleIdx(0);
      setDetalleModalOpen(true);
      navigate(`/evaluacion/${id}`, { replace: true });
    }
  }, [evaluacion, searchParams, id, navigate]);

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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;
    const ev = evaluacion;
    const notaAprueba = ev.notaAprobacion || 3;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultados de Evaluación', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(ev.nombre, pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fechaLocal = ev.fecha
      ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '-';
    doc.text(
      `Periodo ${ev.periodo} | ${fechaLocal} | ${ev.numP} preguntas | ${ev.numE} estudiantes`,
      pageWidth / 2, y, { align: 'center' },
    );
    y += 12;

    const totalNota = ev.notas.reduce((s, n) => s + n.nota, 0);
    const prom = (totalNota / ev.numE).toFixed(2);
    const pctApr = ((stats.aprobaron / ev.numE) * 100).toFixed(0);

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Promedio: ${prom}`, margin + 5, y);
    doc.text(`Aprobados: ${stats.aprobaron}/${ev.numE} (${pctApr}%)`, margin + 60, y);
    doc.text(`Nota mínima: ${notaAprueba}`, margin + 120, y);
    y += 16;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Estudiante', 'Aciertos', 'Errores', 'Nota', 'Estado']],
      body: ev.notas.map((n, i) => [
        i + 1,
        n.nombre.length > 28 ? n.nombre.substring(0, 25) + '...' : n.nombre,
        n.aciertos,
        ev.numP - n.aciertos,
        n.nota.toFixed(1),
        n.nota >= notaAprueba ? 'Aprobado' : 'Reprobado',
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 65 },
        2: { halign: 'center', cellWidth: 25, textColor: [86, 211, 100] },
        3: { halign: 'center', cellWidth: 25, textColor: [248, 81, 73] },
        4: { halign: 'center', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 30 },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const nota = parseFloat(data.cell.raw);
          if (nota >= notaAprueba) data.cell.styles.textColor = [86, 211, 100];
          else if (nota >= notaAprueba - 1) data.cell.styles.textColor = [240, 192, 64];
          else data.cell.styles.textColor = [248, 81, 73];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'Aprobado') data.cell.styles.textColor = [86, 211, 100];
          else data.cell.styles.textColor = [248, 81, 73];
        }
      },
    });

    y = doc.lastAutoTable.finalY + 10;

    const analisisPorPregunta = [];
    const distribucionPorPregunta = [];
    for (let j = 0; j < ev.numP; j++) {
      let aciertosPregunta = 0;
      const conteo = { A: 0, B: 0, C: 0, D: 0 };
      for (let i = 0; i < ev.numE; i++) {
        const resp = (ev.estudiantesRespuestas[i] || [])[j];
        if (resp === ev.claveRespuestas[j]) aciertosPregunta++;
        if (resp && conteo[resp] !== undefined) conteo[resp]++;
      }
      const pct = ((aciertosPregunta / ev.numE) * 100).toFixed(1);
      analisisPorPregunta.push({ pregunta: j + 1, aciertos: aciertosPregunta, porcentaje: pct });
      distribucionPorPregunta.push({ pregunta: j + 1, clave: ev.claveRespuestas[j], ...conteo });
    }

    if (y > pageHeight - 40) { doc.addPage(); y = margin; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Análisis por Pregunta', margin, y);
    y += 7;

    const halfAnalisis = Math.ceil(analisisPorPregunta.length / 2);
    const analisisRows1 = [];
    const analisisRows2 = [];
    for (let i = 0; i < halfAnalisis; i++) {
      analisisRows1.push(analisisPorPregunta[i]);
      if (analisisPorPregunta[i + halfAnalisis]) {
        analisisRows2.push(analisisPorPregunta[i + halfAnalisis]);
      } else {
        analisisRows2.push({ pregunta: '-', aciertos: '-', porcentaje: '-' });
      }
    }

    autoTable(doc, {
      startY: y,
      head: [['Pregunta', 'Aciertos', '%', 'Pregunta', 'Aciertos', '%']],
      body: analisisRows1.map((left, i) => [
        left.pregunta,
        left.aciertos,
        left.porcentaje + '%',
        analisisRows2[i].pregunta,
        analisisRows2[i].aciertos,
        analisisRows2[i].porcentaje + '%',
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18 },
        1: { halign: 'center', cellWidth: 22 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 18 },
      },
    });

    y = doc.lastAutoTable.finalY + 12;
    if (y > pageHeight - 60) { doc.addPage(); y = margin; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Distribución de Respuestas por Pregunta', pageWidth / 2, y, { align: 'center' });
    y += 10;

    const colors = { A: [86, 211, 100], B: [248, 81, 73], C: [240, 192, 64], D: [79, 195, 247] };
    const maxBarWidth = 55;
    const halfDist = Math.ceil(distribucionPorPregunta.length / 2);

    for (let i = 0; i < halfDist; i++) {
      if (y > pageHeight - 50) { doc.addPage(); y = margin; }

      const drawDistrib = (d, xOffset) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`P${d.pregunta} (Clave: ${d.clave})`, xOffset, y);

        const barY = y + 4;
        ['A', 'B', 'C', 'D'].forEach((opt, idx) => {
          const count = d[opt];
          const pct = ((count / ev.numE) * 100).toFixed(0);
          const barWidth = Math.max((count / Math.max(d.A, d.B, d.C, d.D, 1)) * maxBarWidth, 0);

          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors[opt]);
          doc.text(opt, xOffset, barY + idx * 6 + 3);

          doc.setFillColor(230, 230, 230);
          doc.rect(xOffset + 6, barY + idx * 6, maxBarWidth, 4, 'F');

          doc.setFillColor(...colors[opt]);
          doc.rect(xOffset + 6, barY + idx * 6, barWidth, 4, 'F');

          doc.setTextColor(100, 100, 100);
          doc.text(`${count} (${pct}%)`, xOffset + 6 + maxBarWidth + 3, barY + idx * 6 + 3);
        });
      };

      drawDistrib(distribucionPorPregunta[i], margin);
      if (distribucionPorPregunta[i + halfDist]) {
        drawDistrib(distribucionPorPregunta[i + halfDist], pageWidth / 2 + 5);
      }
      y += 45;
    }

    doc.save(`${ev.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_resultados.pdf`);
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
    
    let foto = null;
    if (ev.estudiantesfotos && ev.estudiantesfotos[idx]) {
      const fotoData = ev.estudiantesfotos[idx];
      if (fotoData.blob) {
        foto = URL.createObjectURL(fotoData.blob);
      } else if (fotoData.data) {
        foto = fotoData.data;
      }
    }
    
    const aciertos = resp.filter((r, i) => r === clave[i]).length;
    const errores = ev.numP - aciertos;
    const pct = ev.numP > 0 ? ((aciertos / ev.numP) * 100).toFixed(0) : 0;
    const nota = calcNota(resp, clave, pesos, evCalif);
    const notaAprueba = ev.notaAprobacion || 3;
    const aprobado = nota >= notaAprueba;
    
    return { nombre, resp, clave, aciertos, errores, pct, nota, aprobado, pesos, foto };
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <span className="periodo-pill">{evaluacion.numP} preguntas</span>
            <span className="periodo-pill">{evaluacion.numE} estudiantes</span>
            <span className="periodo-pill">Peso {evaluacion.pesoMode === 'diferente' ? 'diferente' : 'igual'}</span>
            <span className="periodo-pill">{evaluacion.sistemaCalif || '1a5'}</span>
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
                {detalle.foto && (
                  <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                    <div 
                      style={{ 
                        display: 'inline-block', 
                        maxWidth: '200px', 
                        maxHeight: '150px', 
                        overflow: 'hidden',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setLightboxImg(detalle.foto)}
                    >
                      <img 
                        src={detalle.foto} 
                        alt="Hoja de respuestas" 
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Click para ampliar
                    </div>
                  </div>
                )}
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

      {lightboxImg && (
        <div 
          className="modal-bg" 
          style={{ background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={() => setLightboxImg(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%' }}>
            <img 
              src={lightboxImg} 
              alt="Hoja de respuestas" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setLightboxImg(null)}
                style={{ color: '#fff' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
