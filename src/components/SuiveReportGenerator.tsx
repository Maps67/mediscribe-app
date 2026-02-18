import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // ✅ RUTA CORREGIDA (Vital)
import { Download, Search, AlertCircle, Calendar, Shield } from 'lucide-react'; // ✅ ICONOS SEGUROS

export const SuiveReportGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Por favor selecciona la fecha de inicio y fin.');
      return;
    }
    setLoading(true);
    setError('');
    setReportData([]);

    try {
      // 1. Obtenemos al usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No hay sesión de usuario activa.');
        setLoading(false);
        return;
      }

      // 2. Llamamos a la función "Motor" (RPC)
      const { data, error: rpcError } = await supabase.rpc('get_suive_report', {
        doctor_uuid: user.id,
        start_date: startDate + ' 00:00:00',
        end_date: endDate + ' 23:59:59'
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setError('No se encontraron diagnósticos SUIVE en este rango de fechas.');
      } else {
        setReportData(data);
      }

    } catch (err: any) {
      console.error('Error generando SUIVE:', err);
      // Mensaje técnico amigable
      if (err.message?.includes('function not found')) {
        setError('Error: Falta configurar la función RPC en Supabase.');
      } else {
        setError('Error al generar el reporte: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (reportData.length === 0) return;

    // Encabezados del CSV
    const headers = ['EPI CLAVE', 'ENFERMEDAD', 'SEXO', 'EDAD', 'CANTIDAD'];
    
    // Mapeo de datos para CSV
    const rows = reportData.map(item => [
      item.epi_clave,
      `"${item.enfermedad_nombre}"`, // Comillas para proteger textos con comas
      item.sexo,
      item.edad,
      item.cantidad
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SUIVE_Reporte_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header del Componente */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Shield size={20} className="text-emerald-600" />
             <h3 className="font-bold text-slate-800">Generador SUIVE-1</h3>
           </div>
           <p className="text-xs text-slate-500 max-w-md">
             Detecta automáticamente diagnósticos CIE-10 en tus consultas y los agrupa según la normativa oficial mexicana.
           </p>
        </div>
        
        {/* Controles de Fecha */}
        <div className="flex flex-wrap items-end gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Del día</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 w-36"
                  />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Al día</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 w-36"
                  />
                </div>
            </div>
            <button 
              onClick={generateReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 h-[34px] mt-auto"
            >
              {loading ? <span className="animate-spin">⌛</span> : <Search size={16} />}
              <span className="hidden sm:inline">Buscar</span>
            </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2 animate-fade-in">
            <AlertCircle size={16} /> {error}
            </div>
        )}

        {/* Estado Vacío */}
        {!loading && reportData.length === 0 && !error && (
            <div className="text-center py-8 opacity-50">
                <Shield size={48} className="mx-auto text-slate-300 mb-2"/>
                <p className="text-sm text-slate-500">Selecciona un rango de fechas para generar el reporte.</p>
            </div>
        )}

        {/* Tabla de Resultados */}
        {reportData.length > 0 && (
            <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                        {reportData.length} Grupos Detectados
                    </span>
                    <span className="text-xs text-slate-400">Basado en CIE-10</span>
                </div>
                <button 
                onClick={downloadExcel}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                <Download size={16} />
                Descargar CSV
                </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">EPI Clave</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enfermedad (SUIVE)</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sexo</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Edad</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Casos</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {reportData.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-500 bg-slate-50/50 group-hover:bg-slate-100 transition-colors border-r border-slate-100">
                            {row.epi_clave}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-700 font-semibold">
                            {row.enfermedad_nombre}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                            {row.sexo === 'Masculino' ? 'M' : row.sexo === 'Femenino' ? 'F' : row.sexo}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                            {row.edad} años
                        </td>
                        <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100">
                                {row.cantidad}
                            </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};