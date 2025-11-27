import { GeminiResponse, FollowUpMessage, MedicationItem } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Falta la VITE_GEMINI_API_KEY en el archivo .env");
  // toast.error("Error de configuración: Falta API Key"); // No podemos usar toast aquí directamente sin un proveedor
}

// INTERFAZ INTERNA PARA ESTRUCTURA SOAP (SOLO PARA ESTE SERVICIO)
interface SOAPStructure {
    headers: {
        date: string;
        time: string;
        patientName?: string;
        patientAge?: string;
        patientGender?: string;
    };
    subjective: string;
    objective: string;
    analysis: string;
    plan: string;
}

export const GeminiMedicalService = {

  // 1. AUTO-DESCUBRIMIENTO (Radar de Modelos)
  async getBestAvailableModel(): Promise<string> {
    try {
      // Intentamos usar un modelo Flash rápido y económico primero
      return "gemini-1.5-flash";
      
      // NOTA TÉCNICA: El auto-descubrimiento dinámico se ha deshabilitado temporalmente
      // para garantizar estabilidad y velocidad usando el modelo Flash directamente.
      /*
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
      const response = await fetch(listUrl);
      if (!response.ok) return "gemini-pro";
      const data = await response.json();
      const validModels = (data.models || []).filter((m: any) => 
        m.supportedGenerationMethods?.includes("generateContent")
      );
      if (validModels.length === 0) return "gemini-pro";
      // Priorizar modelos "flash" por velocidad y costo, luego "pro"
      const flashModel = validModels.find((m: any) => m.name.includes("flash") && !m.name.includes("vision"));
      if (flashModel) return flashModel.name.replace('models/', '');
      const proModel = validModels.find((m: any) => m.name.includes("pro") && !m.name.includes("vision"));
      if (proModel) return proModel.name.replace('models/', '');
      
      return validModels[0].name.replace('models/', '');
      */
    } catch (error) {
      console.warn("Fallo en selección de modelo, usando fallback.");
      return "gemini-pro";
    }
  },

  // 2. GENERAR NOTA SOAP ESTRUCTURADA (NUEVO CEREBRO)
  async generateClinicalNote(transcript: string, specialty: string = "Medicina General", patientHistory: string = ""): Promise<GeminiResponse> {
    try {
      const modelName = await this.getBestAvailableModel();
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

      // OBTENER FECHA Y HORA ACTUALES AUTOMÁTICAMENTE
      const now = new Date();
      const currentDate = now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const currentTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      // --- PROMPT ESTRUCTURADO PROFESIONAL (V4) ---
      const prompt = `
        ACTÚA COMO: Un Médico Escribano de Élite y Auditor Clínico, especializado en ${specialty.toUpperCase()}.
        TU OBJETIVO: Analizar el dictado y generar una Nota Clínica SOAP ESTRUCTURADA y PROFESIONAL.

        DATOS DE ENTRADA:
        - FECHA REAL: ${currentDate}
        - HORA REAL: ${currentTime}
        - HISTORIAL PREVIO (Resumen): "${patientHistory || 'Sin historial previo.'}"
        - DICTADO ACTUAL (Audio transcrito): "${transcript}"

        REGLAS DE ORO PARA EL CONTENIDO:
        1.  **PROFESIONALISMO ABSOLUTO:** Usa terminología médica precisa de ${specialty}. Evita lenguaje coloquial.
        2.  **PROTOCOL "DYNAMIC SCRIBE" (VERDAD):** Si un dato vital (TA, FC, Temp, Peso, Talla) NO se menciona en el dictado, NO lo inventes. Simplemente OMÍTELO de la sección Objetiva. No pongas "[No reportado]" repetitivamente, simplemente no lo listes.
        3.  **INTEGRACIÓN EVOLUTIVA:** Si existe historial previo, relaciónalo en el 'Subjetivo' y 'Análisis' (ej. "Paciente persiste con...", "Cuadro agudizado respecto a...").
        4.  **LIMPIEZA:** El output de cada sección (S, O, A, P) debe ser texto plano limpio, sin markdown (sin negritas **, sin títulos ###), listo para ser insertado en una interfaz gráfica profesional. Usa listas con guiones (-) si es necesario dentro de una sección.

        FORMATO DE SALIDA ESPERADO (SOLO JSON VÁLIDO, SIN MARKDOWN ADICIONAL):
        {
          "soapData": {
            "headers": {
                "date": "${currentDate}",
                "time": "${currentTime}",
                "patientName": "Extraer del dictado si es posible, o null",
                "patientAge": "Extraer si es posible, o null",
                "patientGender": "Extraer si es posible, o null"
            },
            "subjective": "Texto limpio del padecimiento actual y antecedentes relevantes...",
            "objective": "Texto limpio con hallazgos físicos y signos vitales SOLO SI FUERON DICTADOS...",
            "analysis": "Texto limpio con razonamiento clínico y diagnósticos presuntivos...",
            "plan": "Texto limpio con plan terapéutico, estudios solicitados y seguimiento..."
          },
          "patientInstructions": "Instrucciones claras y empáticas dirigidas al paciente (lenguaje sencillo) para impresión/WhatsApp.",
          "actionItems": {
             "next_appointment": "YYYY-MM-DD" o null (si se menciona),
             "urgent_referral": boolean (true si requiere derivación urgente),
             "lab_tests_required": ["Lista de estudios", "si se solicitaron"]
          }
        }
      `;

      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
              temperature: 0.2, // Temperatura baja para mayor precisión médica
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048, 
          }
        })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error Gemini API: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      // Limpieza robusta del JSON response
      const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJsonText);

      // Adaptador para mantener compatibilidad con la interfaz GeminiResponse existente
      // La interfaz visual se encargará de usar 'soapData' si existe.
      return {
          ...parsedData,
          // Mantenemos clinicalNote como fallback de texto plano por seguridad, aunque usaremos soapData
          clinicalNote: `FECHA: ${parsedData.soapData.headers.date} | HORA: ${parsedData.soapData.headers.time}\n\nS:\n${parsedData.soapData.subjective}\n\nO:\n${parsedData.soapData.objective}\n\nA:\n${parsedData.soapData.analysis}\n\nP:\n${parsedData.soapData.plan}`
      } as GeminiResponse;

    } catch (error) {
      console.error("Error CRÍTICO en GeminiMedicalService:", error);
      throw error; // Re-lanzar para que el componente lo maneje
    }
  },

  // --- (LAS SIGUIENTES FUNCIONES SE MANTIENEN IGUAL POR AHORA) ---
  async generateFollowUpPlan(patientName: string, clinicalNote: string, instructions: string): Promise<FollowUpMessage[]> {
    return []; 
  },

  async generatePrescriptionOnly(transcript: string): Promise<string> {
     try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `Actúa como médico. Genera SOLAMENTE el texto de una receta médica formal basada en este dictado: "${transcript}". No incluyas introducciones ni explicaciones, solo la receta.`;
        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error al generar receta.";
     } catch (e) { throw e; }
  },

  async chatWithContext(context: string, userMessage: string): Promise<string> {
    try {
        const modelName = await this.getBestAvailableModel();
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        const prompt = `CONTEXTO CLÍNICO: ${context}. \n\nPREGUNTA DEL USUARIO: "${userMessage}". \n\nRESPUESTA (Breve, profesional y basada SOLO en el contexto):`;
        const response = await fetch(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error("Error Chat");
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude generar una respuesta.";
    } catch (error) { throw error; }
  },

  async generateQuickRxJSON(transcript: string, patientName: string): Promise<MedicationItem[]> {
    try {
       const modelName = await this.getBestAvailableModel();
       const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
       const prompt = `ACTÚA COMO: Farmacéutico experto. TAREA: Extraer datos estructurados de medicamentos del siguiente dictado para el paciente "${patientName}".\nDICTADO: "${transcript}"\nFORMATO DE SALIDA: Un array JSON estrictamente. Ejemplo: [{"drug":"Nombre", "details":"Dosis/Forma", "frequency":"Cada X horas", "duration":"X días", "notes":"Instrucciones adicionales"}]. Si no hay medicamentos, devuelve []. SOLO JSON.`;
       const response = await fetch(URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
       });
       if (!response.ok) return [];
       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
       const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
       return JSON.parse(cleanJson);
    } catch (e) { 
        console.error("Error parsing QuickRx JSON", e);
        return []; 
    }
 }
};