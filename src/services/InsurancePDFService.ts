import { PDFDocument } from 'pdf-lib';
import { MedicalReportData, InsuranceProvider } from '../types/insurance';

/**
 * SERVICIO DE LLENADO DE PDFs (MÉTODO ACROFORMS - DEFINITIVO)
 * -----------------------------------------------------------
 * Este servicio busca campos nombrados dentro del PDF y los rellena.
 * Requisito: Los PDFs en /public/forms/ deben haber sido editados previamente
 * para incluir campos de texto con los nombres específicos (IDs).
 */

export const InsurancePDFService = {

  async loadPDFTemplate(filename: string): Promise<ArrayBuffer> {
    try {
      const url = `/forms/${filename}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No se pudo cargar el formato PDF: ${url}`);
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error cargando template PDF:", error);
      throw error;
    }
  },

  async generateReport(provider: InsuranceProvider, data: MedicalReportData): Promise<Uint8Array> {
    
    // 1. Seleccionar archivo según proveedor
    let filename = '';
    switch (provider) {
      case 'GNP': filename = 'gnp_informe_medico.pdf'; break;
      case 'AXA': filename = 'axa_informe_medico.pdf'; break;
      case 'METLIFE': filename = 'metlife_informe_medico.pdf'; break;
      default: throw new Error(`Proveedor no soportado: ${provider}`);
    }

    // 2. Cargar y procesar
    const formBytes = await this.loadPDFTemplate(filename);
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    try {
      // --- MAPEO DE CAMPOS UNIVERSALES ---
      // Intentamos llenar los campos estándar. Si un PDF no tiene alguno, 
      // el catch capturará el error silenciosamente y seguirá.

      // A. Datos del Paciente
      this.safeFill(form, 'paciente_nombre', data.patientName);
      this.safeFill(form, 'paciente_edad', data.age.toString());
      
      // Sexo (Lógica de Checkbox o Texto)
      if (data.gender === 'M') {
          this.safeCheck(form, 'check_masculino'); 
          // Fallback por si es campo de texto
          this.safeFill(form, 'sexo', 'Masculino'); 
      } else {
          this.safeCheck(form, 'check_femenino');
          this.safeFill(form, 'sexo', 'Femenino');
      }

      // B. Datos Clínicos
      this.safeFill(form, 'diagnostico', `${data.diagnosis} (CIE-10: ${data.icd10})`);
      this.safeFill(form, 'cie10', data.icd10);
      this.safeFill(form, 'fecha_inicio', data.symptomsStartDate);
      
      // Resumen Clínico (Padecimiento Actual)
      this.safeFill(form, 'resumen_clinico', data.clinicalSummary);

      // C. Fechas
      const today = new Date().toLocaleDateString('es-MX');
      this.safeFill(form, 'fecha_actual', today);

    } catch (e) {
      console.warn("Advertencia durante el llenado de campos:", e);
    }

    // 3. Aplanar formulario (opcional: convierte los campos en texto fijo no editable)
    // form.flatten(); 

    return await pdfDoc.save();
  },

  /**
   * Helper para llenar texto sin romper la app si el campo no existe en el PDF
   */
  safeFill(form: any, fieldName: string, value: string) {
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(value);
      }
    } catch (e) {
      // El campo no existe en este PDF específico, lo ignoramos.
      // console.log(`Campo opcional no encontrado: ${fieldName}`);
    }
  },

  /**
   * Helper para marcar casillas (Checkboxes)
   */
  safeCheck(form: any, checkboxName: string) {
    try {
      const field = form.getCheckBox(checkboxName);
      if (field) {
        field.check();
      }
    } catch (e) {
      // Checkbox no encontrado
    }
  }
};