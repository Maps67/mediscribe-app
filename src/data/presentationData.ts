import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA
  {
    id: "intro",
    type: "hero",
    title: "VitalScribe AI v5.4",
    subtitle: "Protocolo Omni-Sentinel:",
    content: "Certificación de Arquitectura CDSS (Clinical Decision Support System) y Blindaje Legal Activo para el Mercado Mexicano.",
    image: "/img/slides/hero_shield.png", 
    meta: { gradient: "from-teal-600 to-slate-900" }
  },
  
  // SLIDE 2: EL PROBLEMA (Riesgo Legal y Clínico)
  {
    id: "problem",
    type: "split",
    title: "La Crisis de Seguridad Clínica",
    content: [
      "Fatiga de Alertas: Los ECE actuales son pasivos; no detienen el error, solo lo documentan.",
      "Arranque en Frío (Riesgo): 5 minutos perdidos 'reconstruyendo' al paciente mentalmente aumentan la probabilidad de omisión.",
      "Vulnerabilidad Legal: Notas escuetas por prisa que violan la NOM-004 y dejan indefenso al médico.",
      "Fuga de Datos: Sistemas web estándar sin aislamiento real entre consultorios."
    ],
    image: "/img/slides/doctor_risk.png"
  },

  // SLIDE 3: LA SOLUCIÓN (Active Safety Firewall)
  {
    id: "solution",
    type: "split",
    title: "Inteligencia Operativa v5.4",
    content: [
      "No es un Chatbot, es un Firewall: El sistema posee autoridad de bloqueo ante interacciones medicamentosas graves.",
      "UX de Contención Visual: Diseño que prioriza alertas de 'Semáforo Rojo' antes de permitir la prescripción.",
      "Protocolo Fail-Safe: Si la red cae, el 'Core' local mantiene la encriptación y el guardado. Continuidad operativa absoluta."
    ],
    image: "/img/slides/firewall_ui.png"
  },

  // SLIDE 4: MOTOR HÍBRIDO (El Cerebro)
  {
    id: "engine",
    type: "grid",
    title: "Motor de Validación Cruzada",
    content: "Arquitectura de doble capa: Gemini 1.5 Pro (Razonamiento) + Motor de Reglas Rígidas (Seguridad).",
    items: [
      { iconName: "Mic", title: "1. Escucha Activa & Sucia", text: "Filtra ruido ambiental y separa interlocutores. Wake Lock activo para sesiones de +40min." },
      { iconName: "Shield", title: "2. Triangulación de Seguridad", text: "Cruza orden verbal vs. TFG (Fisiológico) vs. Alergias (Histórico) en <200ms." },
      { iconName: "FileText", title: "3. Salida Estructurada", text: "Genera JSON estricto. La nota no es texto plano, es data auditable." }
    ]
  },

  // SLIDE 5: FEATURES v5.4 (CORREGIDO: GRID 3x2 SIMÉTRICO)
  {
    id: "features",
    type: "grid",
    title: "Ecosistema Omni-Sentinel",
    content: "Seis pilares de defensa activa integrados en el flujo clínico.",
    items: [
      // FILA 1
      { 
        iconName: "Activity", 
        title: "Vital Snapshot 360°", 
        text: "Análisis inmediato al abrir expediente: Evolución, Banderas Rojas y Auditoría Farmacológica en <3 segundos." 
      },
      { 
        iconName: "Users", 
        title: "Citizen Language Patch", 
        text: "Traducción empática simultánea. Genera instrucciones legibles para el paciente mientras crea la nota técnica." 
      },
      { 
        iconName: "Lock", 
        title: "Recetas Deterministas", 
        text: "Sanitización automática de documentos. Expurga fármacos de alto riesgo en la impresión al paciente." 
      },
      // FILA 2 (Nuevos elementos para eliminar el espacio en blanco)
      { 
        iconName: "Library", 
        title: "RAG Híbrido", 
        text: "Memoria Clínica Profunda. El sistema 'recuerda' antecedentes de hace 5 años para sugerir diagnósticos complejos." 
      },
      { 
        iconName: "ShieldCheck", 
        title: "Blindaje RLS Nativo", 
        text: "Aislamiento Forense. Bloqueo a nivel motor de base de datos; es imposible acceder a pacientes ajenos." 
      },
      { 
        iconName: "WifiOff", 
        title: "Core Offline-First", 
        text: "Resiliencia Total. La encriptación funciona sin internet (zonas rurales/sótanos) y sincroniza al volver." 
      }
    ]
  },

  // SLIDE 6: MATRIZ DE IMPACTO
  {
    id: "impact",
    type: "grid",
    title: "Matriz de Impacto Operativo",
    content: "De la burocracia defensiva a la medicina de precisión.",
    items: [
      { 
        iconName: "AlertTriangle", 
        title: "Práctica Convencional", 
        text: "Registro reactivo. El médico escribe para defenderse, perdiendo contacto visual. Error humano latente." 
      },
      { 
        iconName: "Zap", 
        title: "Con VitalScribe v5.4", 
        text: "Lazy Registration & Protección Activa. La IA sugiere, el médico valida, el sistema bloquea el peligro." 
      }
    ]
  },

  // SLIDE 7: ARQUITECTURA TÉCNICA (El Blindaje)
  {
    id: "tech",
    type: "split",
    title: "Soberanía Tecnológica & RLS",
    content: [
      "Row Level Security (RLS): Aislamiento criptográfico a nivel motor de base de datos. Matemáticamente imposible ver pacientes ajenos.",
      "Supabase Edge Functions: La lógica crítica corre en entorno seguro, nunca en el dispositivo cliente.",
      "Offline-First Real: Arquitectura PWA militarizada para operar en zonas rurales sin comprometer datos."
    ],
    image: "/img/slides/db_lock.png"
  },

  // SLIDE 8: REGULACIONES (Legal)
  {
    id: "legal",
    type: "grid",
    title: "Blindaje Regulatorio (NOM-004)",
    content: "Cumplimiento normativo forzoso por diseño.",
    items: [
      { iconName: "Scale", title: "Integridad SOAP", text: "Valida campos subjetivos y objetivos antes de permitir el cierre de nota." },
      { iconName: "Fingerprint", title: "Firma Forense", text: "Bitácora inmutable. Las correcciones manuales quedan registradas como la 'verdad jurídica'." },
      { iconName: "FileCheck", title: "Consentimiento Digital", text: "Módulo integrado de firma de consentimiento informado." }
    ]
  },

  // SLIDE 9: GESTIÓN DE SEGUROS (CORREGIDO: Disponibilidad de formatos)
  {
    id: "insurance",
    type: "split",
    title: "Interoperabilidad Financiera",
    content: [
      "Codificación CIE-10 Automática: El sistema traduce 'dolor de panza' a 'R10.4' para evitar rechazos de aseguradoras.",
      "Formatos Oficiales Digitalizados: Biblioteca de formatos (GNP, AXA, MetLife) disponibles para que el médico vacíe los datos reales de la nota en tiempo real.",
      "Memoria de Siniestros: Rastreo automático de números de póliza entre sesiones."
    ],
    image: "/img/slides/insurance_form.png"
  },

  // SLIDE 10: RENTABILIDAD
  {
    id: "financial",
    type: "grid",
    title: "Gestión de Práctica Privada",
    content: "Herramientas de negocio para la sustentabilidad del consultorio.",
    items: [
      { iconName: "Calculator", title: "Calculadora Quirúrgica", text: "Desglose automático de honorarios para equipos médicos. Transparencia total." },
      { iconName: "Database", title: "Soberanía de Datos", text: "Exportación masiva (JSON/Excel). El expediente es propiedad del médico, no de la plataforma." }
    ]
  },

  // SLIDE 11: CIERRE
  {
    id: "closing",
    type: "hero",
    title: "Medicina Protegida.",
    subtitle: "El Estándar v5.4",
    content: "VitalScribe AI no solo documenta; defiende su criterio y protege a su paciente.",
    meta: { gradient: "from-teal-600 to-blue-900" }
  }
];