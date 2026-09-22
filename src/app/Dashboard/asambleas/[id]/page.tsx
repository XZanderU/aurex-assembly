"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import * as XLSX from "xlsx"; // Importamos la librería para crear el Excel

interface PropertyWithOwner {
  property_id: string;
  tower: string | null;
  number: string;
  coefficient: number;
  owner_name: string;
  document_number: string;
  is_present: boolean;
}

export default function SalaControlPage() {
  const params = useParams();
  const assemblyId = params.id as string;
  
  const [asamblea, setAsamblea] = useState<any>(null);
  const [propiedades, setPropiedades] = useState<PropertyWithOwner[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatosSala = async () => {
    setCargando(true);
    const complexId = localStorage.getItem("complex_id");

    if (!complexId) {
      setError("No hay un conjunto seleccionado.");
      setCargando(false);
      return;
    }

    try {
      const { data: asmData, error: asmError } = await supabase
        .from("assemblies")
        .select("*")
        .eq("id", assemblyId)
        .single();
      if (asmError) throw asmError;
      setAsamblea(asmData);

      const { data: propData, error: propError } = await supabase
        .from("properties")
        .select("id, tower, number, coefficient")
        .eq("complex_id", complexId);
      if (propError) throw propError;

      const { data: relData, error: relError } = await supabase
        .from("property_owners")
        .select("property_id, owners(full_name, document_number)")
        .eq("is_main_contact", true);
      if (relError) throw relError;

      const { data: attData, error: attError } = await supabase
        .from("assembly_attendees")
        .select("property_id, is_present")
        .eq("assembly_id", assemblyId);
      if (attError) throw attError;

      const listaUnificada: PropertyWithOwner[] = propData.map((prop: any) => {
        const relacion = relData.find((r: any) => r.property_id === prop.id);
        const asistencia = attData.find((a: any) => a.property_id === prop.id);
        const propietarioInfo = relacion?.owners as unknown as { full_name: string; document_number: string } | null;

        return {
          property_id: prop.id,
          tower: prop.tower,
          number: prop.number,
          coefficient: Number(prop.coefficient) || 0,
          owner_name: propietarioInfo?.full_name || "Sin propietario",
          document_number: propietarioInfo?.document_number || "N/A",
          is_present: asistencia ? asistencia.is_present : false,
        };
      });

      // Ordenar alfabéticamente por número de apartamento para que el reporte salga ordenado
      listaUnificada.sort((a, b) => a.number.localeCompare(b.number));
      setPropiedades(listaUnificada);
      setError(null);
    } catch (err: any) {
      setError("Error al cargar la sala de control: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosSala();
  }, [assemblyId]);

  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setPropiedades((prev) =>
      prev.map((p) => (p.property_id === propertyId ? { ...p, is_present: nuevoEstado } : p))
    );

    try {
      if (nuevoEstado) {
        await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propertyId, is_present: true }]);
      } else {
        await supabase.from("assembly_attendees").delete().eq("assembly_id", assemblyId).eq("property_id", propertyId);
      }
    } catch (err) {
      console.error("Error al actualizar asistencia:", err);
      cargarDatosSala();
    }
  };

  const quorumActual = propiedades.filter((p) => p.is_present).reduce((acc, curr) => acc + curr.coefficient, 0);

  // NUEVA FUNCIÓN: Generador de Reporte Excel
  const exportarAExcel = () => {
    // 1. Preparamos los datos con nombres de columnas amigables
    const datosExportar = propiedades.map(p => ({
      "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
      "Propietario": p.owner_name,
      "Documento": p.document_number,
      "Coeficiente (%)": p.coefficient,
      "Estado de Asistencia": p.is_present ? "PRESENTE" : "AUSENTE"
    }));

    // 2. Agregamos una fila al final con el resumen del Quórum
    datosExportar.push({
      "Inmueble": "TOTAL QUÓRUM REGISTRADO",
      "Propietario": "",
      "Documento": "",
      "Coeficiente (%)": quorumActual,
      "Estado de Asistencia": ""
    });

    // 3. Creamos el libro de Excel y lo descargamos
    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
    XLSX.writeFile(libro, `Reporte_Asistencia_${asamblea?.type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (cargando) return <div className="p-8 text-blue-600 font-medium animate-pulse">Cargando Sala de Control...</div>;
  if (error || !asamblea) return <div className="p-8 text-red-600 font-medium">{error || "Asamblea no encontrada."}</div>;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera y Tarjeta de Quórum en Vivo */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {asamblea.type}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                {asamblea.modality}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950">Sala de Control de Asistencia</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Sesión Activa</p>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* NUEVO BOTÓN DE EXPORTACIÓN */}
            <button 
              onClick={exportarAExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Exportar Excel
            </button>

            {/* Indicador Visual de Quórum */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center min-w-[200px]">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Quórum Registrado</p>
              <p className={`text-3xl font-extrabold ${quorumActual >= 50 ? 'text-green-600' : 'text-blue-900'}`}>
                {quorumActual.toFixed(2)}%
              </p>
              <div className="w-full bg-blue-200 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${quorumActual >= 50 ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(quorumActual, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Check-in de Propietarios */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-blue-950">Padrón de Copropietarios</h3>
            <span className="text-sm text-gray-500 font-medium">
              Total Presentes: <strong className="text-blue-900">{propiedades.filter(p => p.is_present).length}</strong> / {propiedades.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-blue-900 uppercase bg-blue-50/70 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Propietario Principal</th>
                  <th className="px-6 py-3">Documento</th>
                  <th className="px-6 py-3">Coeficiente</th>
                  <th className="px-6 py-3 text-center">Estado Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propiedades.map((p) => (
                  <tr key={p.property_id} className={`hover:bg-blue-50/30 transition-colors ${p.is_present ? 'bg-green-50/20' : ''}`}>
                    <td className="px-6 py-4 font-bold text-blue-950">
                      {p.tower ? `Torre ${p.tower} - ` : ""}Apto {p.number}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{p.owner_name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{p.document_number}</td>
                    <td className="px-6 py-4 font-semibold text-blue-700">{p.coefficient}%</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleAsistencia(p.property_id, p.is_present)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm
                          ${p.is_present 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}`}
                      >
                        {p.is_present ? '✓ Presente' : 'Registrar Ingreso'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}