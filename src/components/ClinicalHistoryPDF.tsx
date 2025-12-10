import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registramos una fuente estándar para asegurar caracteres latinos (tildes/ñ)
// Usamos Helvetica por defecto que es segura en PDFs
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

// --- ESTILOS PROFESIONALES (TIPO NOTARÍA/LEGAL) ---
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#334155' // Slate-700
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e', // Teal-700 (Tu marca)
    paddingBottom: 10,
    alignItems: 'center'
  },
  headerLeft: {
    flexGrow: 1,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginLeft: 15
  },
  drName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f766e',
    textTransform: 'uppercase'
  },
  drInfo: {
    fontSize: 8,
    color: '#64748b'
  },
  patientSection: {
    backgroundColor: '#f1f5f9', // Slate-100
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0f766e'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase'
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  timelineItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 5,
    marginBottom: 5,
    borderRadius: 2
  },
  dateBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e'
  },
  consultationBody: {
    fontSize: 10,
    textAlign: 'justify'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  }
});

// --- INTERFACES DE DATOS ---
interface ConsultationRecord {
  id: string;
  created_at: string;
  summary: string;
  diagnosis?: string;
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
    history?: string; // Antecedentes generales
  };
  consultations: ConsultationRecord[];
  generatedDate: string;
}

// --- COMPONENTE DOCUMENTO ---
const ClinicalHistoryPDF: React.FC<ClinicalHistoryPDFProps> = ({ 
  doctorProfile, 
  patientData, 
  consultations,
  generatedDate 
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 1. ENCABEZADO MÉDICO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.drName}>Dr. {doctorProfile.full_name}</Text>
            <Text style={styles.drInfo}>{doctorProfile.specialty || "Medicina General"}</Text>
            {doctorProfile.license_number && <Text style={styles.drInfo}>Céd. Prof: {doctorProfile.license_number} | {doctorProfile.university}</Text>}
            <Text style={styles.drInfo}>{doctorProfile.address}</Text>
            <Text style={styles.drInfo}>Tel: {doctorProfile.phone}</Text>
          </View>
          {/* Si tiene logo, lo mostramos. Si no, un cuadro gris elegante */}
          {doctorProfile.logo_url ? (
             // Nota: En React-PDF las imágenes externas a veces requieren configuración de CORS.
             // Si falla, se puede comentar esta línea temporalmente.
             <Image style={styles.logo} src={doctorProfile.logo_url} />
          ) : null}
        </View>

        {/* 2. FICHA DEL PACIENTE */}
        <View style={styles.patientSection}>
          <Text style={styles.sectionTitle}>Resumen de Historia Clínica</Text>
          
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>PACIENTE</Text>
              <Text style={styles.value}>{patientData.name}</Text>
            </View>
            <View>
              <Text style={styles.label}>FECHA DE EMISIÓN</Text>
              <Text style={styles.value}>{generatedDate}</Text>
            </View>
          </View>

          <View style={styles.row}>
             <View>
                <Text style={styles.label}>EDAD / GÉNERO</Text>
                <Text style={styles.value}>{patientData.age || "N/A"} - {patientData.gender || "N/A"}</Text>
             </View>
             <View>
                <Text style={styles.label}>TOTAL CONSULTAS</Text>
                <Text style={styles.value}>{consultations.length} Registros</Text>
             </View>
          </View>
        </View>

        {/* 3. ANTECEDENTES RELEVANTES (SI EXISTEN) */}
        {patientData.history && (
            <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>ANTECEDENTES CLÍNICOS REGISTRADOS:</Text>
                <Text style={{ fontSize: 9, color: '#334155' }}>{patientData.history}</Text>
            </View>
        )}

        {/* 4. LÍNEA DE TIEMPO DE CONSULTAS */}
        <Text style={[styles.sectionTitle, { marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' }]}>
            EVOLUCIÓN CRONOLÓGICA
        </Text>

        {consultations.length === 0 ? (
            <Text style={{ marginTop: 20, textAlign: 'center', color: '#94a3b8' }}>
                -- No hay registros de consulta en este expediente --
            </Text>
        ) : (
            consultations.map((cons, index) => (
                <View key={cons.id || index} style={styles.timelineItem} wrap={false}>
                    <View style={styles.consultationHeader}>
                        <Text style={styles.dateBadge}>
                            {new Date(cons.created_at).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 8, color: '#64748b' }}>
                            FOLIO: {cons.id.substring(0, 8).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.consultationBody}>
                        {cons.summary}
                    </Text>
                </View>
            ))
        )}

        {/* 5. PIE DE PÁGINA */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Documento generado electrónicamente por MediScribe. Confidencialidad Médico-Paciente garantizada. - Pág. ${pageNumber} de ${totalPages}`
        )} fixed />

      </Page>
    </Document>
  );
};

export default ClinicalHistoryPDF;