"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";
import * as XLSX from "xlsx";

interface PropertyWithOwner {
  property_id: string;
  tower: string | null;
  number: string;
  coefficient: number;
  owner_name: string;
  document_number: string;
  is_present: boolean;
  is_proxy?: boolean;
  proxy_name?: string;
  proxy_document?: string;
}

export default function SalaControlPage() {
  const params = useParams();
  const assemblyId = params.id as string;
  
  const [asamblea, setAsamblea] = useState<any>(null);
  const [propiedades, setPropiedades] = useState<PropertyWithOwner[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el Modal de Delegado
  const [modalOpen, setModalOpen] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | null>(null);
  const [formDelegado, setFormDelegado] = useState({ nombre: "", documento: "" });

  const cargarDatosSala = async () => {
    setCargando(true);
    const complexId = localStorage.getItem("complex_id");

    if (!complexId) {
      setError("No hay un conjunto seleccionado.");
      setCargando(false);
      return;
    }

    try {
      const { data: asmData, error: asmError } = await supabase.from("assemblies").select("*").eq("id", assemblyId).single();
      if (asmError) throw asmError;
      setAsamblea(asmData);

      const { data: propData, error: propError } = await supabase.from("properties").select("id, tower, number, coefficient").eq("complex_id", complexId);
      if (propError) throw propError;

      const { data: relData, error: relError } = await supabase.from("property_owners").select("property_id, owners(full_name, document_number)").eq("is_main_contact", true);
      if (relError) throw relError;

      // Actualizamos la consulta para traer también los datos del apoderado
      const { data: attData, error: attError } = await supabase.from("assembly_attendees").select("property_id, is_present, is_proxy, proxy_name, proxy_document").eq("assembly_id", assemblyId);
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
          is_proxy: asistencia ? asistencia.is_proxy : false,
          proxy_name: asistencia ? asistencia.proxy_name : undefined,
          proxy_document: asistencia ? asistencia.proxy_document : undefined,
        };
      });

      listaUnificada.sort((a, b) => a.number.localeCompare(b.number));
      setPropiedades(listaUnificada);
      setError(null);
    } catch (err: any) {
      setError("Error al cargar la sala: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosSala();
  }, [assemblyId]);

  // Check-in normal (Asiste el dueño) o Desmarcar asistencia
  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    
    // UI Optimista
    setPropiedades(prev => prev.map(p => p.property_id === propertyId ? { ...p, is_present: nuevoEstado, is_proxy: false, proxy_name: "", proxy_document: "" } : p));

    try {
      if (nuevoEstado) {
        await supabase.from("assembly_attendees").insert([{ 
          assembly_id: assemblyId, property_id: propertyId, is_present: true, is_proxy: false 
        }]);
      } else {
        await supabase.from("assembly_attendees").delete().eq("assembly_id", assemblyId).eq("property_id", propertyId);
      }
    } catch (err) {
      console.error(err);
      cargarDatosSala();
    }
  };

  // Check-in con Apoderado Legal
  const registrarDelegado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propiedadSeleccionada) return;

    // UI Optimista
    setPropiedades(prev => prev.map(p => p.property_id === propiedadSeleccionada ? { 
      ...p, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento 
    } : p));

    setModalOpen(false);
    setFormDelegado({ nombre: "", documento: "" });

    try {
      await supabase.from("assembly_attendees").insert([{ 
        assembly_id: assemblyId, 
        property_id: propiedadSeleccionada, 
        is_present: true, 
        is_proxy: true,
        proxy_name: formDelegado.nombre,
        proxy_document: formDelegado.documento
      }]);
    } catch (err) {
      console.error(err);
      cargarDatosSala();
    }
  };

  const quorumActual = propiedades.filter((p) => p.is_present).reduce((acc, curr) => acc + curr.coefficient, 0);

  const exportarAExcel = () => {
    const datosExportar = propiedades.map(p => ({
      "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
      "Propietario": p.owner_name,
      "Documento": p.document_number,
      "Coeficiente (%)": p.coefficient,
      "Estado de Asistencia": p.is_present ? "PRESENTE" : "AUSENTE",
      "Tipo Asistente": p.is_present ? (p.is_proxy ? "DELEGADO" : "PROPIETARIO") : "",
      "Nombre Delegado": p.is_proxy ? p.proxy_name : "",
      "Doc. Delegado": p.is_proxy ? p.proxy_document : ""
    }));

    datosExportar.push({ "Inmueble": "TOTAL QUÓRUM REGISTRADO", "Propietario": "", "Documento": "", "Coeficiente (%)": quorumActual, "Estado de Asistencia": "", "Tipo Asistente": "", "Nombre Delegado": "", "Doc. Delegado": "" });

    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
    XLSX.writeFile(libro, `Reporte_Asistencia_${asamblea?.type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (cargando) return <div className="p-8 text-blue-600 font-medium animate-pulse">Cargando Sala de Control...</div>;
  if (error || !asamblea) return <div className="p-8 text-red-600 font-medium">{error || "Asamblea no encontrada."}</div>;

  return (
    <div className="p-8 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera y Quórum */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">{asamblea.type}</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-950">Sala de Control de Asistencia</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Sesión Activa</p>
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={exportarAExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-colors">
              Exportar Excel
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center min-w-[200px]">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Quórum</p>
              <p className={`text-3xl font-extrabold ${quorumActual >= 50 ? 'text-green-600' : 'text-blue-900'}`}>{quorumActual.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* Tabla de Check-in */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-blue-900 uppercase bg-blue-50/70 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Propietario Principal</th>
                  <th className="px-6 py-3 text-center">Coeficiente</th>
                  <th className="px-6 py-3 text-center">Acciones de Ingreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propiedades.map((p) => (
                  <tr key={p.property_id} className={`hover:bg-blue-50/30 transition-colors ${p.is_present ? 'bg-green-50/20' : ''}`}>
                    <td className="px-6 py-4 font-bold text-blue-950">{p.tower ? `Torre ${p.tower} - ` : ""}Apto {p.number}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{p.owner_name}</div>
                      {p.is_proxy && (
                        <div className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                          Delegado: {p.proxy_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-700 text-center">{p.coefficient}%</td>
                    <td className="px-6 py-4 text-center">
                      {p.is_present ? (
                        <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-4 py-2 rounded-lg font-bold text-xs bg-green-600 hover:bg-red-600 hover:text-white text-white shadow-sm transition-colors">
                          ✓ Asistiendo (Anular)
                        </button>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-2 rounded-lg font-bold text-xs bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 border border-gray-300 transition-colors">
                            Ingresa Titular
                          </button>
                          <button onClick={() => { setPropiedadSeleccionada(p.property_id); setModalOpen(true); }} className="px-3 py-2 rounded-lg font-bold text-xs bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 transition-colors">
                            Con Poder
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE DELEGADO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-blue-100">
            <h3 className="text-xl font-bold text-blue-950 mb-4">Registrar Poder Legal</h3>
            <form onSubmit={registrarDelegado} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nombre del Delegado</label>
                <input required type="text" value={formDelegado.nombre} onChange={e => setFormDelegado({...formDelegado, nombre: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Juan Pérez" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Documento del Delegado</label>
                <input required type="text" value={formDelegado.documento} onChange={e => setFormDelegado({...formDelegado, documento: e.target.value})} className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. 1020304050" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">Registrar Asistencia</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}