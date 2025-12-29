import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MedicalReportData, InsuranceProvider } from '../types/insurance';

/**
 * SERVICIO DE MAPEO Y LLENADO DE PDFs (CALIBRADO V2)
 * -----------------------------------------------------
 * Coordenadas ajustadas visualmente basadas en las capturas de pantalla reales.
 * Origen (0,0) = Esquina Inferior Izquierda.
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
    switch (provider) {
      case 'GNP': return this.fillGNPForm(data);
      case 'AXA': return this.fillAXAForm(data);
      case 'METLIFE': return this.fillMetLifeForm(data);
      default: throw new Error(`Proveedor no soportado: ${provider}`);
    }
  },

  // ---------------------------------------------------------
  // 1. GNP (Calibrado con image_8ab4e8.png)
  // ---------------------------------------------------------
  async fillGNPForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('gnp_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    const nameParts = data.patientName.split(" ");
    const apPaterno = nameParts[0] || "";
    const apMaterno = nameParts[1] || "";
    const nombres = nameParts.slice(2).join(" ");

    // --- DATOS DEL PACIENTE (Tabla Superior Azul) ---
    // Ajuste Y: Bajamos de 580 a ~640 (GNP tiene el header muy grande)
    // Coordenadas estimadas para caer dentro de los cuadros blancos
    page1.drawText(apPaterno, { x: 35, y: 645, size: fontSize, font }); // Apellido P
    page1.drawText(apMaterno, { x: 200, y: 645, size: fontSize, font }); // Apellido M
    page1.drawText(nombres, { x: 380, y: 645, size: fontSize, font }); // Nombres

    // Fecha Nacimiento (Derecha)
    page1.drawText(data.age.toString(), { x: 550, y: 645, size: fontSize, font }); 

    // Sexo (M/F) - Bajamos un poco
    if (data.gender === 'M') {
        page1.drawText('X', { x: 35, y: 615, size: 12, font }); 
    } else {
        page1.drawText('X', { x: 65, y: 615, size: 12, font }); 
    }

    // --- PADECIMIENTO ACTUAL (Cuadro Grande Inferior) ---
    // En tu imagen, el texto caía en "Antecedentes". 
    // El cuadro "Padecimiento actual" está mucho más abajo, casi al pie de página.
    page1.drawText(data.clinicalSummary, {
        x: 35,
        y: 220, // Bajamos drásticamente la altura
        size: 8,
        font,
        maxWidth: 530,
        lineHeight: 10
    });

    // Diagnóstico (Pie de página)
    page1.drawText(`${data.diagnosis} (CIE: ${data.icd10})`, {
        x: 35,
        y: 100, 
        size: 9,
        font
    });

    return await pdfDoc.save();
  },

  // ---------------------------------------------------------
  // 2. AXA (Calibrado con image_8ab583.png)
  // ---------------------------------------------------------
  async fillAXAForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('axa_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0]; 
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 9;

    const nameParts = data.patientName.split(" ");
    
    // --- DATOS DEL PACIENTE ---
    // En tu imagen "Mariana" salía flotando en las instrucciones.
    // El cuadro azul "Datos del Asegurado" empieza aprox a 1/4 de página.
    const rowY = 575; // Altura de la fila de nombres

    page1.drawText(nameParts[0] || "", { x: 35, y: rowY, size: fontSize, font }); // Ap. Paterno
    page1.drawText(nameParts[1] || "", { x: 200, y: rowY, size: fontSize, font }); // Ap. Materno
    page1.drawText(nameParts.slice(2).join(" "), { x: 370, y: rowY, size: fontSize, font }); // Nombres

    // Edad y Fecha (Fila siguiente, más abajo)
    page1.drawText(data.age.toString(), { x: 35, y: 545, size: fontSize, font });

    // --- ANTECEDENTES (Tabla inferior) ---
    // AXA es estricto con las cajas.
    // Escribiremos el resumen clínico en el área blanca grande si existe, 
    // o en "Padecimiento Actual" que suele estar en la Página 2.
    
    if (pages.length > 1) {
        const page2 = pages[1];
        // Cuadro "Padecimiento actual" en Pag 2 (Tope de página)
        page2.drawText(data.clinicalSummary, {
            x: 35,
            y: 700,
            size: 8,
            font,
            maxWidth: 540,
            lineHeight: 10
        });
        
        // Diagnóstico en Pag 2
        page2.drawText(data.diagnosis, { x: 35, y: 520, size: 9, font });
        page2.drawText(data.icd10, { x: 450, y: 520, size: 9, font });
    } else {
        // Fallback si solo hay 1 página: escribir en margen inferior
        page1.drawText("Ver anexo para detalle clínico.", { x: 35, y: 100, size: 8, font });
    }

    return await pdfDoc.save();
  },

  // ---------------------------------------------------------
  // 3. MetLife (Calibrado con image_8ab8a7.png)
  // ---------------------------------------------------------
   async fillMetLifeForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('metlife_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // --- DATOS DEL PACIENTE ---
    // En tu imagen, "Mariana" salía en el título. Bajamos al recuadro gris.
    // El campo "Nombre completo" es una línea larga.
    page1.drawText(data.patientName, { x: 130, y: 610, size: 10, font }); 

    // Fecha (Día/Mes/Año a la derecha)
    const today = new Date();
    page1.drawText(today.getDate().toString(), { x: 450, y: 640, size: 10, font });

    // --- PADECIMIENTO ACTUAL ---
    // MetLife tiene "Antecedentes" (Sección 2) y "Padecimiento" (Sección 3, usualmente pag 2).
    
    // Escribimos un resumen breve en "Historia clínica breve" (Sección 2, fondo blanco)
    page1.drawText(data.clinicalSummary.substring(0, 400), {
        x: 35,
        y: 430, // Altura media-baja
        size: 8,
        font,
        maxWidth: 530,
        lineHeight: 10
    });

    // Si hay página 2 (Padecimiento Actual)
    if (pages.length > 1) {
        const page2 = pages[1];
        page2.drawText(data.clinicalSummary, {
            x: 35, y: 700, size: 8, font, maxWidth: 530, lineHeight: 10
        });
    }

    return await pdfDoc.save();
  }
};