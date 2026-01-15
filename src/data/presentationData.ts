import { SlideData } from '../types/presentation'; 

export const presentationData: SlideData[] = [
  // SLIDE 1: PORTADA (HERO)
  // Actualización: Elevación de versión y definición de "Sistema Operativo".
  {
    id: "intro",
    type: "hero",
    title: "VitalScribe AI v7.9",
    subtitle: "Arquitectura Omni-Sentinel:",
    content: "Más que un expediente: Un Sistema Operativo Clínico con Firewall Farmacológico Activo y Blindaje Legal (NOM-004/HIPAA).",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070", 
    meta: { gradient: "from-teal-600 to-slate-900" }
  },
  
  // SLIDE 2: EL PROBLEMA (SPLIT)
  // Actualización: Enfoque en el "Doble Riesgo" (Clínico + Legal) detectado en las pruebas.
  {
    id: "problem",
    type: "split",
    title: "La Trampa de la Doble Mortalidad",
    content: [
      "Ceguera Cognitiva: Bajo presión, el médico omite contraindicaciones cruzadas (ej. Renal + AINEs), causando iatrogenia.",
      "Arranque en Frío: 5 minutos perdidos 'reconstruyendo' al paciente mentalmente aumentan la probabilidad de error diagnóstico.",
      "Indefensión Jurídica: Notas incompletas que no cumplen la NOM-004, dejando al profesional expuesto ante COFEPRIS y demandas.",
      "Fuga de Datos Cruzada: Sistemas web tradicionales sin aislamiento real (RLS) entre consultorios."
    ],
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=2032"
  },

  // SLIDE 3: LA SOLUCIÓN (SPLIT)
  // Actualización: Concepto de "Poder de Veto" y seguridad activa.
  {
    id: "solution",
    type: "split",
    title: "Firewall Clínico Activo",
    content: [
      "Autoridad de Bloqueo: El sistema no solo sugiere; veta activamente prescripciones letales (Triangulación: Fisiológica, Absoluta e Histórica).",
      "UX de Contención Visual: Diseño de 'Semáforo Clínico' que intercepta el error humano antes de que llegue a la receta.",
      "Protocolo Fail-Safe: Arquitectura resiliente que protege la encriptación y el guardado incluso ante fallas de red crítica."
    ],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 4: MOTOR HÍBRIDO (GRID)
  // Actualización: Inclusión del NLP de alta entropía (Prueba "Don Ramiro").
  {
    id: "engine",
    type: "grid",
    title: "Motor de Validación Cruzada",
    content: "Inteligencia Artificial con RAG Híbrido + Reglas de Seguridad Rígidas.",
    items: [
      { iconName: "Mic", title: "1. Escucha de Alta Entropía", text: "Procesamiento de 'Diálogo Sucio'. Filtra ruido, separa interlocutores y extrae datos numéricos dispersos en sesiones de +40min." },
      { iconName: "Shield", title: "2. Triangulación en <200ms", text: "Auditoría en tiempo real: Cruza Orden Verbal vs. Tasa de Filtrado Glomerular vs. Alergias Históricas." },
      { iconName: "FileText", title: "3. Salida Forense", text: "Generación de JSON estricto. La nota no es texto plano, es data estructurada y auditable legalmente." }
    ]
  },

  // SLIDE 5: FEATURES (GRID)
  // Actualización: Alineación con el Manifiesto v2026.
  {
    id: "features",
    type: "grid",
    title: "Ecosistema Omni-Sentinel",
    content: "Seis pilares de defensa activa validados en pruebas de estrés clínico.",
    items: [
      { 
        iconName: "Activity", 
        title: "Vital Snapshot", 
        text: "Fin del arranque en frío. Tarjeta visual inmediata con Banderas Rojas y Alertas de Pendientes al abrir el expediente." 
      },
      { 
        iconName: "Users", 
        title: "Citizen Language Patch", 
        text: "Humanización automática. Traduce términos técnicos (ej. 'Ortopnea') a lenguaje coloquial ('Falta de aire al acostarse') para el paciente." 
      },
      { 
        iconName: "Lock", 
        title: "Sanitización Documental", 
        text: "Seguridad de Salida. El PDF para el paciente expurga automáticamente fármacos bloqueados o de uso intrahospitalario para evitar confusiones." 
      },
      { 
        iconName: "Library", 
        title: "Lógica de 2do Orden", 
        text: "Razonamiento Clínico Avanzado. Entiende temporalidad, prioriza síntomas graves sobre signos engañosos y maneja ambigüedad." 
      },
      { 
        iconName: "ShieldCheck", 
        title: "Blindaje RLS (SQL)", 
        text: "Aislamiento Matemático. Row Level Security nativo en base de datos; hace técnicamente imposible el acceso cruzado a expedientes." 
      },
      { 
        iconName: "WifiOff", 
        title: "Core Offline-First", 
        text: "Soberanía Operativa. Funcionalidad total en zonas rurales o sótanos hospitalarios, con sincronización encriptada posterior." 
      }
    ]
  },

  // SLIDE 6: IMPACTO (GRID)
  {
    id: "impact",
    type: "grid",
    title: "Matriz de Impacto Operativo",
    content: "Transformando la consulta: De la defensa burocrática a la precisión clínica.",
    items: [
      { 
        iconName: "AlertTriangle", 
        title: "Riesgo Tradicional", 
        text: "Medicina defensiva reactiva. El médico escribe mirando la pantalla, perdiendo conexión humana y dejando brechas de seguridad." 
      },
      { 
        iconName: "Zap", 
        title: "Estándar VitalScribe", 
        text: "Lazy Registration & Protección Proactiva. La IA sugiere, el médico valida, el sistema bloquea el peligro mortal." 
      }
    ]
  },

  // SLIDE 7: ARQUITECTURA TÉCNICA (SPLIT)
  // Actualización: Especificaciones de seguridad y base de datos.
  {
    id: "tech",
    type: "split",
    title: "Soberanía de Datos & HIPAA",
    content: [
      "Encriptación AES-256 (Grado Bancario): Protección total de notas y diagnósticos en reposo y tránsito. Cumplimiento estricto de estándares de privacidad en salud.",
      "Row Level Security (RLS): Implementación de seguridad a nivel del motor SQL. Garantiza que solo el propietario de la llave criptográfica (UID) pueda leer los registros.",
      "Vertex AI Secure Node: Procesamiento de inferencia en entorno aislado. Los datos clínicos nunca se usan para re-entrenar modelos públicos."
    ],
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=2070"
  },

  // SLIDE 8: LEGAL (GRID)
  // Actualización: Mención del Disclaimer visual y Firma Forense.
  {
    id: "legal",
    type: "grid",
    title: "Blindaje Regulatorio (NOM-004)",
    content: "Cumplimiento normativo integrado en la UX.",
    items: [
      { iconName: "Scale", title: "Integridad SOAP", text: "Validación estructural de campos obligatorios antes del cierre, asegurando calidad legal." },
      { iconName: "Fingerprint", title: "Bitácora Inmutable", text: "Registro forense (Append-only). Las correcciones del médico se guardan como la verdad jurídica final." },
      { iconName: "FileCheck", title: "Consentimiento Activo", text: "UI diseñada con 'Liability Disclaimer' visible y vinculante en cada validación de nota." }
    ]
  },

  // SLIDE 9: SEGUROS (SPLIT)
  // Actualización: Corrección sobre la biblioteca de formatos (no pre-llenado mágico, sino gestión centralizada).
  {
    id: "insurance",
    type: "split",
    title: "Interoperabilidad Administrativa",
    content: [
      "Codificación CIE-10 Embebida: Traducción automática de síntomas a códigos internacionales (ej. 'Dolor de panza' -> 'R10.4') para mesas de control.",
      "Gestión Centralizada de Formatos: Biblioteca digital integrada (GNP, AXA, MetLife) lista para llenado y resguardo directo en el expediente.",
      "Memoria de Siniestros: Persistencia inteligente de datos de póliza y siniestro entre consultas consecutivas."
    ],
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=2000"
  },

  // SLIDE 10: RENTABILIDAD (GRID)
  {
    id: "financial",
    type: "grid",
    title: "Gestión de Práctica Privada",
    content: "Herramientas para la sustentabilidad del negocio médico.",
    items: [
      { iconName: "Calculator", title: "Calculadora Quirúrgica", text: "Transparencia total en el desglose de honorarios para equipos médicos y pacientes." },
      { iconName: "ShieldCheck", title: "Evidencia Histórica", text: "Soberanía de datos con exportación masiva. Tu mejor defensa ante disputas de aseguradoras por preexistencias." }
    ]
  },

  // SLIDE 11: CIERRE (HERO)
  // Actualización: Cierre con la nueva filosofía de "Sistema Operativo".
  {
    id: "closing",
    type: "hero",
    title: "Medicina de Alta Precisión.",
    subtitle: "VitalScribe AI v7.9",
    content: "El primer Sistema Operativo Clínico que entiende, protege y defiende su criterio médico.",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1964",
    meta: { gradient: "from-teal-600 to-blue-900" }
  }
];