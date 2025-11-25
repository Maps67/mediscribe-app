import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Interfaces locales para props
interface MedicationItem {
  drug: string;
  details: string;
  frequency: string;
  duration: string;
  notes: string;
}

interface PrescriptionPDFProps {
  doctorName: string;
  specialty: string;
  license: string;
  phone: string;
  university: string;
  address: string;
  patientName: string;
  date: string;
  medications: MedicationItem[]; // Array estructurado
  logoUrl?: string;
  signatureUrl?: string;
}

// Estilos del PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0d9488', // Brand Teal
    paddingBottom: 10,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d9488',
    textTransform: 'uppercase',
  },
  specialty: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaData: {
    fontSize: 8,
    color: '#666',
  },
  patientSection: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#0d9488',
  },
  patientLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  patientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  rxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
    textDecoration: 'underline',
  },
  // TABLA DE MEDICAMENTOS
  tableContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0d9488',
    padding: 6,
  },
  tableHeaderCell: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  col1: { width: '35%' }, // Medicamento
  col2: { width: '20%' }, // Detalles
  col3: { width: '25%' }, // Indicaciones (Frecuencia)
  col4: { width: '20%' }, // Duración/Notas
  
  medDrug: { fontSize: 10, fontWeight: 'bold' },
  medDetail: { fontSize: 9, color: '#475569' },
  medFreq: { fontSize: 9 },
  medNote: { fontSize: 8, color: '#64748b', fontStyle: 'italic' },

  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  signatureArea: {
    alignSelf: 'center',
    marginBottom: 10,
    alignItems: 'center',
  },
  signatureImage: {
    width: 120,
    height: 60,
    objectFit: 'contain',
  },
  signatureLine: {
    width: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 10,
    textAlign: 'center',
  },
});

const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ 
  doctorName, specialty, license, phone, university, address, 
  patientName, date, medications, logoUrl, signatureUrl 
}) => {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          {logoUrl && <Image style={styles.logo} src={logoUrl} />}
          <View style={styles.headerText}>
            <Text style={styles.doctorName}>{doctorName}</Text>
            <Text style={styles.specialty}>{specialty} - {university}</Text>
            <Text style={styles.metaData}>Cédula Prof: {license}</Text>
            <Text style={styles.metaData}>{address} | Tel: {phone}</Text>
          </View>
        </View>

        {/* PACIENTE */}
        <View style={styles.patientSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
             <View>
                <Text style={styles.patientLabel}>PACIENTE</Text>
                <Text style={styles.patientName}>{patientName}</Text>
             </View>
             <View>
                <Text style={styles.patientLabel}>FECHA</Text>
                <Text style={styles.patientName}>{date}</Text>
             </View>
          </View>
        </View>

        <Text style={styles.rxTitle}>RECETA MÉDICA</Text>

        {/* TABLA DE MEDICAMENTOS */}
        <View style={styles.tableContainer}>
            {/* Header Tabla */}
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>MEDICAMENTO</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>PRESENTACIÓN</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>INDICACIONES</Text>
                <Text style={[styles.tableHeaderCell, styles.col4]}>DURACIÓN</Text>
            </View>

            {/* Filas */}
            {medications.map((med, index) => (
                <View key={index} style={styles.tableRow}>
                    <View style={styles.col1}>
                        <Text style={styles.medDrug}>{med.drug}</Text>
                    </View>
                    <View style={styles.col2}>
                        <Text style={styles.medDetail}>{med.details}</Text>
                    </View>
                    <View style={styles.col3}>
                        <Text style={styles.medFreq}>{med.frequency}</Text>
                        {med.notes ? <Text style={styles.medNote}>Nota: {med.notes}</Text> : null}
                    </View>
                    <View style={styles.col4}>
                        <Text style={styles.medFreq}>{med.duration}</Text>
                    </View>
                </View>
            ))}
        </View>

        {/* FOOTER & FIRMA */}
        <View style={styles.footer}>
            <View style={styles.signatureArea}>
                {signatureUrl ? (
                    <Image style={styles.signatureImage} src={signatureUrl} />
                ) : (
                    <View style={{ height: 40 }} /> // Espacio para firmar a mano
                )}
                <View style={styles.signatureLine} />
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>DR. {doctorName.toUpperCase()}</Text>
            </View>
            <Text style={styles.disclaimer}>
                Este documento es una receta médica digital válida. Su uso requiere verificación de identidad del profesional.
            </Text>
        </View>

      </Page>
    </Document>
  );
};

export default PrescriptionPDF;