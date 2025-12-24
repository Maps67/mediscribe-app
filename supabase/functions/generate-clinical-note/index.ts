// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 SUPABASE EDGE: RAW HTTP MODE (NO SDK) - GEMINI 3 PRIORITY");

// 🛡️ LISTA DE COMBATE (High IQ Only) - ORDEN EXACTO
const MODELS_TO_TRY = [
  "gemini-3-flash-preview",   // 1. TU PRIORIDAD
  "gemini-2.0-flash-exp",     // 2. LÍDER TÉCNICO
  "gemini-1.5-flash-002",     // 3. RESPALDO SÓLIDO
  "gemini-1.5-pro-002"        // 4. RESPALDO PESADO
];

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener API Key
    const API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
    if (!API_KEY) throw new Error("CRITICAL: API Key no encontrada en Secrets.");

    // 2. Parsear Body
    const reqBody = await req.json();
    let prompt = reqBody.prompt;

    // Fallback de compatibilidad
    if (!prompt) {
        const transcript = reqBody.transcript || "";
        const patientHistory = reqBody.patientHistory || "";
        const specialty = reqBody.specialty || "Medicina General";
        prompt = `ACTÚA COMO: ${specialty}. TRANSCRIPCIÓN: "${transcript}". HISTORIAL: "${patientHistory}". Genera JSON clínico.`;
    }

    if (!prompt) throw new Error("Prompt vacío.");

    let successfulResponse = null;
    let lastErrorDetails = "";

    // 3. BUCLE DE FAILOVER (HTTP PURO)
    console.log("🧠 Iniciando secuencia Raw HTTP...");

    for (const modelName of MODELS_TO_TRY) {
      console.log(`Trying model via Fetch: ${modelName}`);

      try {
        // CONEXIÓN DIRECTA SIN LIBRERÍAS (Evita el Error 500 de incompatibilidad)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }, // Formato Snake Case para API REST
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Si la respuesta no es OK (ej. 404 Modelo no existe, 400 Bad Request)
        if (!response.ok) {
            const errorData = await response.text();
            console.warn(`⚠️ Fallo HTTP en ${modelName} (${response.status}):`, errorData);
            lastErrorDetails = `Model ${modelName} status ${response.status}: ${errorData}`;
            continue; // Intentar siguiente modelo
        }

        const data = await response.json();
        
        // Verificar si hay candidatos válidos
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
             successfulResponse = data.candidates[0].content.parts[0].text;
             console.log(`✅ ¡Éxito con ${modelName}!`);
             break; // Éxito total
        } else {
             console.warn(`⚠️ Respuesta vacía de ${modelName}:`, JSON.stringify(data));
        }

      } catch (err) {
        console.warn(`⚠️ Error de red en ${modelName}:`, err);
        lastErrorDetails = err.toString();
      }
    }

    if (!successfulResponse) {
      // Si llegamos aquí, ES POSIBLE QUE LA LLAVE ESTÉ MAL O NINGÚN MODELO EXISTA
      throw new Error(`Todos los modelos fallaron. Último error: ${lastErrorDetails}`);
    }

    // 4. Limpieza y Respuesta
    let clean = successfulResponse.replace(/```json/g, '').replace(/```/g, '');
    const firstCurly = clean.indexOf('{');
    const lastCurly = clean.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
        clean = clean.substring(firstCurly, lastCurly + 1);
    }

    return new Response(JSON.stringify({ text: clean }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO:", error);
    // Devolvemos el error real al frontend para que sepas si es la llave
    return new Response(JSON.stringify({ 
        error: error.message, 
        hint: "Si dice 400/403 es la Llave. Si dice 500 es el Código." 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Mantenemos 500 para que el frontend use su fallback, pero con info real en logs
    });
  }
});