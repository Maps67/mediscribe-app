import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { MedicationItem } from '../types';

// Fuentes estándar seguras
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
  rxSection: { flex: 1 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488', textAlign: 'center', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  medication: { marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  medInstructions: { fontSize: 9, fontStyle: 'italic', color: '#444' },
  sectionBlock: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f766e', marginBottom: 3, textTransform: 'uppercase' },
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
  patientName, date, medications = [], content,
  documentTitle = "RECETA MÉDICA" 
}) => {

  const formatContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.match(/^(S:|Subjetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>RELATO CLÍNICO:</Text><Text style={styles.sectionBody}>{trimmed.replace(/^(S:|Subjetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(O:|Objetivo:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>EXPLORACIÓN:</Text><Text style={styles.sectionBody}>{trimmed.replace(/^(O:|Objetivo:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(A:|Análisis:|Dx:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>DIAGNÓSTICO:</Text><Text style={styles.sectionBody}>{trimmed.replace(/^(A:|Análisis:|Dx:)/i, '').trim()}</Text></View>;
      if (trimmed.match(/^(P:|Plan:)/i)) return <View key={index} style={styles.sectionBlock}><Text style={styles.sectionTitle}>TRATAMIENTO:</Text><Text style={styles.sectionBody}>{trimmed.replace(/^(P:|Plan:)/i, '').trim()}</Text></View>;
      if (trimmed.startsWith('FECHA:')) return null;
      return <Text key={index} style={styles.sectionBody}>{trimmed}</Text>;
    });
  };

  // Función segura para validar URL de imágenes y evitar CRASH
  const isValidUrl = (url?: string) => url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
             {isValidUrl(logoUrl) && <Image src={logoUrl!} style={styles.logo} />}
          </View>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{doctorName || 'Médico'}</Text>
            <Text style={styles.specialty}>{specialty}</Text>
            <Text style={styles.details}>{university} {license ? `| CP: ${license}` : ''}</Text>
            <Text style={styles.details}>{address} {phone ? `| Tel: ${phone}` : ''}</Text>
          </View>
        </View>

        <View style={styles.patientSection}>
           <Text><Text style={styles.label}>PACIENTE: </Text>{patientName}</Text>
           <Text><Text style={styles.label}>FECHA: </Text>{date}</Text>
        </View>

        <View style={styles.rxSection}>
          <Text style={styles.docTitle}>{documentTitle}</Text>
          {content ? <View>{formatContent(content)}</View> : 
             medications.map((med, i) => (
              <View key={i} style={styles.medication}>
                  <Text style={styles.medName}>{i + 1}. {med.drug || med.name} <Text style={{fontSize:9, fontFamily:'Helvetica'}}>({med.details})</Text></Text>
                  <Text style={styles.medInstructions}>Tomar {med.frequency} durante {med.duration}.</Text>
                  {med.notes && <Text style={{fontSize: 8, color:'#666', marginTop:2}}>Nota: {med.notes}</Text>}
              </View>
             ))
          }
        </View>

        <View style={styles.footer}>
          <View style={{width: '50%'}}>
             <Text style={styles.legalText}>{documentTitle === 'RECETA MÉDICA' ? 'Documento válido para farmacia.' : 'Resumen clínico.'}</Text>
          </View>
          <View style={styles.signatureSection}>
             {isValidUrl(signatureUrl) && <Image src={signatureUrl!} style={styles.signatureImage} />}
             <View style={styles.signatureLine} />
             <Text style={{fontSize: 8, marginTop: 2}}>Firma del Médico</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPDF;