export function bindHtmlEvents() {
  document.getElementById('navNueva').onclick = () => window.showView('app');
  document.getElementById('navHist').onclick = () => window.showView('historial');
  document.getElementById('navSettings').onclick = () => window.abrirModalSettings();

  document.getElementById('rsmBackBtn').onclick = () => window.showView('historial');
  document.getElementById('rsmExportBtn').onclick = () => window.exportarCSV();
  document.getElementById('rsmPdfBtn').onclick = () => window.exportarPDF();

  document.getElementById('btnPesoIgual').onclick = () => window.setPesoMode('igual');
  document.getElementById('btnPesoDif').onclick = () => window.setPesoMode('diferente');
  document.getElementById('btnCalif1').onclick = () => window.setSistemaCalif('1');
  document.getElementById('btnCalif0').onclick = () => window.setSistemaCalif('0');
  document.getElementById('califMaxSelect').onchange = () => window.updateSistemaCalifFromDropdown();

  document.getElementById('step1ContinueBtn').onclick = () => window.irPaso2();
  document.getElementById('step2ContinueBtn').onclick = () => window.irPaso3();
  document.getElementById('step2BackBtn').onclick = () => window.setStep(1);
  document.getElementById('step4SaveBtn').onclick = () => window.guardarEvaluacion();
  document.getElementById('step4PdfBtn').onclick = () => window.exportarPDF();
  document.getElementById('step4NewBtn').onclick = () => window.reiniciar();

  document.getElementById('modalDet').onclick = (e) => window.cerrarModalDet(e);
  document.getElementById('modalDetCloseBtn').onclick = () => window.cerrarModalDet();

  document.getElementById('recoveryContinueBtn').onclick = () => window.recuperarBorrador();
  document.getElementById('recoveryDiscardBtn').onclick = () => window.descartarBorrador();

  document.getElementById('modalBorrarCancelBtn').onclick = () => window.cerrarModal();
  document.getElementById('modalBorrarConfirmBtn').onclick = () => window.confirmarBorrar();

  document.getElementById('modalSettingsCancelBtn').onclick = () => window.cerrarModalSettings();
  document.getElementById('modalSettingsSaveBtn').onclick = () => window.guardarSettings();

  document.getElementById('importCsvInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await window.importarEvaluacion(file);
    } catch (err) {
      window.toast('Error al importar: ' + err.message, true);
    }
    e.target.value = '';
  };

  document.getElementById('importStudentsBtn').onclick = () => {
    const state = window.getState();
    const nombresActuales = state.estudiantesNombres.join('\n');
    document.getElementById('importStudentsTextarea').value = nombresActuales;
    document.getElementById('modalImportStudents').classList.remove('hidden');
  };

  document.getElementById('importStudentsCancelBtn').onclick = () => {
    document.getElementById('modalImportStudents').classList.add('hidden');
  };

  document.getElementById('importStudentsApplyBtn').onclick = () => {
    const texto = document.getElementById('importStudentsTextarea').value;
    window.importarEstudiantes(texto);
    document.getElementById('modalImportStudents').classList.add('hidden');
  };
}
