export function bindHtmlEvents() {
  document.getElementById('navNueva').onclick = () => window.showView('app');
  document.getElementById('navHist').onclick = () => window.showView('historial');
  document.getElementById('navSettings').onclick = () => window.abrirModalSettings();

  document.getElementById('rsmBackBtn').onclick = () => window.showView('historial');
  document.getElementById('rsmExportBtn').onclick = () => window.exportarCSV();

  document.getElementById('btnPesoIgual').onclick = () => window.setPesoMode('igual');
  document.getElementById('btnPesoDif').onclick = () => window.setPesoMode('diferente');
  document.getElementById('btnCalif1a5').onclick = () => window.setSistemaCalif('1a5');
  document.getElementById('btnCalif0a5').onclick = () => window.setSistemaCalif('0a5');

  document.getElementById('step1ContinueBtn').onclick = () => window.irPaso2();
  document.getElementById('step2ContinueBtn').onclick = () => window.irPaso3();
  document.getElementById('step2BackBtn').onclick = () => window.setStep(1);
  document.getElementById('step4SaveBtn').onclick = () => window.guardarEvaluacion();
  document.getElementById('step4NewBtn').onclick = () => window.reiniciar();

  document.getElementById('modalDet').onclick = (e) => window.cerrarModalDet(e);
  document.getElementById('modalDetCloseBtn').onclick = () => window.cerrarModalDet();

  document.getElementById('recoveryContinueBtn').onclick = () => window.recuperarBorrador();
  document.getElementById('recoveryDiscardBtn').onclick = () => window.descartarBorrador();

  document.getElementById('modalBorrarCancelBtn').onclick = () => window.cerrarModal();
  document.getElementById('modalBorrarConfirmBtn').onclick = () => window.confirmarBorrar();

  document.getElementById('modalSettingsCancelBtn').onclick = () => window.cerrarModalSettings();
  document.getElementById('modalSettingsSaveBtn').onclick = () => window.guardarSettings();
}
