"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

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

  // Cargar datos de la asamblea y la lista de propiedades con su estado de asistencia
  const cargarDatosSala = async () => {
    setCargando(true);
    const complexId = localStorage.getItem("complex_id");

    if (!complexId) {
      setError("No hay un conjunto seleccionado.");
      setCargando(false);
      return;
    }

    try {
      // 1. Obtener detalles de la asamblea
      const { data: asmData, error: asmError } = await supabase
        .from("assemblies")
        .select("*")
        .eq("id", assemblyId)
        .single();

      if (asmError) throw asmError;
      setAsamblea(asmData);

      // 2. Obtener todas las propiedades del conjunto
      const { data: propData, error: propError } = await supabase
        .from("properties")
        .select("id, tower, number, coefficient")
        .eq("complex_id", complexId);

      if (propError) throw propError;

      // 3. Obtener los propietarios vinculados a esas propiedades
      const { data: relData, error: relError } = await supabase
        .from("property_owners")
        .select("property_id, owners(full_name, document_number)")
        .eq("is_main_contact", true);

      if (relError) throw relError;

      // 4. Obtener los registros de asistencia actuales para esta asamblea
      const { data: attData, error: attError } = await supabase
        .from("assembly_attendees")
        .select("property_id, is_present")
        .eq("assembly_id", assemblyId);

      if (attError) throw attError;

      // Mapear y unificar toda la información en una sola estructura manejable
      const listaUnificada: PropertyWithOwner[] = propData.map((prop: any) => {
        const relacion = relData.find((r: any) => r.property_id === prop.id);
        const asistencia = attData.find((a: any) => a.property_id === prop.id);
        
        // Extraer el nombre del propietario del objeto anidado de Supabase
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

  // Función para alternar el Check-in (Asistencia) de un inmueble
  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;

    // Optimistic UI update (actualizamos la pantalla de inmediato por velocidad)
    setPropiedades((prev) =>
      prev.map((p) => (p.property_id === propertyId ? { ...p, is_present: nuevoEstado } : p))
    );

    try {
      if (nuevoEstado) {
        // Si marca asistencia, insertamos el registro
        await supabase.from("assembly_attendees").insert([
          {
            assembly_id: assemblyId,
            property_id: propertyId,
            is_present: true,
          },
        ]);
      } else {
        // Si desmarca, borramos el registro de asistencia
        await supabase
          .from("assembly_attendees")
          .delete()
          .eq("assembly_id", assemblyId)
          .eq("property_id", propertyId);
      }
    } catch (err) {
      console.error("Error al actualizar asistencia:", err);
      // Revertir en caso de fallo en BD recargando los datos
      cargarDatosSala();
    }
  };

  // Cálculo en tiempo real del Quórum (Suma de coeficientes de los presentes)
  const quorumActual = propiedades
    .filter((p) => p.is_present)
    .reduce((acc, curr) => acc + curr.coefficient, 0);

  if (cargando) {
    return <div className="p-8 text-blue-600 font-medium animate-pulse">Cargando Sala de Control y Padrón...</div>;
  }

  if (error || !asamblea) {
    return <div className="p-8 text-red-600 font-medium">{error || "Asamblea no encontrada."}</div>;
  }

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

        {/* Tabla de Check-in de Propietarios */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-blue-950">Padrón de Copropietarios e Inmuebles</h3>
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
                        {p.is_present ? '✓ Presente (Check-in)' : 'Registrar Ingreso'}
                      </button>
                    </td>
                  </tr>
                ))}
                {propiedades.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No hay propiedades registradas en este conjunto. Importa un archivo Excel primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}