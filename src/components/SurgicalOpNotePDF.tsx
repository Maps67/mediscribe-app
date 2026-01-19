import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { DoctorProfile, Patient } from '../types';

// Registramos una fuente estándar profesional
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.5, color: '#334155' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0f766e', paddingBottom: 10 },
  logoContainer: { width: 60, height: 60, marginRight: 15 },
  logo: { width: '100%', height: '100%', objectFit: 'contain' },
  doctorInfo: { flex: 1, justifyContent: 'center' },
  drName: { fontSize: 14, fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase' },
  drSpecialty: { fontSize: 10, color: '#64748b', marginBottom: 4 },
  drMeta: { fontSize: 8, color: '#94a3b8' },
  
  titleBlock: { marginTop: 10, marginBottom: 20, textAlign: 'center', backgroundColor: '#f0fdfa', padding: 8, borderRadius: 4 },
  docTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f766e', letterSpacing: 1 },
  
  patientBlock: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#f8fafc', padding: 10, borderRadius: 4, borderLeftWidth: 4, borderLeftColor: '#cbd5e1' },
  patientCol: { flex: 1 },
  label: { fontSize: 8, color: '#64748b', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },

  contentContainer: { marginBottom: 40 },
  contentTitle: { fontSize: 10, fontWeight: 'bold', color: '#0f766e', marginBottom: 5, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  contentText: { fontSize: 10, textAlign: 'justify', marginBottom: 5 },

  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  signatureImage: { width: 120, height: 60, alignSelf: 'center', marginBottom: 5 },
  disclaimer: { fontSize: 7, color: '#94a3b8', marginTop: 15, fontStyle: 'italic' }
});

interface SurgicalOpNotePDFProps {
  doctor: DoctorProfile;
  patient: Patient | any;
  content: string;
  date: string;
}

const SurgicalOpNotePDF: React.FC<SurgicalOpNotePDFProps> = ({ doctor, patient, content, date }) => {
  
  // Función simple para limpiar markdown básico si viene de la IA
  const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/##/g, '').replace(/-/g, '•');

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* ENCABEZADO MÉDICO */}
        <View style={styles.header}>
          {doctor.logo_url && (
            <View style={styles.logoContainer}>
              <Image src={doctor.logo_url} style={styles.logo} />
            </View>
          )}
          <View style={styles.doctorInfo}>
            <Text style={styles.drName}>{doctor.full_name}</Text>
            <Text style={styles.drSpecialty}>{doctor.specialty}</Text>
            <Text style={styles.drMeta}>CED. PROF: {doctor.license_number} | {doctor.university}</Text>
            <Text style={styles.drMeta}>{doctor.address} | {doctor.phone}</Text>
          </View>
        </View>

        {/* TÍTULO DEL DOCUMENTO */}
        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>NOTA POST-QUIRÚRGICA</Text>
        </View>

        {/* DATOS DEL PACIENTE */}
        <View style={styles.patientBlock}>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Paciente</Text>
            <Text style={styles.value}>{patient.name}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Fecha de Cirugía</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.label}>Expediente / ID</Text>
            <Text style={styles.value}>{patient.id?.slice(0,8).toUpperCase() || 'S/N'}</Text>
          </View>
        </View>

        {/* CUERPO DEL REPORTE */}
        <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>DESCRIPCIÓN DEL PROCEDIMIENTO Y HALLAZGOS</Text>
            <Text style={styles.contentText}>{cleanText(content)}</Text>
        </View>

        {/* PIE DE PÁGINA Y FIRMA */}
        <View style={styles.footer}>
          {doctor.signature_url && (
             <Image src={doctor.signature_url} style={styles.signatureImage} />
          )}
          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>DR. {doctor.full_name.toUpperCase()}</Text>
          <Text style={{ fontSize: 8, color: '#64748b' }}>{doctor.specialty} - Cédula: {doctor.license_number}</Text>
          
          <Text style={styles.disclaimer}>
            Documento generado electrónicamente mediante VitalScribe AI. {new Date().toISOString()}
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default SurgicalOpNotePDF;