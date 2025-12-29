import { InsuranceProvider, MedicalReportData } from '../types/insurance';

/**
 * SERVICIO DE GESTIÓN DE PDFs (MODO DESCARGA DIRECTA)
 * ---------------------------------------------------
 * Estrategia Simplificada:
 * En lugar de intentar escribir sobre el PDF (lo cual causa desalineación),
 * este servicio simplemente busca el archivo oficial en el servidor
 * y se lo entrega al médico para que él lo llene manualmente.
 */

export const InsurancePDFService = {

  /**
   * Generador Maestro: Simplemente carga y devuelve el archivo limpio.
   */
  async generateReport(provider: InsuranceProvider, _data: MedicalReportData): Promise<Uint8Array> {
    
    // 1. Seleccionar archivo según proveedor
    let filename = '';
    switch (provider) {
      case 'GNP': filename = 'gnp_informe_medico.pdf'; break;
      case 'AXA': filename = 'axa_informe_medico.pdf'; break;
      case 'METLIFE': filename = 'metlife_informe_medico.pdf'; break;
      default: throw new Error(`Proveedor no soportado: ${provider}`);
    }

    try {
      // 2. Buscar el archivo en la carpeta pública
      const url = `/forms/${filename}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`No se encontró el formato: ${filename}. Asegúrate de que esté en la carpeta public/forms/`);
      }

      // 3. Devolver el archivo tal cual (sin editar)
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);

    } catch (error) {
      console.error("Error al descargar el template:", error);
      throw error;
    }
  }
};