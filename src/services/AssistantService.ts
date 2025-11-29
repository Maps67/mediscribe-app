import { geminiAgent, AgentResponse } from './GeminiAgent';

/**
 * SERVICIO PÚBLICO:
 * La UI llama a este servicio. Este servicio llama al Agente.
 */
export const AssistantService = {
  
  async processCommand(transcript: string): Promise<AgentResponse> {
    // Validaciones básicas antes de gastar tokens de IA
    if (!transcript || transcript.trim().length < 2) {
      return {
        intent: 'UNKNOWN',
        originalText: transcript,
        confidence: 0,
        message: "No escuché nada."
      };
    }

    // Delegamos la inteligencia al Agente Central
    return await geminiAgent.processCommand(transcript);
  }
};