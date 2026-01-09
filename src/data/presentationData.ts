// Importamos las interfaces desde donde las tengas definidas (ej. ../types/presentation o en el mismo archivo si es un archivo único)
import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA
  {
    id: "slide1",
    type: "hero",
    title: "IA Clínica Contextual",
    subtitle: "Protocolo de Investigación:",
    content: "Informe sobre la Arquitectura de Inteligencia Adaptativa y Blindaje Legal para el Mercado Mexicano (v5.2).",
    meta: { gradient: "from-sky-500 to-indigo-600" }
  },
  
  // SLIDE 2: EL PROBLEMA (CRISIS)
  {
    id: "slide2",
    type: "split",
    title: "La Crisis de 'Inercia Clínica'",
    content: [
      "Fatiga de Decisión: Los ECE actuales son pasivos y obligan al médico a recordar todo el historial de memoria.",
      "Arranque en Frío: El médico tarda 3-5 min en 'reconstruir' mentalmente al paciente antes de saludar.",
      "Ceguera de Especialidad: Los sistemas genéricos no filtran ruido clínico irrelevante.",
      "Riesgo Legal: La prisa lleva a notas escuetas que incumplen la NOM-004."
    ],
    image: "/img/doctor-stress.png"
  },

  // SLIDE 3: LA SOLUCIÓN (OPERATIVA)
  {
    id: "slide3",
    type: "split",
    title: "Inteligencia Operativa v5.2",
    content: [
      "Infraestructura Viva: No es un chatbot, es un sistema que protege tu práctica en tiempo real.",
      "UX Móvil Blindada: Estrategia de contención visual para operar con una mano sin perder contexto.",
      "Protocolo Fail-Safe: Si la IA falla o la red cae, la interfaz no colapsa. Continuidad garantizada."
    ],
    image: "/img/interface.png"
  },

  // SLIDE 4: MOTOR HÍBRIDO
  {
    id: "slide4",
    type: "grid",
    title: "Motor Híbrido: Velocidad + Razonamiento",
    content: "Arquitectura de doble capa utilizando Gemini Flash 2.0 para inmediatez y modelos Pro para profundidad.",
    items: [
      { iconName: "Mic", title: "1. Escucha Activa", text: "Captura de voz de alta fidelidad con Wake Lock y reconexión automática." },
      { iconName: "Brain", title: "2. Inferencia Contextual", text: "Procesa audio + historial previo simultáneamente. No alucina datos, los correlaciona." },
      { iconName: "FileText", title: "3. Estructura Legal", text: "Entrega JSON estricto: Notas SOAP, Recetas separadas y Auditoría en < 3 seg." }
    ]
  },

  // SLIDE 5: FEATURES v5.2 (ACTUALIZADO CON RAG)
  {
    id: "slide5",
    type: "grid",
    title: "Capacidades de la Versión 5.2",
    content: "Nuevas herramientas de inteligencia adaptativa y soporte clínico.",
    items: [
      { iconName: "Activity", title: "Vital Snapshot", text: "Elimina el 'arranque en frío'. Tarjeta amarilla que resume alertas y pendientes en 5 segundos." },
      { iconName: "Eye", title: "Lente de Especialidad", text: "Inteligencia Adaptativa. Filtra datos irrelevantes según tu especialidad (ej. Cardio vs Psique)." },
      { iconName: "Pill", title: "Recetas Deterministas", text: "Seguridad total. Clasifica acciones obligatorias: NUEVO, CONTINUAR, SUSPENDER y AJUSTAR." },
      { iconName: "Library", title: "Evidencia Clínica (RAG)", text: "Tu copiloto clínico. Sugiere activamente Guías de Práctica Clínica (CENETEC) y bibliografía en tiempo real." }
    ]
  },

  // SLIDE 6: MATRIZ DE IMPACTO
  {
    id: "slide6",
    type: "grid",
    title: "Matriz de Impacto Operativo",
    content: "Transformamos la fricción administrativa en fluidez clínica.",
    items: [
      { 
        iconName: "AlertTriangle", 
        title: "Práctica Convencional", 
        text: "Registro lento obligatorio antes de atender. Notas 'Copy-Paste' con alto riesgo legal." 
      },
      { 
        iconName: "Zap", 
        title: "Con VitalScribe v5.2", 
        text: "Lazy Registration (atiende primero, registra después). Notas dinámicas generadas desde cero." 
      }
    ]
  },

  // SLIDE 7: ARQUITECTURA TÉCNICA
  {
    id: "slide7",
    type: "split",
    title: "Soberanía Tecnológica",
    content: [
      "Supabase Edge Functions: Procesamiento seguro en la nube. Tus llaves API nunca tocan el dispositivo.",
      "Row Level Security (RLS): Aislamiento total de datos a nivel base de datos.",
      "Offline-First Real: Funciona en zonas rurales o sótanos de hospital sin señal."
    ],
    image: "/img/security.png"
  },

  // SLIDE 8: REGULACIONES
  {
    id: "slide8",
    type: "grid",
    title: "Blindaje Regulatorio Mexicano",
    content: "Cumplimiento normativo automático integrado en el flujo.",
    items: [
      { iconName: "Scale", title: "NOM-004-SSA3", text: "Estructura SOAP obligatoria y validación de campos críticos antes de guardar." },
      { iconName: "Network", title: "CIE-10 Automático", text: "Codificación diagnóstica internacional automática para reportes." },
      { iconName: "Lock", title: "Consentimiento Digital", text: "Módulo de Consentimiento Informado integrado para protección legal." }
    ]
  },

  // SLIDE 9: GESTIÓN DE SEGUROS
  {
    id: "slide9",
    type: "split",
    title: "Central de Trámites Médicos",
    content: [
      "Adiós a la Burocracia: VitalScribe entiende que la medicina privada depende de los seguros.",
      "Formatos Oficiales: GNP, AXA, MetLife pre-llenados con la información de la consulta.",
      "Memoria de Siniestros: Rastrea números de póliza y siniestro automáticamente entre citas."
    ],
    image: "/img/interface.png" // Placeholder
  },

  // SLIDE 10: FINANCIERO Y LEGAL
  {
    id: "slide10",
    type: "grid",
    title: "Rentabilidad y Protección",
    content: "Herramientas de negocio para la práctica privada moderna.",
    items: [
      { iconName: "Calculator", title: "Calculadora de Honorarios", text: "Desglose automático para equipos quirúrgicos. Claridad total en cobros Tabulador vs. Privado." },
      { iconName: "ShieldCheck", title: "Evidencia Histórica", text: "Registro inmutable de la evolución. Tu mejor defensa ante disputas de aseguradoras por 'preexistencias'." }
    ]
  },

  // SLIDE 11: CIERRE
  {
    id: "slide11",
    type: "hero",
    title: "Curar sin distracciones.",
    subtitle: "La Evolución Necesaria",
    content: "VitalScribe AI devuelve al médico su propósito principal. Bienvenido al futuro.",
    meta: { gradient: "from-sky-500 to-indigo-600" }
  }
];