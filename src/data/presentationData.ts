// src/data/presentationData.ts
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
      "Los ECE actuales son pasivos. Obligan al médico a recordar todo el historial.",
      "Arranque en Frío: El médico tarda 3-5 min en 'reconstruir' al paciente.",
      "Ceguera de Especialidad: Los sistemas genéricos no filtran ruido clínico.",
      "Riesgo Legal: La prisa lleva a notas escuetas que incumplen la NOM-004."
    ],
    image: "/img/doctor-stress.png" // Asegúrate de tener esta imagen o cámbiala
  },

  // SLIDE 3: LA SOLUCIÓN (OPERATIVA)
  {
    id: "slide3",
    type: "split",
    title: "Inteligencia Operativa v5.2",
    content: [
      "No es un chatbot. Es una infraestructura clínica viva.",
      "UX Móvil Blindada: Opera con una mano sin perder contexto.",
      "Protocolo Fail-Safe: Si la IA falla, la interfaz no colapsa."
    ],
    image: "/img/interface.png"
  },

  // SLIDE 4: MOTOR HÍBRIDO
  {
    id: "slide4",
    type: "grid",
    title: "Motor Híbrido: Velocidad + Razonamiento",
    content: "Arquitectura de doble capa utilizando Gemini Flash 2.0 para inmediatez.",
    items: [
      { iconName: "Mic", title: "1. Escucha Activa", text: "Captura de voz de alta fidelidad con Wake Lock." },
      { iconName: "Brain", title: "2. Inferencia Contextual", text: "Procesa audio + historial previo simultáneamente." },
      { iconName: "FileText", title: "3. Estructura Legal", text: "Entrega JSON estricto: Notas SOAP y Recetas." }
    ]
  },

  // SLIDE 5: FEATURES v5.2
  {
    id: "slide5",
    type: "grid",
    title: "Capacidades de la Versión 5.2",
    content: "Nuevas herramientas de inteligencia adaptativa.",
    items: [
      { iconName: "Activity", title: "Vital Snapshot", text: "Tarjeta amarilla que resume alertas y pendientes en 5 segundos." },
      { iconName: "Eye", title: "Lente de Especialidad", text: "Filtra datos irrelevantes según tu especialidad (ej. Cardio vs Psique)." },
      { iconName: "Pill", title: "Recetas Deterministas", text: "Clasifica: NUEVO, CONTINUAR, SUSPENDER y AJUSTAR." },
      { iconName: "ShieldAlert", title: "Auditoría Real", text: "Detecta riesgos legales (NOM-004) mientras dictas." }
    ]
  },

  // SLIDE 6: MATRIZ DE IMPACTO (La comparativa)
  {
    id: "slide6",
    type: "grid",
    title: "Matriz de Impacto Operativo",
    content: "Transformamos la fricción administrativa en fluidez clínica.",
    items: [
      { 
        iconName: "AlertTriangle", 
        title: "Práctica Convencional", 
        text: "Registro lento antes de atender. Notas 'Copy-Paste' con riesgo legal." 
      },
      { 
        iconName: "Zap", 
        title: "Con VitalScribe v5.2", 
        text: "Lazy Registration (atiende primero). Notas dinámicas generadas desde cero." 
      }
    ]
  },

  // SLIDE 7: ARQUITECTURA TÉCNICA
  {
    id: "slide7",
    type: "split",
    title: "Soberanía Tecnológica",
    content: [
      "Supabase Edge Functions: Tus llaves API nunca tocan el dispositivo.",
      "Row Level Security (RLS): Aislamiento total de datos entre médicos.",
      "Offline-First: Funciona en sótanos de hospital sin señal."
    ],
    image: "/img/security.png"
  },

  // SLIDE 8: REGULACIONES
  {
    id: "slide8",
    type: "grid",
    title: "Blindaje Regulatorio Mexicano",
    content: "Cumplimiento normativo automático.",
    items: [
      { iconName: "Scale", title: "NOM-004-SSA3", text: "Valida campos críticos obligatorios antes de guardar." },
      { iconName: "Network", title: "CIE-10 Automático", text: "Codificación diagnóstica internacional para reportes." },
      { iconName: "Lock", title: "Consentimiento", text: "Módulo de Consentimiento Informado integrado." }
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