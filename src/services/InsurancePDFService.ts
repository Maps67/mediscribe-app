import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MedicalReportData, InsuranceProvider } from '../types/insurance';

/**
 * SERVICIO DE MAPEO Y LLENADO DE PDFs PARA ASEGURADORAS
 * -----------------------------------------------------
 * Este servicio carga los templates PDF planos desde /public/forms/
 * y "dibuja" el texto encima usando coordenadas (X, Y).
 * * NOTA: El origen (0,0) en PDFs suele ser la esquina INFERIOR izquierda.
 * Por eso, valores altos de Y (ej. 700) están arriba, y bajos (ej. 100) están abajo.
 */

export const InsurancePDFService = {

  /**
   * Carga un archivo PDF desde la carpeta pública
   */
  async loadPDFTemplate(filename: string): Promise<ArrayBuffer> {
    try {
      // Ajustamos la ruta para que busque en la raíz del servidor público
      const url = `/forms/${filename}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No se pudo cargar el formato PDF: ${url}`);
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error cargando template PDF:", error);
      throw error;
    }
  },

  /**
   * Generador Maestro: Decide qué función de llenado usar según la aseguradora
   */
  async generateReport(provider: InsuranceProvider, data: MedicalReportData): Promise<Uint8Array> {
    switch (provider) {
      case 'GNP':
        return this.fillGNPForm(data);
      case 'AXA':
        return this.fillAXAForm(data);
      case 'METLIFE':
        return this.fillMetLifeForm(data);
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  },

  /**
   * MAPEO: GNP (Informe Médico Inicial)
   * Archivo: gnp_informe_medico.pdf
   */
  async fillGNPForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('gnp_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0]; // GNP Pide datos en Página 1
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 9;
    const color = rgb(0, 0, 0); // Negro

    // --- COORDENADAS APROXIMADAS GNP ---
    
    // 1. Nombre del Paciente (Apellido P, Apellido M, Nombres)
    // El formato GNP separa apellidos. Haremos un split simple.
    const nameParts = data.patientName.split(" ");
    const lastNameP = nameParts[0] || "";
    const lastNameM = nameParts[1] || "";
    const names = nameParts.slice(2).join(" ") || nameParts.slice(1).join(" "); // Fallback

    page1.drawText(lastNameP, { x: 35, y: 580, size: fontSize, font: font, color });
    page1.drawText(lastNameM, { x: 180, y: 580, size: fontSize, font: font, color });
    page1.drawText(names, { x: 330, y: 580, size: fontSize, font: font, color });

    // 2. Género (Checkboxes manuales - Dibujamos una X)
    if (data.gender === 'M') {
       page1.drawText('X', { x: 485, y: 580, size: 12, font: boldFont, color });
    } else {
       page1.drawText('X', { x: 515, y: 580, size: 12, font: boldFont, color });
    }

    // 3. Edad
    page1.drawText(data.age.toString(), { x: 550, y: 580, size: fontSize, font: font, color });

    // 4. Padecimiento Actual (Resumen Clínico) - Área Grande
    // GNP suele tener un área grande a la mitad.
    page1.drawText(data.clinicalSummary, {
        x: 35,
        y: 400, // Altura media
        size: 8,
        font: font,
        color,
        maxWidth: 520, // Ancho de la página menos márgenes
        lineHeight: 10
    });

    // 5. Diagnóstico y CIE-10
    page1.drawText(`${data.diagnosis} (CIE-10: ${data.icd10})`, {
        x: 35,
        y: 200, // Parte inferior
        size: fontSize,
        font: boldFont,
        color
    });

    // 6. Fecha de Inicio de Síntomas
    page1.drawText(data.symptomsStartDate, { x: 450, y: 450, size: fontSize, font: font, color });

    return await pdfDoc.save();
  },

  /**
   * MAPEO: AXA (Informe Médico)
   * Archivo: axa_informe_medico.pdf
   */
  async fillAXAForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('axa_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0]; 
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    // --- COORDENADAS APROXIMADAS AXA ---
    // AXA suele pedir Apellidos primero en lista vertical

    // Apellido Paterno
    const nameParts = data.patientName.split(" ");
    page1.drawText(nameParts[0] || "", { x: 150, y: 635, size: fontSize, font });
    // Apellido Materno
    page1.drawText(nameParts[1] || "", { x: 350, y: 635, size: fontSize, font });
    // Nombre
    page1.drawText(nameParts.slice(2).join(" "), { x: 150, y: 615, size: fontSize, font });

    // Fecha Nacimiento (Ejemplo de posición)
    page1.drawText(data.age.toString(), { x: 500, y: 615, size: fontSize, font });

    // Padecimiento Actual (Suele estar en la página 2 en AXA, pero pondremos algo en la 1 por seguridad)
    // Nota: AXA es multipágina. Si el campo está en la pag 2:
    if (pages.length > 1) {
        const page2 = pages[1];
        page2.drawText(data.clinicalSummary, {
            x: 40, y: 700, size: 8, font, maxWidth: 500, lineHeight: 10
        });
        
        // Diagnóstico en pag 2
        page2.drawText(data.diagnosis, { x: 40, y: 550, size: 10, font });
        page2.drawText(data.icd10, { x: 40, y: 530, size: 10, font });
    }

    return await pdfDoc.save();
  },

   /**
   * MAPEO: MetLife (Informe Médico)
   * Archivo: metlife_informe_medico.pdf
   */
   async fillMetLifeForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('metlife_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // MetLife suele pedir "Nombre Completo" en una sola línea
    page1.drawText(data.patientName, { x: 130, y: 675, size: 10, font });

    // Fecha
    const today = new Date();
    page1.drawText(today.getDate().toString(), { x: 450, y: 675, size: 10, font }); // Día
    
    // Antecedentes (Sección grande abajo)
    page1.drawText(data.clinicalSummary, {
        x: 40, y: 450, size: 9, font, maxWidth: 520, lineHeight: 11
    });

    return await pdfDoc.save();
  }
};