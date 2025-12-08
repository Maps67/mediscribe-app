import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuickDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorProfile: any;
  defaultType?: 'justificante' | 'certificado' | 'receta';
}

export const QuickDocModal: React.FC<QuickDocModalProps> = ({ isOpen, onClose, doctorProfile, defaultType = 'justificante' }) => {
  const [docType, setDocType] = useState(defaultType);
  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [restDays, setRestDays] = useState('1');
  const [content, setContent] = useState('');
  
  // Auto-llenado de fecha
  const todayLong = format(new Date(), "d 'de' MMMM 'del' yyyy", { locale: es });

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    // PLANTILLA LEGAL MÉXICO (NOM-004)
    const htmlContent = `
      <html>
        <head>
          <title>${docType.toUpperCase()}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .doctor-name { font-size: 24px; font-weight: bold; text-transform: uppercase; }
            .meta-info { font-size: 12px; margin-top: 5px; }
            .title { text-align: center; font-size: 20px; font-weight: bold; margin: 30px 0; text-decoration: underline; text-transform: uppercase; }
            .content { font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 60px; }
            .signature-section { margin-top: 100px; text-align: center; page-break-inside: avoid; }
            .line { border-top: 1px solid #000; width: 60%; margin: 0 auto 10px auto; }
            .cedula { font-size: 12px; font-weight: bold; }
            .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #666; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="doctor-name">${doctorProfile?.full_name || 'DR. NOMBRE DEL MÉDICO'}</div>
            <div class="meta-info">${doctorProfile?.specialty?.toUpperCase() || 'MEDICINA GENERAL'}</div>
            <div class="meta-info">${doctorProfile?.university || 'UNIVERSIDAD DE EGRESO'}</div>
            <div class="meta-info">CÉDULA PROF: ${doctorProfile?.license_number || 'PENDIENTE'}</div>
            <div class="meta-info" style="margin-top: 10px;">${doctorProfile?.address || 'Dirección del Consultorio'} | Tel: ${doctorProfile?.phone || ''}</div>
          </div>

          <div class="title">
            ${docType === 'justificante' ? 'JUSTIFICANTE MÉDICO' : docType === 'certificado' ? 'CERTIFICADO MÉDICO' : 'RECETA MÉDICA'}
          </div>

          <div class="content">
            <p align="right"><b>Lugar y Fecha:</b> ${location.hostname === 'localhost' ? 'CDMX' : 'México'}, a ${todayLong}.</p>
            <br/>
            ${generateBody()}
          </div>

          <div class="signature-section">
            <div class="line"></div>
            <div><b>${doctorProfile?.full_name}</b></div>
            <div class="cedula">CÉD. PROF. ${doctorProfile?.license_number}</div>
            <div>FIRMA AUTÓGRAFA</div>
          </div>

          <div class="footer">
            Este documento contiene información confidencial protegida por el Secreto Médico.
            Generado vía MediScribe AI.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generateBody = () => {
    if (docType === 'justificante') {
      return `
        <p><b>A QUIEN CORRESPONDA:</b></p>
        <p>El que suscribe, Médico Cirujano legalmente autorizado para ejercer la profesión, HACE CONSTAR que después de haber examinado al paciente:</p>
        <p align="center" style="font-size: 18px; font-weight: bold;">${patientName.toUpperCase()}</p>
        <p>Se encontró con diagnóstico de <b>${diagnosis || 'ENFERMEDAD GENERAL'}</b>, por lo que requiere de <b>${restDays} DÍAS</b> de reposo relativo/absoluto para su recuperación y control, contando a partir de la fecha de expedición de este documento.</p>
        <p>Se extiende la presente a petición del interesado para los fines legales y administrativos que a este convengan.</p>
      `;
    } else if (docType === 'certificado') {
      return `
        <p><b>A QUIEN CORRESPONDA:</b></p>
        <p>CERTIFICO que habiendo practicado reconocimiento médico a:</p>
        <p align="center" style="font-size: 18px; font-weight: bold;">${patientName.toUpperCase()}</p>
        <p>Lo he encontrado <b>CLÍNICAMENTE SANO</b>, sin evidencia de enfermedades infectocontagiosas, crónico-degenerativas ni alteraciones psicomotrices al momento de la exploración, por lo que se encuentra APTO para realizar las actividades que le sean requeridas.</p>
        <p>Se extiende el presente certificado a solicitud del interesado.</p>
      `;
    } else {
        return `<p><b>PACIENTE:</b> ${patientName}</p><p><b>RX:</b></p><p style="white-space: pre-wrap;">${content}</p>`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-teal-400"/>
            <h3 className="font-bold text-lg">Generador de Documentos Legales</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid grid-cols-3 gap-2 mb-6 bg-white p-1 rounded-xl border border-slate-200">
             {['justificante', 'certificado', 'receta'].map((t) => (
               <button 
                key={t}
                onClick={() => setDocType(t as any)}
                className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${docType === t ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                 {t}
               </button>
             ))}
          </div>

          <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Paciente</label>
               <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Nombre completo..."/>
             </div>

             {docType === 'justificante' && (
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Días de Reposo</label>
                    <input type="number" value={restDays} onChange={e => setRestDays(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diagnóstico (CIE-10 Sugerido)</label>
                    <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" placeholder="Ej. Faringitis Aguda..."/>
                  </div>
               </div>
             )}

             {docType === 'receta' && (
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indicaciones</label>
                   <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl h-32" placeholder="Escriba medicamentos..."></textarea>
                </div>
             )}

             <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 flex items-start gap-2">
                <span className="font-bold">Nota Legal:</span> 
                Este documento incluirá automáticamente su Cédula Profesional: {doctorProfile?.license_number || '[NO CONFIGURADA]'} y Universidad: {doctorProfile?.university || '[NO CONFIGURADA]'}. Verifique su perfil antes de imprimir.
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
           <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
           <button onClick={handlePrint} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-black shadow-lg">
             <Printer size={18} /> IMPRIMIR OFICIAL
           </button>
        </div>
      </div>
    </div>
  );
};