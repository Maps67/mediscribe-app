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
import { DoctorProfile, Patient } from '../types';

// ----------------------------------------------------------------------
// 1. FUENTES ESTÁNDAR
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
// 2. ESTILOS (Optimizados para flujo de página continuo)
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#ffffff',
    lineHeight: 1.5
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 15,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  docInfo: { width: '75%' },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  drName: { fontSize: 14, fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' },
  subInfo: { fontSize: 8, color: '#64748b', marginBottom: 1 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 10,
    marginTop: 15,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4
  },
  
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 130, fontSize: 8, fontWeight: 'bold', color: '#94a3b8' },
  value: { flex: 1, fontSize: 9, fontWeight: 'bold', color: '#1e293b' },

  historyContainer: { marginBottom: 10 },
  historyBlock: { marginBottom: 8 },
  historyLabel: { 
    fontSize: 8, fontWeight: 'bold', color: '#64748b', marginBottom: 2, 
    backgroundColor: '#f1f5f9', padding: 2, alignSelf: 'flex-start' 
  },
  historyText: { fontSize: 9, textAlign: 'justify', lineHeight: 1.4 },

  // CORRECCIÓN: Quitamos restricciones de altura o wrap
  noteContainer: { 
    marginBottom: 20, 
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  noteHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', padding: 6, borderRadius: 4, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#0f766e'
  },
  
  soapHeader: { fontSize: 9, fontWeight: 'bold', color: '#0f766e', marginTop: 6, marginBottom: 2 },
  soapBody: { fontSize: 9, textAlign: 'justify', marginBottom: 4, color: '#334155' },
  
  // Estilo especial para reportes largos
  reportText: { fontSize: 9, textAlign: 'justify', color: '#334155', lineHeight: 1.4 },

  legalFooter: {
    position: 'absolute', bottom: 30, left: 40, right: 40,
    fontSize: 7, textAlign: 'center', color: '#9ca3af',
    borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10
  }
});

// ----------------------------------------------------------------------
// 3. LOGICA DE TEXTO SEGURO (JSON PARSER)
// ----------------------------------------------------------------------
const safeText = (text: any) => {
    if (!text) return "Sin datos registrados.";
    
    // Si viene como objeto directo
    if (typeof text === 'object') {
        return text.background || text.history || JSON.stringify(text).replace(/["{}[\]]/g, ' ');
    }
    
    // Si es string, intentamos ver si es un JSON oculto
    if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(text);
                // Prioridad a campos comunes de historial
                return parsed.background || parsed.history || parsed.pathological || Object.values(parsed).join(', ').replace(/["{}[\]]/g, '');
            } catch (e) {
                // Si falla el parseo, devolvemos el texto pero limpiando caracteres feos
                return text.replace(/["{}[\]]/g, '');
            }
        }
        return text;
    }
    return String(text);
};

// ----------------------------------------------------------------------
// 4. RENDERIZADOR SOAP (SIN WRAP FALSE)
// ----------------------------------------------------------------------
const FormattedConsultationBody = ({ text }: { text: string }) => {
  if (!text) return <Text style={{fontStyle:'italic'}}>Nota sin contenido.</Text>;
  
  // LIMPIEZA DE MARKDOWN (Elimina **, #, markdown, etc.)
  let cleanText = text
    .replace(/\*\*/g, '')      // Quita negritas markdown
    .replace(/[#]/g, '')       // Quita hashtags
    .replace(/markdown/gi, '') // Quita palabra markdown
    .replace(/_/g, '')         // Quita guiones bajos
    .trim();

  // DETECCIÓN: ¿Es un reporte largo (Cirugía)?
  const isLongReport = cleanText.length > 600 || cleanText.includes("REPORTE OPERATORIO");

  if (isLongReport) {
      // Renderizamos como UN SOLO bloque de texto continuo para que el PDF lo rompa donde quiera
      // Esto evita el superposicionamiento.
      return (
        <View>
            <Text style={styles.soapHeader}>REPORTE EXTENDIDO:</Text>
            <Text style={styles.reportText}>{cleanText}</Text>
        </View>
      );
  }

  // Si es nota normal SOAP, intentamos darle formato bonito
  const lines = cleanText.split(/\r?\n/);
  
  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Función Helper
        const renderBlock = (title: string, content: string) => (
          <View key={index} style={{ marginBottom: 4 }}>
            <Text style={styles.soapHeader}>{title}</Text>
            <Text style={styles.soapBody}>{content}</Text>
          </View>
        );

        if (trimmed.startsWith("S:") || trimmed.startsWith("S ")) return renderBlock("SÍNTOMAS (S):", trimmed.substring(2));
        if (trimmed.startsWith("O:") || trimmed.startsWith("O ")) return renderBlock("EXPLORACIÓN (O):", trimmed.substring(2));
        if (trimmed.startsWith("A:") || trimmed.startsWith("A ")) return renderBlock("DIAGNÓSTICO (A):", trimmed.substring(2));
        if (trimmed.startsWith("P:") || trimmed.startsWith("P ")) return renderBlock("PLAN (P):", trimmed.substring(2));

        // Texto normal (Renderizado simple para que fluya)
        return <Text key={index} style={styles.soapBody}>{trimmed}</Text>;
      })}
    </View>
  );
};

// ----------------------------------------------------------------------
// 5. COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------
interface Props {
  doctor: DoctorProfile;
  patient: Patient;
  history: any[];
  generatedAt: string;
}

const MedicalRecordPDF: React.FC<Props> = ({ doctor, patient, history, generatedAt }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.docInfo}>
            <Text style={styles.drName}>{doctor.full_name}</Text>
            <Text style={styles.subInfo}>{doctor.specialty.toUpperCase()}</Text>
            <Text style={styles.subInfo}>Cédula: {doctor.license_number || 'En trámite'}</Text>
            <Text style={styles.subInfo}>{doctor.address}</Text>
            <Text style={styles.subInfo}>{doctor.phone} | {doctor.email}</Text>
          </View>
          {doctor.logo_url && <Image src={doctor.logo_url} style={styles.logo} />}
        </View>

        {/* FICHA */}
        <Text style={styles.sectionTitle}>FICHA DE IDENTIFICACIÓN</Text>
        <View style={{ marginBottom: 10 }}>
            <View style={styles.row}>
                <Text style={styles.label}>PACIENTE:</Text>
                <Text style={styles.value}>{patient.name}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>EDAD / SEXO:</Text>
                <Text style={styles.value}>
                    {(patient as any).age || '--'} años / {(patient as any).sex || (patient as any).gender || 'No esp.'}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>EXPEDIENTE ID:</Text>
                <Text style={styles.value}>{patient.id}</Text>
            </View>
        </View>

        {/* ANTECEDENTES (Con corrección JSON) */}
        <Text style={styles.sectionTitle}>ANTECEDENTES Y ESTADO GENERAL</Text>
        <View style={styles.historyContainer}>
            <View style={styles.historyBlock}>
                <Text style={[styles.historyLabel, { color: '#dc2626', backgroundColor: '#fee2e2' }]}>ALERGIAS:</Text>
                <Text style={styles.historyText}>{safeText((patient as any).allergies) || "Negadas."}</Text>
            </View>
            <View style={styles.historyBlock}>
                <Text style={styles.historyLabel}>ANTECEDENTES:</Text>
                <Text style={styles.historyText}>{safeText(patient.history)}</Text>
            </View>
            <View style={styles.historyBlock}>
                <Text style={styles.historyLabel}>INTERROGATORIO POR APARATOS Y SISTEMAS:</Text>
                <Text style={styles.historyText}>
                    {(patient as any).system_review || 
                    "Interrogatorio general negativo a datos de alarma en sistemas cardiorrespiratorio, digestivo y neurológico."}
                </Text>
            </View>
        </View>

        {/* NOTAS EVOLUCIÓN */}
        <Text style={styles.sectionTitle}>NOTAS DE EVOLUCIÓN</Text>
        {history.length === 0 ? (
            <Text style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 10, color: '#94a3b8' }}>
                -- No hay notas registradas --
            </Text>
        ) : (
            history.map((note, index) => (
                // CRÍTICO: wrap={false} ELIMINADO aquí abajo para permitir salto de página
                <View key={index} style={styles.noteContainer}>
                    <View style={styles.noteHeader}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                            {new Date(note.created_at).toLocaleDateString('es-MX', { 
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'
                            })}
                        </Text>
                        <Text style={{ fontSize: 8, color: '#475569' }}>FOLIO: {note.id.slice(0,8)}</Text>
                    </View>
                    <FormattedConsultationBody text={note.summary} />
                </View>
            ))
        )}

        <Text style={styles.legalFooter} fixed>
           EXPEDIENTE CLÍNICO ELECTRÓNICO (NOM-004-SSA3-2012) | CONFIDENCIAL | Generado el {generatedAt}
        </Text>

      </Page>
    </Document>
  );
};

export default MedicalRecordPDF;