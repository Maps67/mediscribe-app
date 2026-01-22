// FUERZA DE ACTUALIZACION: VITALSCRIBE v6.0 - [23/12/2025]
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: MEDICINE AI - FINAL RECOVERY [SCHEMA BLINDED]");

// TU LISTA EXACTA
const MODELS_TO_TRY = [
  "gemini-3-flash-preview", 
  "gemini-2.5-flash", 
  "gemini-1.5-flash-002", 
  "gemini-1.5-pro-002"
];

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API Key
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) {
      throw new Error("CRITICAL: API Key no encontrada en Secrets.");
    }

    // 2. Parsear y VALIDAR entrada
    const reqBody = await req.json();
    let prompt = reqBody.prompt;
    
    // Extracción de parámetros de control
    const useTools = reqBody.useTools || false;
    const jsonMode = reqBody.jsonMode !== false; // Default a true si no se especifica

    // Si no hay prompt directo, buscamos transcript
    // AQUI ES DONDE APLICAMOS EL BLINDAJE ESTRUCTURAL
    if (!prompt) {
        const transcript = reqBody.transcript || ""; // Si es undefined, usa ""
        if (!transcript.trim()) {
           throw new Error("La transcripción está vacía.");
        }
        
        // Construcción segura del prompt (Protocolo VitalScribe v5.4)
        const specialty = reqBody.specialty || "Medicina General";
        const history = reqBody.patientHistory || "No disponible";

        prompt = `
          ROL: Eres un médico especialista en ${specialty}. Redacta con terminología clínica precisa.
          
          ENTRADA:
          - Transcripción de la consulta: "${transcript}"
          - Historial previo: "${history}"

          INSTRUCCIONES:
          Genera una estructura JSON válida que coincida con la interfaz del sistema. 
          No incluyas bloques de código markdown (\`\`\`json), solo el objeto raw.

          ESTRUCTURA JSON REQUERIDA:
          {
            "clinicalNote": "Nota clínica narrativa completa, profesional y detallada.",
            "soapData": {
              "subjective": "Resumen detallado de síntomas y motivo de consulta (S)",
              "objective": "Hallazgos físicos, signos vitales y observaciones (O)",
              "analysis": "Razonamiento clínico, diagnóstico presuntivo y diagnósticos diferenciales (A)",
              "plan": "Plan farmacológico, estudios solicitados y recomendaciones (P)"
            },
            "patientInstructions": "Explicación clara y empática dirigida al paciente sobre su tratamiento",
            "risk_analysis": {
              "level": "Elegir uno: Bajo, Medio, o Alto",
              "reason": "Justificación clínica breve del nivel de riesgo asignado"
            }
          }
        `;
    }

    // 3. Ejecución Segura (Sin librerías externas)
    let successfulResponse = null;
    let lastError = "";

    console.log(`🧠 Iniciando secuencia... [Tools: ${useTools ? 'ON' : 'OFF'}]`);

    for (const modelName of MODELS_TO_TRY) {
      try {
        console.log(`Trying: ${modelName}`);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        // Construcción Dinámica del Payload
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            // Si usamos tools (Chat) o jsonMode es false, usamos text/plain. Si no, forzamos JSON.
            response_mime_type: (useTools || !jsonMode) ? "text/plain" : "application/json" 
          }
        };

        // Inyección de Google Search si se solicita
        if (useTools) {
          payload.tools = [{ google_search: {} }];
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
           const errText = await response.text();
           console.warn(`⚠️ Fallo ${modelName}: ${errText}`);
           lastError = errText;
           continue; 
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
             successfulResponse = data.candidates[0].content.parts[0].text;
             break; // Éxito
        }

      } catch (e) {
        console.warn(`Error red ${modelName}:`, e);
      }
    }

    if (!successfulResponse) {
      throw new Error(`Todos los modelos fallaron. Último error: ${lastError}`);
    }

    // 4. Limpieza y Retorno
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    
    // Solo aplicamos recorte estricto de JSON si NO estamos en modo Tools/Chat
    if (!useTools && jsonMode) {
        const firstCurly = clean.indexOf('{');
        const lastCurly = clean.lastIndexOf('}');
        if (firstCurly !== -1 && lastCurly !== -1) {
            clean = clean.substring(firstCurly, lastCurly + 1);
        }
    }

    return new Response(JSON.stringify({ text: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
// FORCE DEPLOY