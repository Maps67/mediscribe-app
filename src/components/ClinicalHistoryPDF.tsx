import React from 'react';
import { 
  Page, 
  Text, 
  View, 
  Document, 
  StyleSheet, 
  Image, 
  Font 
} from '@react-pdf/renderer';

// ----------------------------------------------------------------------
// 1. CONFIGURACIÓN DE FUENTES
// ----------------------------------------------------------------------
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Oblique.ttf', fontStyle: 'italic' }
  ]
});

// ----------------------------------------------------------------------
// 2. ESTILOS OPTIMIZADOS (MÁRGENES Y AIRE VISUAL)
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 45,      // Más aire arriba
    paddingBottom: 50,   // Más espacio para el footer legal
    paddingLeft: 45,
    paddingRight: 45,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.6,     // Interlineado más legible
    color: '#334155',
    backgroundColor: '#ffffff'
  },
  
  // --- Encabezado ---
  header: {
    flexDirection: 'row',
    marginBottom: 30,    // Separación mayor del contenido
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: {
    flexGrow: 1,
    paddingRight: 15,
    flexDirection: 'column'
  },
  logo: {
    width: 75,
    height: 75,
    borderRadius: 4,
    objectFit: 'contain'
  },
  drName: {
    fontSize: 18,        // Nombre más grande
    fontWeight: 'bold',
    color: '#0f766e',
    textTransform: 'uppercase',
    marginBottom: 5
  },
  drSpecialty: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 3
  },
  drInfo: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2
  },

  // --- Ficha Paciente (Recuadro Gris) ---
  patientSection: {
    backgroundColor: '#f8fafc',
    padding: 18,         // Más relleno interno
    borderRadius: 8,
    marginBottom: 30,    // Separación clara de los antecedentes
    borderLeftWidth: 5,
    borderLeftColor: '#0f766e'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8      // Más espacio entre renglones de datos
  },
  column: {
    flexDirection: 'column',
    width: '48%'
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 3
  },
  value: {
    fontSize: 11,        // Datos del paciente más grandes
    fontWeight: 'bold',
    color: '#1e293b'
  },

  // --- Sección Historia Clínica (Antecedentes + Interrogatorio) ---
  historySection: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1'
  },
  historyBlock: {
    marginBottom: 12     // Espacio entre Alergias, Antecedentes e Interrogatorio
  },
  historyLabel: {
    fontSize: 9, 
    fontWeight: 'bold', 
    color: '#475569', 
    marginBottom: 4, 
    textTransform:'uppercase',
    backgroundColor: '#f1f5f9', // Fondo sutil para subtítulos
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderRadius: 3
  },
  historyText: {
    fontSize: 10, 
    color: '#334155',
    textAlign: 'justify',
    lineHeight: 1.5,
    paddingLeft: 5
  },

  // --- Línea de Tiempo ---
  timelineItem: {
    marginBottom: 25,    // Más espacio entre consulta y consulta
    paddingBottom: 5
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,  // CORRECCIÓN: Más altura vertical
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderLeftWidth: 3,  // Detalle estético
    borderLeftColor: '#94a3b8'
  },
  dateBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f766e',
    textTransform: 'uppercase'
  },
  folioBadge: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold'
  },
  
  // --- Cuerpo SOAP ---
  soapHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e',
    marginTop: 10,       // Más aire antes de cada letra (S, O, A, P)
    marginBottom: 3,
    textTransform: 'uppercase'
  },
  soapBody: {
    fontSize: 10,
    textAlign: 'justify',
    marginBottom: 2,
    lineHeight: 1.5,
    color: '#334155'
  },
  
  // --- Pie de Página Legal ---
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 45,
    right: 45,
    textAlign: 'center',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    fontStyle: 'italic'
  }
});

// ----------------------------------------------------------------------
// 3. INTERFACES (Agregamos el campo legal opcional)
// ----------------------------------------------------------------------
interface ConsultationRecord {
  id: string;
  created_at: string;
  summary: string;
}

interface ClinicalHistoryPDFProps {
  doctorProfile: {
    full_name: string;
    specialty?: string;
    license_number?: string;
    university?: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
  patientData: {
    name: string;
    age?: string;
    gender?: string;
    history?: string;      // Antecedentes generales
    allergies?: string;    // Alergias
    // 🔥 CAMPO LEGAL NUEVO
    system_review?: string; // Interrogatorio por aparatos y sistemas
  };
  consultations: ConsultationRecord[];
  generatedDate: string;
}

// ----------------------------------------------------------------------
// 4. HELPER SOAP (Sin cambios lógicos, solo visuales)
// ----------------------------------------------------------------------
const FormattedConsultationBody = ({ text }: { text: string }) => {
  const cleanText = text || "";
  const normalizedText = cleanText.replace(/\r\n/g, '\n');
  const lines = normalizedText.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        // Helper para renderizar bloques
        const renderBlock = (title: string, content: string) => (
          <View key={index} wrap={false} style={{ marginBottom: 4 }}>
            <Text style={styles.soapHeader}>{title}</Text>
            <Text style={styles.soapBody}>{content}</Text>
          </View>
        );

        if (trimmedLine.startsWith("S:") || trimmedLine.startsWith("S ")) 
          return renderBlock("SÍNTOMAS Y MOTIVO (S):", trimmedLine.replace(/^(S:|S )/i, '').trim());
          
        if (trimmedLine.startsWith("O:") || trimmedLine.startsWith("O ")) 
          return renderBlock("EXPLORACIÓN FÍSICA (O):", trimmedLine.replace(/^(O:|O )/i, '').trim());

        if (trimmedLine.startsWith("A:") || trimmedLine.startsWith("A ")) 
          return renderBlock("DIAGNÓSTICO/ANÁLISIS (A):", trimmedLine.replace(/^(A:|A )/i, '').trim());

        if (trimmedLine.startsWith("P:") || trimmedLine.startsWith("P ")) 
          return renderBlock("PLAN MÉDICO (P):", trimmedLine.replace(/^(P:|P )/i, '').trim());

        // Texto normal
        return (
          <Text key={index} style={styles.soapBody}>{trimmedLine}</Text>
        );
      })}
    </View>
  );
};

// ----------------------------------------------------------------------
// 5. COMPONENTE PRINCIPAL (Con Inyección Legal)
// ----------------------------------------------------------------------
const ClinicalHistoryPDF: React.FC<ClinicalHistoryPDFProps> = ({ 
  doctorProfile, 
  patientData, 
  consultations, 
  generatedDate 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 1. HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.drName}>Dr. {doctorProfile.full_name}</Text>
            <Text style={styles.drSpecialty}>{doctorProfile.specialty || "Medicina General"}</Text>
            {doctorProfile.license_number && (
              <Text style={styles.drInfo}>Céd. Prof: {doctorProfile.license_number} | {doctorProfile.university}</Text>
            )}
            {doctorProfile.address && <Text style={styles.drInfo}>{doctorProfile.address}</Text>}
            {doctorProfile.phone && <Text style={styles.drInfo}>Tel: {doctorProfile.phone}</Text>}
          </View>
          {doctorProfile.logo_url && <Image style={styles.logo} src={doctorProfile.logo_url} />}
        </View>

        {/* 2. FICHA PACIENTE */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>HISTORIA CLÍNICA - FICHA DE IDENTIFICACIÓN</Text>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={styles.value}>{patientData.name}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>FECHA DE IMPRESIÓN</Text>
              <Text style={styles.value}>{generatedDate}</Text>
            </View>
          </View>
          <View style={styles.row}>
             <View style={styles.column}>
                <Text style={styles.label}>EDAD / GÉNERO</Text>
                <Text style={styles.value}>{patientData.age || "--"} / {patientData.gender || "--"}</Text>
             </View>
             <View style={styles.column}>
                <Text style={styles.label}>EXPEDIENTE</Text>
                <Text style={styles.value}>{consultations.length} NOTAS ASOCIADAS</Text>
             </View>
          </View>
        </View>

        {/* 3. ANTECEDENTES Y ASPECTOS LEGALES (NOM-004) */}
        <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>ANTECEDENTES Y ESTADO GENERAL</Text>
            
            {/* Bloque Alergias (Si existen) */}
            {patientData.allergies && (
                <View style={styles.historyBlock}>
                    <Text style={[styles.historyLabel, { color: '#ef4444' }]}>ALERGIAS CRÍTICAS:</Text>
                    <Text style={styles.historyText}>{patientData.allergies}</Text>
                </View>
            )}

            {/* Bloque Antecedentes (Hereditarios/Patológicos) */}
            <View style={styles.historyBlock}>
                <Text style={styles.historyLabel}>ANTECEDENTES CLÍNICOS (AHF/APP/APNP):</Text>
                <Text style={styles.historyText}>
                    {patientData.history || "No se registraron antecedentes patológicos de relevancia al momento de la apertura del expediente."}
                </Text>
            </View>

            {/* 🔥 BLOQUE LEGAL NUEVO: INTERROGATORIO POR APARATOS Y SISTEMAS */}
            <View style={styles.historyBlock}>
                <Text style={styles.historyLabel}>INTERROGATORIO POR APARATOS Y SISTEMAS:</Text>
                <Text style={styles.historyText}>
                    {patientData.system_review 
                        ? patientData.system_review 
                        : "Interrogatorio general sin datos de alarma actuales en sistemas respiratorio, cardiovascular, digestivo ni neurológico, salvo lo descrito en padecimiento actual."}
                </Text>
            </View>
        </View>

        {/* 4. NOTAS DE EVOLUCIÓN */}
        <Text style={[styles.sectionTitle, { marginTop: 10, borderBottomWidth: 0 }]}>
            NOTAS DE EVOLUCIÓN
        </Text>

        {consultations.length === 0 ? (
           <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 10, marginTop: 20 }}>
               -- Expediente sin notas registradas --
           </Text>
        ) : (
            consultations.map((cons, index) => (
                <View key={cons.id || index} style={styles.timelineItem} wrap={false}>
                    {/* Barra Azul Alineada */}
                    <View style={styles.consultationHeader}>
                        <Text style={styles.dateBadge}>
                            {new Date(cons.created_at).toLocaleDateString('es-MX', { 
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                            }).toUpperCase()}
                        </Text>
                        <Text style={styles.folioBadge}>
                            FOLIO: {cons.id.substring(0, 8).toUpperCase()}
                        </Text>
                    </View>
                    <FormattedConsultationBody text={cons.summary} />
                </View>
            ))
        )}

        {/* 5. FOOTER LEGAL */}
        <Text 
          style={styles.footer} 
          render={({ pageNumber, totalPages }) => (
            `EXPEDIENTE CLÍNICO ELECTRÓNICO (NOM-004-SSA3-2012) | CONFIDENCIAL | Uso exclusivo médico. - Pág. ${pageNumber} de ${totalPages}`
          )} 
          fixed 
        />

      </Page>
    </Document>
  );
};

export default ClinicalHistoryPDF;