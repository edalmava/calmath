import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import NuevaEvaluacion from './pages/NuevaEvaluacion';
import Historial from './pages/Historial';
import Resumen from './pages/Resumen';
import './styles.css';

function SettingsModal({ isOpen, onClose }) {
  const { sistemaCalif, setSistemaCalif, appSettings, setAppSettings, saveSettings, setToast } = useAppStore();
  const [localSettings, setLocalSettings] = React.useState({
    sistemaCalif: sistemaCalif,
    notaMaxima: appSettings.notaMaxima,
    notaAprobacion: appSettings.notaAprobacion,
  });

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        sistemaCalif: sistemaCalif,
        notaMaxima: appSettings.notaMaxima,
        notaAprobacion: appSettings.notaAprobacion,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const notaAprob = localSettings.notaAprobacion;
    if (isNaN(notaAprob) || notaAprob < 0 || notaAprob > localSettings.notaMaxima) {
      setToast({ message: `Nota de aprobación debe estar entre 0 y ${localSettings.notaMaxima}`, isError: true });
      return; 
    }
    
    // Construir sistemaCalif correctamente: "1a10" o "0a10"
    const inicio = localSettings.sistemaCalif.startsWith('0') ? '0' : '1';
    const sistemaCalif = `${inicio}a${localSettings.notaMaxima}`;

    setSistemaCalif(sistemaCalif);
    setAppSettings({ 
      sistemaCalif: sistemaCalif,
      notaMaxima: localSettings.notaMaxima, 
      notaAprobacion: notaAprob 
    });
    await saveSettings();
    setToast({ message: 'Configuración guardada' });
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title" style={{ color: 'var(--accent)' }}>Configuracion</div>
        <div className="modal-body">
          <div className="form-field" style={{ marginBottom: '18px' }}>
            <label>Sistema de calificacion por defecto</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <select
                value={localSettings.sistemaCalif?.startsWith('0') ? '0' : '1'}
                onChange={(e) => setLocalSettings({ ...localSettings, sistemaCalif: e.target.value + 'a' + localSettings.notaMaxima })}
                style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="1">Desde 1</option>
                <option value="0">Desde 0</option>
              </select>
              <span style={{ alignSelf: 'center' }}>hasta</span>
              <select
                value={localSettings.notaMaxima || 5}
                onChange={(e) => setLocalSettings({ ...localSettings, notaMaxima: parseInt(e.target.value) })}
                style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px' }}>Sistema utilizado por defecto al crear una nueva evaluación</div>
          </div>
          <div className="form-field">
            <label>Nota de aprobación</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="3.0"
              value={localSettings.notaAprobacion || ''}
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                const num = parseFloat(val);
                setLocalSettings({ 
                  ...localSettings, 
                  notaAprobacion: num 
                });
              }}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--text)',
                width: '100%',
              }}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px' }}>Nota mínima para aprobar (por defecto: 3)</div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} style={{ padding: '9px 20px' }}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} style={{ padding: '9px 20px' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const navigate = useNavigate();
  const { step, setStep, setCurrentView, currentView, resetState, initFromSettings } = useAppStore();
  const [showSettings, setShowSettings] = React.useState(false);

  const goToNueva = () => {
    setCurrentView('nueva');
    resetState();
    initFromSettings();
    setStep(1);
    navigate('/');
  };

  const goToHistorial = () => {
    setCurrentView('historial');
    navigate('/historial');
  };

  return (
    <>
      <header>
        <div className="logo">EvalMath</div>
        <div className="header-sub">Gestor de Evaluaciones ICFES</div>
        <div className="header-actions">
          <button className={`btn-ghost ${currentView === 'nueva' ? 'active-nav' : ''}`} onClick={goToNueva}>+ Nueva</button>
          <button className={`btn-ghost ${currentView === 'historial' ? 'active-nav' : ''}`} onClick={goToHistorial}>Historial</button>
          <button className="btn-ghost" onClick={() => setShowSettings(true)}>Configuracion</button>
          <div className="step-indicator" id="stepIndicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 4 ? 'active' : ''}`}></div>
          </div>
        </div>
      </header>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

function Toast({ message, isError }) {
  return (
    <div className="toast" style={{ borderColor: isError ? 'var(--red)' : 'var(--green)', color: isError ? 'var(--red)' : 'var(--green)' }}>
      {message}
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const { toast, setToast, initFromSettings, hasValidDraft, recoverDraft, deleteDraft, setStep, setCurrentView, resetState } = useAppStore();
  const [toastMsg, setToastMsg] = React.useState(null);
  const [showDraftModal, setShowDraftModal] = React.useState(false);
  const [draftChecked, setDraftChecked] = React.useState(false);

  React.useEffect(() => {
    initFromSettings();
  }, []);

  React.useEffect(() => {
    if (toast) {
      setToastMsg(toast);
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  React.useEffect(() => {
    if (draftChecked) return;
    setDraftChecked(true);
    
    const checkDraft = async () => {
      const hasDraft = await hasValidDraft();
      if (hasDraft) {
        setShowDraftModal(true);
      }
    };
    checkDraft();
  }, [draftChecked, hasValidDraft]);

  const handleRecoverDraft = async () => {
    await recoverDraft();
    setShowDraftModal(false);
    setCurrentView('nueva');
    navigate('/');
  };

  const handleDiscardDraft = async () => {
    await deleteDraft();
    setShowDraftModal(false);
  };

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<NuevaEvaluacion />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/evaluacion/:id" element={<Resumen />} />
      </Routes>
      {toastMsg && <Toast message={toastMsg.message} isError={toastMsg.isError} />}
      {showDraftModal && (
        <div className="modal-bg">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title" style={{ color: 'var(--accent)' }}>Borrador encontrado</div>
            <div className="modal-body">
              <p>Encontramos un borrador de evaluación. ¿Deseas continuar editando?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={handleDiscardDraft} style={{ padding: '9px 20px' }}>Descartar</button>
              <button className="btn btn-primary" onClick={handleRecoverDraft} style={{ padding: '9px 20px' }}>Continuar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Main() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
