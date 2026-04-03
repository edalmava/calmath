import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { pesoTotal, parseSistemaCalif } from '../utils/calification';

function ImportStudentsModal({ isOpen, onClose }) {
  const { estudiantesNombres, importarEstudiantes, numE } = useAppStore();
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(estudiantesNombres.join('\n'));
    }
  }, [isOpen, estudiantesNombres]);

  if (!isOpen) return null;

  const handleApply = () => {
    const lines = text.split('\n').filter(line => line.trim());
    importarEstudiantes(lines);
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Importar nombres de estudiantes</div>
        <div className="modal-body">
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '8px' }}>
            Pega los nombres de los estudiantes (uno por línea):
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Juan Pérez&#10;María López&#10;Carlos García"
            style={{
              width: '100%',
              height: '150px',
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '6px' }}>
            Se generará un registro por cada nombre. Si hay menos nombres que estudiantes ({numE}), se completará con "Estudiante N".
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} style={{ padding: '9px 20px' }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleApply} style={{ padding: '9px 20px' }}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

export default function NuevaEvaluacion() {
  const {
    step, setStep,
    numP, setNumP,
    numE, setNumE,
    pesoMode, setPesoMode,
    pesosPreguntas, setPeso, resetPesos,
    claveRespuestas, setClaveRespuesta,
    sistemaCalif, setSistemaCalif,
    evalMeta, setEvalMeta,
    estudiantesNombres, setEstudianteNombre,
    estudiantesRespuestas, setEstudianteRespuesta,
    estudiantesCalificados, setEstudianteCalificado,
    currentStudent, setCurrentStudent,
    appSettings,
    resetState,
    saveEvaluacion,
    saveDraft,
    setToast,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentResult, setStudentResult] = useState(null);

  const handleNumPChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setNumP(val);
  };

  const handleNumEChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setNumE(val);
  };

  // Keyboard handler for Paso 3
  useEffect(() => {
    if (step !== 3) return;

    const handleKeyDown = (e) => {
      const options = ['A', 'B', 'C', 'D'];
      const key = e.key.toUpperCase();

      // Mark answer with A/B/C/D
      if (options.includes(key)) {
        e.preventDefault();
        setEstudianteRespuesta(currentStudent, currentQuestion, key);
        setEstudianteCalificado(currentStudent, true);
        
        // Advance to next question
        if (currentQuestion < numP - 1) {
          setCurrentQuestion(currentQuestion + 1);
        }
        setStudentResult(null);
        return;
      }

      // Enter to grade
      if (e.key === 'Enter') {
        e.preventDefault();
        const resp = estudiantesRespuestas[currentStudent] || [];
        const aciertos = resp.filter((r, i) => r === claveRespuestas[i]).length;
        const errores = numP - aciertos;
        const pct = ((aciertos / numP) * 100).toFixed(0);
        const { notaMinima, notaMaxima } = parseSistemaCalif(sistemaCalif);
        const nota = (notaMinima + (aciertos * (notaMaxima - notaMinima) / numP)).toFixed(1);
        
        setStudentResult({
          nota: parseFloat(nota),
          aciertos,
          errores,
          pct: parseInt(pct),
        });
        return;
      }

      // Navigation arrows
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentStudent < numE - 1) {
          setCurrentStudent(currentStudent + 1);
          setCurrentQuestion(0);
          setStudentResult(null);
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentStudent > 0) {
          setCurrentStudent(currentStudent - 1);
          setCurrentQuestion(0);
          setStudentResult(null);
        }
        return;
      }

      // Home/End
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentStudent(0);
        setCurrentQuestion(0);
        setStudentResult(null);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        setCurrentStudent(numE - 1);
        setCurrentQuestion(0);
        setStudentResult(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQuestion, currentStudent, numP, numE, claveRespuestas, estudiantesRespuestas, sistemaCalif]);

  // Reset question when student changes
  useEffect(() => {
    setCurrentQuestion(0);
    setStudentResult(null);
  }, [currentStudent]);

  const handleContinuarPaso1 = () => {
    const nombre = document.getElementById('nombrePrueba')?.value;
    const fecha = document.getElementById('fechaPrueba')?.value;
    const periodo = document.getElementById('periodoSel')?.value;

    if (!nombre?.trim()) {
      setToast({ message: 'Ingresa el nombre de la prueba', isError: true });
      return;
    }

    if (!fecha) {
      setToast({ message: 'Selecciona la fecha de la prueba', isError: true });
      return;
    }

    if (!periodo) {
      setToast({ message: 'Selecciona el periodo académico', isError: true });
      return;
    }

    if (!numP) {
      setToast({ message: 'Ingresa el número de preguntas', isError: true });
      return;
    }

    if (!numE) {
      setToast({ message: 'Ingresa el número de estudiantes', isError: true });
      return;
    }

    setEvalMeta({ nombre: nombre.trim(), fecha, periodo: parseInt(periodo) || 0 });
    setStep(2);
  };

  const renderPaso1 = () => (
    <div className="card" id="step1">
      <div className="card-title">Paso 1 - Configurar evaluacion</div>
      <div className="card-desc">Completa los datos de la prueba antes de definir preguntas y estudiantes.</div>

      <div className="form-row-3">
        <div className="form-field">
          <label>Nombre de la prueba <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" id="nombrePrueba" placeholder="Ej: Parcial de Algebra" defaultValue={evalMeta.nombre} />
        </div>
        <div className="form-field">
          <label>Fecha de la prueba <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="date" id="fechaPrueba" defaultValue={evalMeta.fecha || new Date().toISOString().split('T')[0]} />
        </div>
        <div className="form-field">
          <label>Periodo academico <span style={{ color: 'var(--red)' }}>*</span></label>
          <select id="periodoSel" defaultValue={evalMeta.periodo || ''}>
            <option value="">- Seleccionar -</option>
            <option value="1">Periodo 1</option>
            <option value="2">Periodo 2</option>
            <option value="3">Periodo 3</option>
            <option value="4">Periodo 4</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label>Numero de preguntas <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="number" id="numPreguntas" min="1" max="100" placeholder="Ej: 20" onChange={handleNumPChange} value={numP || ''} />
        </div>
        <div className="form-field">
          <label>Numero de estudiantes <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="number" id="numEstudiantes" min="1" max="200" placeholder="Ej: 30" onChange={handleNumEChange} value={numE || ''} />
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label>Peso de las preguntas</label>
        <div className="peso-mode-toggle">
          <button className={`peso-mode-btn ${pesoMode === 'igual' ? 'pm-active' : ''}`} onClick={() => setPesoMode('igual')}>Igual peso</button>
          <button className={`peso-mode-btn ${pesoMode === 'diferente' ? 'pm-active' : ''}`} onClick={() => setPesoMode('diferente')}>Peso diferente</button>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '7px' }}>
          {pesoMode === 'igual' ? 'Todas las preguntas valen lo mismo.' : 'Puedes asignar un peso diferente a cada pregunta.'}
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label>Sistema de calificacion</label>
        <div className="peso-mode-toggle" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <button className={`peso-mode-btn ${sistemaCalif.startsWith('1') ? 'pm-active' : ''}`} onClick={() => setSistemaCalif('1a' + parseSistemaCalif(sistemaCalif).notaMaxima)}>Desde 1</button>
          <button className={`peso-mode-btn ${sistemaCalif.startsWith('0') ? 'pm-active' : ''}`} onClick={() => setSistemaCalif('0a' + parseSistemaCalif(sistemaCalif).notaMaxima)}>Desde 0</button>
          <select
            id="califMaxSelect"
            style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
            value={parseSistemaCalif(sistemaCalif).notaMaxima || appSettings.notaMaxima || 5}
            onChange={(e) => {
              const inicio = sistemaCalif.startsWith('0') ? '0' : '1';
              setSistemaCalif(`${inicio}a${e.target.value}`);
            }}
          >
            <option value="5">Hasta 5</option>
            <option value="6">Hasta 6</option>
            <option value="7">Hasta 7</option>
            <option value="8">Hasta 8</option>
            <option value="9">Hasta 9</option>
            <option value="10">Hasta 10</option>
          </select>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '7px' }} id="califDesc">
          La nota minima es {parseSistemaCalif(sistemaCalif).notaMinima}.0 y la maxima es {parseSistemaCalif(sistemaCalif).notaMaxima}.0.
        </div>
      </div>

      {numP > 0 && (
        <div className="info-row">
          Valor por pregunta: <span>{(pesoTotal(sistemaCalif) / numP).toFixed(4)}</span>
          Nota min.: <span>{parseSistemaCalif(sistemaCalif).notaMinima.toFixed(1)}</span> | Nota max.: <span>{parseSistemaCalif(sistemaCalif).notaMaxima}</span>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleContinuarPaso1}>Continuar</button>
    </div>
  );

  const renderPaso2 = () => {
    const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);
    const pt = pesoTotal(sistemaCalif);
    const pesoSum = pesosPreguntas.reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
    const pesoSumRounded = Math.round(pesoSum * 10000) / 10000;
    const isPesoExacto = pesoSumRounded === pt;
    const isPesoFaltante = pesoSumRounded < pt;
    const isPesoExcedido = pesoSumRounded > pt;
    
    const todasClavesDefinidas = claveRespuestas.length === numP && claveRespuestas.every(c => c !== null && c !== undefined && c !== '');
    
    const handleContinuarPaso2 = () => {
      if (!todasClavesDefinidas) {
        setToast({ message: 'Selecciona la respuesta para todas las preguntas', isError: true });
        return;
      }
      if (pesoMode === 'diferente' && isPesoExcedido) {
        setToast({ message: `La suma de pesos (${pesoSumRounded.toFixed(4)}) excede el máximo (${pt})`, isError: true });
        return;
      }
      if (pesoMode === 'diferente' && isPesoFaltante) {
        setToast({ message: `La suma de pesos (${pesoSumRounded.toFixed(4)}) es menor que el máximo (${pt})`, isError: true });
        return;
      }
      setStep(3);
    };

    return (
      <>
        <ImportStudentsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
        <div className="card" id="step2">
          <div className="card-title">Paso 2 - Clave de respuestas</div>
          <div className="card-desc">Selecciona la respuesta correcta para cada pregunta.</div>
          <div className="meta-banner">
            <span><strong>{evalMeta.nombre || '-'}</strong></span>
            <span>Periodo {evalMeta.periodo || '-'}</span>
            <span>{numP} preguntas</span>
            <span>Peso: {pesoMode === 'igual' ? 'uniforme' : 'individual'}</span>
            <span>Escala: {notaMinima}-{notaMaxima}</span>
          </div>

          <div className="answer-grid">
            {Array.from({ length: numP }, (_, i) => (
              <div key={i} className="answer-item">
                <div className="q-num">Pregunta {i + 1}</div>
                <div className="options">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      className={`opt-btn ${claveRespuestas[i] === opt ? 'selected' : ''}`}
                      onClick={() => setClaveRespuesta(i, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {pesoMode === 'diferente' && (
                  <div className="peso-field">
                    <input
                      type="number"
                      className="peso-input"
                      value={pesosPreguntas[i] || 0}
                      onChange={(e) => setPeso(i, e.target.value)}
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '10px' }}>
            <button className="btn-ghost" onClick={() => setShowImportModal(true)} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              📥 Importar estudiantes
            </button>
          </div>

          {pesoMode === 'diferente' && (
            <div className="peso-summary" style={{ marginTop: '16px' }}>
              <span className={isPesoExacto ? 'peso-sum-ok' : isPesoExcedido ? 'peso-sum-err' : 'peso-sum-warn'}>
                {isPesoExacto 
                  ? `Los pesos suman exactamente ${pt} puntos`
                  : isPesoExcedido
                    ? `Los pesos suman ${pesoSumRounded.toFixed(4)} - deben sumar ${pt}`
                    : `Los pesos suman ${pesoSumRounded.toFixed(4)} - faltan ${(pt - pesoSumRounded).toFixed(4)} para llegar a ${pt}`}
              </span>
              <span style={{ color: 'var(--muted)', marginLeft: '16px' }}>
                Suma actual: <strong style={{ color: 'var(--text)' }}>{pesoSumRounded.toFixed(4)}</strong>
              </span>
              <button 
                className="btn-ghost" 
                onClick={() => {
                  resetPesos();
                  setToast({ message: 'Pesos restablecidos' });
                }}
                style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: '0.72rem' }}
              >
                Restablecer
              </button>
            </div>
          )}

          <div className="actions-row">
            <button className="btn btn-primary" onClick={handleContinuarPaso2}>Continuar</button>
            <button className="btn-ghost" onClick={() => setStep(1)} style={{ padding: '11px 20px' }}>Volver</button>
          </div>
        </div>
      </>
    );
  };

  const renderPaso3 = () => {
    const filteredEstudiantes = estudiantesNombres.map((nombre, idx) => ({ nombre, idx }))
      .filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const calificadosCount = estudiantesCalificados.filter(c => c).length;
    const todosCalificados = calificadosCount === numE;

    return (
      <div className="card" id="step3">
        <div className="card-title">Paso 3 - Respuestas de estudiantes</div>
        <div className="card-desc">Selecciona el estudiante y marca las opciones que elegio.</div>
        <div className="meta-banner">
          <span><strong>{evalMeta.nombre || '-'}</strong></span>
          <span>{numP} preguntas</span>
          <span>{numE} estudiantes</span>
        </div>

        <div className="draft-progress">
          <span>{calificadosCount}/{numE} calificados</span>
          <div className="draft-progress-bar-wrap">
            <div className="draft-progress-bar" style={{ width: `${(calificadosCount / numE) * 100}%` }} />
          </div>
        </div>

        <div className="student-search-wrap">
          <input
            type="text"
            id="studentSearch"
            className="student-search"
            placeholder="Buscar estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="student-nav">
          {filteredEstudiantes.map(({ nombre, idx }) => (
            <button
              key={idx}
              className={`stu-tab ${currentStudent === idx ? 'active' : ''} ${estudiantesCalificados[idx] ? 'graded' : ''}`}
              onClick={() => setCurrentStudent(idx)}
            >
              {nombre}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {Array.from({ length: numP }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentQuestion(i);
                setStudentResult(null);
              }}
              style={{
                width: '28px',
                height: '28px',
                border: currentQuestion === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '4px',
                background: estudiantesRespuestas[currentStudent]?.[i] ? 'var(--green)' : 'var(--bg)',
                color: estudiantesRespuestas[currentStudent]?.[i] ? '#000' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="answer-grid">
          {Array.from({ length: numP }, (_, i) => {
            const respuestaActual = estudiantesRespuestas[currentStudent]?.[i] || null;
            return (
              <div key={i} className="answer-item">
                <div className="q-num">Pregunta {i + 1}</div>
                <div className="options">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      className={`opt-btn ${respuestaActual === opt ? 'selected' : ''}`}
                      onClick={() => {
                        setEstudianteRespuesta(currentStudent, i, opt);
                        setEstudianteCalificado(currentStudent, true);
                        setStudentResult(null);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {studentResult && (
          <div className="result-card" style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div className="result-left" style={{ flex: '0 0 auto', minWidth: '120px' }}>
              <div className="nota-badge" style={{ fontSize: '2rem', color: studentResult.nota >= (appSettings.notaAprobacion || 3) ? 'var(--green)' : 'var(--red)' }}>
                {studentResult.nota.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px' }}>
                {studentResult.nota >= (appSettings.notaAprobacion || 3) ? 'Aprobado' : 'Reprobado'}
              </div>
            </div>
            <div className="result-right">
              <div className="result-legend">
                <span><span className="legend-dot" style={{ background: 'var(--green)' }}></span> Aciertos: <strong>{studentResult.aciertos}</strong></span>
                <span><span className="legend-dot" style={{ background: 'var(--red)' }}></span> Errores: <strong>{studentResult.errores}</strong></span>
                <span><span className="legend-dot" style={{ background: 'var(--accent2)' }}></span> Rendimiento: <strong>{studentResult.pct}%</strong></span>
              </div>
            </div>
          </div>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={() => {
            const resp = estudiantesRespuestas[currentStudent] || [];
            const aciertos = resp.filter((r, i) => r === claveRespuestas[i]).length;
            const errores = numP - aciertos;
            const pct = ((aciertos / numP) * 100).toFixed(0);
            const { notaMinima, notaMaxima } = parseSistemaCalif(sistemaCalif);
            const nota = (notaMinima + (aciertos * (notaMaxima - notaMinima) / numP)).toFixed(1);
            
            setStudentResult({
              nota: parseFloat(nota),
              aciertos,
              errores,
              pct: parseInt(pct),
            });
          }}
          style={{ marginBottom: '16px' }}
        >
          Calificar estudiante actual
        </button>

        <div className="actions-row">
          <button 
            className={todosCalificados ? "btn btn-success" : "btn btn-primary"} 
            disabled={!todosCalificados}
            onClick={() => setStep(4)}
            style={{ opacity: todosCalificados ? 1 : 0.5 }}
          >
            {todosCalificados ? "Ver resumen" : "Continuar"}
          </button>
          {!todosCalificados && (
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '8px' }}>
              Faltan {numE - calificadosCount} estudiante(s) por calificar
            </span>
          )}
          <button className="btn-ghost" onClick={() => setStep(2)} style={{ padding: '11px 20px' }}>Volver</button>
        </div>
      </div>
    );
  };

  const renderPaso4 = () => {
    const notaAprob = appSettings.notaAprobacion || 3;
    const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);

    return (
      <div className="card" id="step4">
        <div className="card-title">Paso 4 - Resumen general</div>
        <div className="card-desc">Resultados de todos los estudiantes.</div>
        <div className="meta-banner">
          <span><strong>{evalMeta.nombre || '-'}</strong></span>
          <span>{numP} preguntas</span>
          <span>{numE} estudiantes</span>
          <span>Escala: {notaMinima}-{notaMaxima}</span>
        </div>

        <table className="summary-table">
          <thead>
            <tr>
              <th>#</th><th>Estudiante</th><th>Aciertos</th><th>Errores</th><th>Nota</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {estudiantesNombres.map((nombre, idx) => {
              const resp = estudiantesRespuestas[idx] || [];
              const aciertos = resp.filter((r, i) => r === claveRespuestas[i]).length;
              const errores = numP - aciertos;
              const nota = (notaMinima + (aciertos * (notaMaxima - notaMinima) / numP)).toFixed(1);
              const aprobado = parseFloat(nota) >= notaAprob;

              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{nombre}</td>
                  <td style={{ color: 'var(--green)' }}>{aciertos}</td>
                  <td style={{ color: 'var(--red)' }}>{errores}</td>
                  <td>{nota}</td>
                  <td>
                    <span className={`tag ${aprobado ? 'tag-green' : 'tag-red'}`}>
                      {aprobado ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="actions-row">
          <button className="btn btn-primary" onClick={async () => {
            const result = await saveEvaluacion();
            if (result.success) {
              setToast({ message: 'Evaluacion guardada' });
            } else {
              setToast({ message: result.msg, isError: true });
            }
          }}>Guardar evaluacion</button>
          <button className="btn btn-secondary" onClick={() => setStep(3)}>Volver a calificar</button>
          <button className="btn-ghost" onClick={() => {
            resetState();
            setStep(1);
          }}>Nueva evaluacion</button>
        </div>
      </div>
    );
  };

  return (
    <main>
      {step === 1 && renderPaso1()}
      {step === 2 && renderPaso2()}
      {step === 3 && renderPaso3()}
      {step === 4 && renderPaso4()}
    </main>
  );
}
