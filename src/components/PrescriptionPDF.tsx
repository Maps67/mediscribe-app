import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Registrar fuentes estándar
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#0d9488', paddingBottom: 10 },
  logoSection: { width: '20%', marginRight: 10 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  doctorInfo: { width: '80%', justifyContent: 'center' },
  doctorName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 2 },
  specialty: { fontSize: 10, color: '#555', marginBottom: 2, textTransform: 'uppercase' },
  details: { fontSize: 8, color: '#666' },
  
  patientSection: { marginBottom: 20, padding: 8, backgroundColor: '#f0fdfa', borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: 'Helvetica-Bold', color: '#0f766e', fontSize: 9 },
  value: { fontSize: 9 },

  rxSection: { flex: 1 },
  // Título dinámico
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', textAlign: 'center', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Estilos para Receta (Medicamentos)
  medication: { marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  medDetails: { fontSize: 10, marginBottom: 2 },
  medInstructions: { fontSize: 9, fontStyle: 'italic', color: '#444' },

  // Estilos para Nota de Evolución (Texto SOAP con títulos amigables)
  sectionBlock: { marginBottom: 12 }, // Un poco más de espacio entre bloques
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 3, textTransform: 'uppercase' }, // Color turquesa oscuro para subtítulos
  sectionBody: { fontSize: 10, lineHeight: 1.6, color: '#444', textAlign: 'justify' },

  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureSection: { alignItems: 'center', width: '40%' },
  signatureImage: { width: 100, height: 40, objectFit: 'contain', marginBottom: 5 },
  signatureLine: { width: '100%', borderTopWidth: 1, borderTopColor: '#333', marginTop: 5 },
  legalText: { fontSize: 7, color: '#888', marginTop: 5, textAlign: 'center', width: '50%' },
});

interface PrescriptionPDFProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  university: string;
  address: string;
  logoUrl?: string;
  signatureUrl?: string;
  patientName: string;
  date: string;
  medications?: MedicationItem[];
  content?: string; 
  documentTitle?: string; 
}

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, logoUrl, signatureUrl, 
  patientName, date, medications, content,
  documentTitle = "RECETA MÉDICA" 
}) => {

  // Función TRADUCTORA: Convierte jerga médica (SOAP) a lenguaje paciente
  const formatContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const trimmed = line.trim();
      
      // S -> RELATO DEL PACIENTE
      if (trimmed.match(/^(S:|Subjetivo:)/i)) {
        const [, ...rest] = trimmed.split(':');
        return (
          <View key={index} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>RELATO CLÍNICO DEL PACIENTE:</Text>
            <Text style={styles.sectionBody}>{rest.join(':').trim()}</Text>
          </View>
        );
      }
      
      // O -> HALLAZGOS MÉDICOS
      if (trimmed.match(/^(O:|Objetivo:)/i)) {
        const [, ...rest] = trimmed.split(':');
        return (
          <View key={index} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>HALLAZGOS DE LA EXPLORACIÓN:</Text>
            <Text style={styles.sectionBody}>{rest.join(':').trim()}</Text>
          </View>
        );
      }

      // A -> DIAGNÓSTICO
      if (trimmed.match(/^(A:|Análisis:|Dx:|Diagnóstico:)/i)) {
        const [, ...rest] = trimmed.split(':');
        return (
          <View key={index} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>DIAGNÓSTICO MÉDICO:</Text>
            <Text style={styles.sectionBody}>{rest.join(':').trim()}</Text>
          </View>
        );
      }

      // P -> PLAN A SEGUIR
      if (trimmed.match(/^(P:|Plan:)/i)) {
        const [, ...rest] = trimmed.split(':');
        return (
          <View key={index} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>TRATAMIENTO A SEGUIR:</Text>
            <Text style={styles.sectionBody}>{rest.join(':').trim()}</Text>
          </View>
        );
      }

      // PLAN PACIENTE / INDICACIONES (Ya es amigable, solo formato)
      if (trimmed.match(/^(PLAN PACIENTE:|INDICACIONES:)/i)) {
         const [, ...rest] = trimmed.split(':');
         return (
            <View key={index} style={{ marginTop: 10, padding: 10, backgroundColor: '#f0fdfa', borderRadius: 4, borderWidth: 1, borderColor: '#ccfbf1' }}>
               <Text style={{ ...styles.sectionTitle, color: '#0d9488', marginBottom: 4 }}>INDICACIONES IMPORTANTES:</Text>
               <Text style={styles.sectionBody}>{rest.join(':').trim()}</Text>
            </View>
         );
      }

      // Omitir fecha duplicada
      if (trimmed.startsWith('FECHA:')) return null;

      // Texto normal (párrafos sueltos)
      if (trimmed.length > 0) {
        return <Text key={index} style={styles.sectionBody}>{trimmed}</Text>;
      }
      return null;
    });
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          {logoUrl && (
            <View style={styles.logoSection}>
               {/* eslint-disable-next-line jsx-a11y/alt-text */}
               <Image src={logoUrl} style={styles.logo} />
            </View>
          )}
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
            <Text style={styles.details}>{university} | CP: {license}</Text>
            <Text style={styles.details}>{address} | Tel: {phone}</Text>
          </View>
        </View>

        {/* Patient Info */}
        <View style={styles.patientSection}>
           <Text><Text style={styles.label}>PACIENTE: </Text>{patientName}</Text>
           <Text><Text style={styles.label}>FECHA: </Text>{date}</Text>
        </View>

        {/* Body */}
        <View style={styles.rxSection}>
          <Text style={styles.docTitle}>{documentTitle}</Text>
          
          {content ? (
             <View>
                {formatContent(content)}
             </View>
          ) : (
             medications?.map((med, i) => (
              <View key={i} style={styles.medication}>
                  <Text style={styles.medName}>
                      {i + 1}. {med.name || med.drug} <Text style={{fontSize:9, fontFamily:'Helvetica'}}>({med.details})</Text>
                  </Text>
                  <Text style={styles.medInstructions}>
                      Tomar {med.frequency} durante {med.duration}.
                  </Text>
                  {med.notes && <Text style={{fontSize: 8, color:'#666', marginTop:2}}>Nota: {med.notes}</Text>}
              </View>
             ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={{width: '50%'}}>
             <Text style={styles.legalText}>
                {documentTitle === 'RECETA MÉDICA' 
                   ? 'Este documento es una receta médica válida para surtido en farmacia.' 
                   : 'Este reporte es para uso informativo del paciente y seguimiento de su tratamiento.'}
             </Text>
          </View>
          <View style={styles.signatureSection}>
             {signatureUrl && <Image src={signatureUrl} style={styles.signatureImage} />}
             <View style={styles.signatureLine} />
             <Text style={{fontSize: 8, marginTop: 2}}>Firma del Médico</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default PrescriptionPDF;