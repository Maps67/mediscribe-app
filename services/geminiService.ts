import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';

// Helper for audio encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp the value to -1 to 1 before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * SECURITY: PII Sanitization Function
 * Removes identifiers before sending text to the LLM to comply with HIPAA/NOM-024 minimization principles.
 */
function sanitizeContent(text: string): string {
  let clean = text;
  
  // 1. Redact Phone Numbers (generic 10 digits or common formats)
  clean = clean.replace(/\b\d{10}\b/g, '[TELÉFONO]');
  clean = clean.replace(/\b(\d{2,3}[-\s]){1,3}\d{4}\b/g, '[TELÉFONO]');
  
  // 2. Redact Emails
  clean = clean.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, '[EMAIL]');
  
  // 3. Redact common introduction patterns (heuristic for names)
  clean = clean.replace(/(soy|llamo|nombre es)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+)(\s+[A-ZÁÉÍÓÚ][a-zñáéíóú]+)?/gi, '$1 [NOMBRE_PACIENTE]');
  
  // 4. Redact specific IDs (CURP/RFC format approximation)
  clean = clean.replace(/[A-Z]{4}\d{6}[H,M][A-Z]{5}\d{2}/g, '[CURP]');
  
  return clean;
}

export class GeminiMedicalService {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;

  constructor() {
    // CORRECCIÓN CRÍTICA: Usar import.meta.env para Vite
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("CRITICAL SECURITY ERROR: VITE_GEMINI_API_KEY is missing.");
      throw new Error("API Key no encontrada. Revisa tu configuración en Netlify.");
    }
    
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a structured SOAP note from a raw transcript or summary
   * Automatically sanitizes input before sending to cloud.
   */
  async generateMedicalRecord(transcript: string) {
    try {
      // Security: Sanitize input
      const safeTranscript = sanitizeContent(transcript);

      // CORRECCIÓN: Usamos gemini-1.5-flash que es la versión estable actual
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash', 
        contents: `Act as an expert medical scribe. Review the following consultation transcript and generate a structured SOAP note (Subjective, Objective, Assessment, Plan).
        
        TRANSCRIPT (Anonymized):
        ${safeTranscript}
        
        Return the response in JSON format.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjective: { type: Type.STRING },
              objective: { type: Type.STRING },
              assessment: { type: Type.STRING },
              plan: { type: Type.STRING },
              prescriptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    duration: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      });
      
      // Manejo seguro del parseo JSON
      const textResponse = response.text ? response.text() : '{}';
      return JSON.parse(textResponse);

    } catch (error) {
      console.error("Error generating record:", error);
      throw error;
    }
  }

  /**
   * Generates a friendly WhatsApp message for the patient
   */
  async generatePatientMessage(record: any, patientName: string) {
    const response = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Based on the following medical plan, write a friendly, clear, and professional WhatsApp message in Spanish. 
      Include a summary of the treatment and the list of medications with instructions. Use emojis sparingly.
      
      PLAN: ${record.plan}
      PRESCRIPTIONS: ${JSON.stringify(record.prescriptions)}`,
    });
    return response.text ? response.text() : "";
  }

  /**
   * Allows the doctor to ask specific questions about the current consultation context
   */
  async askClinicalQuestion(transcript: string, question: string) {
    try {
      const safeTranscript = sanitizeContent(transcript);
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are a helpful AI Medical Assistant assisting a doctor during a consultation.
        
        CONTEXT (Anonymized Transcript):
        "${safeTranscript}"
        
        DOCTOR'S QUESTION:
        "${question}"
        
        INSTRUCTIONS:
        Answer the question briefly and accurately based strictly on the transcript provided. 
        If the information is not in the transcript, state that it was not mentioned.`,
      });
      return response.text ? response.text() : "";
    } catch (error) {
      console.error("Error answering clinical question:", error);
      return "Lo siento, no pude procesar la pregunta en este momento.";
    }
  }

  /**
   * Generates a concise summary of the consultation
   */
  async generateConsultationSummary(transcript: string) {
    try {
      const safeTranscript = sanitizeContent(transcript);
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Provide a concise summary (max 3-4 sentences) of the following medical consultation transcript in Spanish. Focus on the reason for visit, key symptoms, and diagnosis if mentioned.
        
        TRANSCRIPT (Anonymized):
        ${safeTranscript}`,
      });
      return response.text ? response.text() : "";
    } catch (error) {
      console.error("Error generating summary:", error);
      return null;
    }
  }

  /**
   * Connects to Gemini Live for real-time assistance/transcription
   */
  async connectLiveSession(
    onTranscript: (text: string) => void,
    onStatusChange: (status: string) => void
  ) {
    try {
      onStatusChange('connecting');
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inputNode = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.0-flash-exp', // Usamos el modelo experimental para Live que sí soporta audio
        callbacks: {
          onopen: () => {
            onStatusChange('connected');
            if (!this.processor || !this.inputAudioContext) return;
            
            this.processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            inputNode.connect(this.processor);
            this.processor.connect(this.inputAudioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                onTranscript("AI: " + message.serverContent.modelTurn.parts[0].text + "\n");
            }
            if (message.serverContent?.inputTranscription?.text) {
                 onTranscript("Doctor/Patient: " + message.serverContent.inputTranscription.text + "\n");
            }
          },
          onclose: () => {
            onStatusChange('idle');
          },
          onerror: (err) => {
            console.error(err);
            onStatusChange('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are an assistant medical scribe. Do not record names or PII if you can avoid it. Focus on medical facts.",
        }
      });
      
      this.session = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      onStatusChange('error');
    }
  }

  async disconnect() {
    if (this.session) {
        // Cleanup session logic
        // Nota: El SDK actual puede no tener un método close explícito expuesto igual en todas las versiones, 
        // pero detenemos el audio.
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
  }
}
