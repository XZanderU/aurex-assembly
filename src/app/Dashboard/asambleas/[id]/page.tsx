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
  const [preguntas, setPreguntas] = useState<any[]>([]);
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de UI
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'VOTACION'>('CHECKIN');
  const [modalOpen, setModalOpen] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | null>(null);
  const [formDelegado, setFormDelegado] = useState({ nombre: "", documento: "" });
  
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [creandoPregunta, setCreandoPregunta] = useState(false);

  // NUEVOS ESTADOS: Votación en Vivo
  const [preguntaActiva, setPreguntaActiva] = useState<any>(null);
  const [votos, setVotos] = useState<any[]>([]);
  const [cargandoVotos, setCargandoVotos] = useState(false);

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

      const { data: attData, error: attError } = await supabase.from("assembly_attendees").select("property_id, is_present, is_proxy, proxy_name, proxy_document").eq("assembly_id", assemblyId);
      if (attError) throw attError;

      const { data: qData, error: qError } = await supabase.from("assembly_questions").select("*").eq("assembly_id", assemblyId).order("created_at", { ascending: false });
      if (qError) throw qError;
      setPreguntas(qData || []);

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

  // Funciones Check-in
  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setPropiedades(prev => prev.map(p => p.property_id === propertyId ? { ...p, is_present: nuevoEstado, is_proxy: false, proxy_name: "", proxy_document: "" } : p));
    try {
      if (nuevoEstado) await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propertyId, is_present: true, is_proxy: false }]);
      else await supabase.from("assembly_attendees").delete().eq("assembly_id", assemblyId).eq("property_id", propertyId);
    } catch (err) { console.error(err); cargarDatosSala(); }
  };

  const registrarDelegado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propiedadSeleccionada) return;
    setPropiedades(prev => prev.map(p => p.property_id === propiedadSeleccionada ? { ...p, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento } : p));
    setModalOpen(false);
    setFormDelegado({ nombre: "", documento: "" });
    try {
      await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propiedadSeleccionada, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento }]);
    } catch (err) { console.error(err); cargarDatosSala(); }
  };

  // Funciones Preguntas
  const crearPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPregunta.trim()) return;
    setCreandoPregunta(true);
    try {
      const { data, error } = await supabase.from("assembly_questions").insert([{ assembly_id: assemblyId, title: nuevaPregunta, status: 'OPEN' }]).select().single();
      if (error) throw error;
      setPreguntas([data, ...preguntas]);
      setNuevaPregunta("");
    } catch (err) { alert("Hubo un error al crear la votación."); } 
    finally { setCreandoPregunta(false); }
  };

  // NUEVAS FUNCIONES: Panel de Votos
  const abrirPanelVotacion = async (pregunta: any) => {
    setPreguntaActiva(pregunta);
    setCargandoVotos(true);
    // Cargamos los votos que ya se hayan registrado para esta pregunta
    const { data, error } = await supabase.from("assembly_votes").select("*").eq("question_id", pregunta.id);
    if (!error && data) {
      setVotos(data);
    }
    setCargandoVotos(false);
  };

  const registrarVoto = async (propertyId: string, option: 'FAVOR' | 'CONTRA' | 'BLANCO', coefficient: number) => {
    // 1. Actualización Optimista en UI
    setVotos(prev => {
      const filtrados = prev.filter(v => v.property_id !== propertyId); // Quitamos si ya había votado otra cosa
      return [...filtrados, { property_id: propertyId, vote_option: option, coefficient }];
    });

    try {
      // 2. Base de datos: Como un apto solo tiene 1 voto, borramos el anterior e insertamos el nuevo
      await supabase.from("assembly_votes").delete().eq("question_id", preguntaActiva.id).eq("property_id", propertyId);
      await supabase.from("assembly_votes").insert([{
        question_id: preguntaActiva.id,
        property_id: propertyId,
        vote_option: option,
        coefficient: coefficient
      }]);
    } catch (err) {
      console.error("Error al registrar voto", err);
    }
  };

  // Cálculos en tiempo real
  const quorumActual = propiedades.filter((p) => p.is_present).reduce((acc, curr) => acc + curr.coefficient, 0);
  
  // Matemáticas de la Votación Activa
  const votosFavor = votos.filter(v => v.vote_option === 'FAVOR').reduce((sum, v) => sum + v.coefficient, 0);
  const votosContra = votos.filter(v => v.vote_option === 'CONTRA').reduce((sum, v) => sum + v.coefficient, 0);
  const votosBlanco = votos.filter(v => v.vote_option === 'BLANCO').reduce((sum, v) => sum + v.coefficient, 0);
  const totalVotado = votosFavor + votosContra + votosBlanco;

  const exportarAExcel = () => {
    const datosExportar = propiedades.map(p => ({
      "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
      "Propietario": p.owner_name,
      "Coeficiente (%)": p.coefficient,
      "Asistencia": p.is_present ? "PRESENTE" : "AUSENTE",
      "Tipo Asistente": p.is_present ? (p.is_proxy ? "DELEGADO" : "TITULAR") : "",
      "Nombre Delegado": p.is_proxy ? p.proxy_name : "",
    }));
    datosExportar.push({ "Inmueble": "TOTAL QUÓRUM", "Propietario": "", "Coeficiente (%)": quorumActual, "Asistencia": "", "Tipo Asistente": "", "Nombre Delegado": "" });
    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asistencia");
    XLSX.writeFile(libro, `Reporte_Asistencia_${asamblea?.type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (cargando) return <div className="p-8 text-blue-600 font-medium animate-pulse">Cargando Sala de Control...</div>;

  return (
    <div className="p-8 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-950">Sala de Control</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">Sesión Activa - {asamblea?.type}</p>
          </div>
          <div className="flex gap-4 items-center">
            {activeTab === 'CHECKIN' && (
              <button onClick={exportarAExcel} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg">Exportar Excel</button>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center min-w-37.5">
              <p className="text-xs text-blue-600 font-bold uppercase">Quórum</p>
              <p className="text-2xl font-extrabold text-blue-900">{quorumActual.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button onClick={() => setActiveTab('CHECKIN')} className={`py-3 px-6 font-bold text-sm border-b-2 ${activeTab === 'CHECKIN' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>1. Padrón y Asistencia</button>
          <button onClick={() => setActiveTab('VOTACION')} className={`py-3 px-6 font-bold text-sm border-b-2 ${activeTab === 'VOTACION' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>2. Votaciones en Vivo</button>
        </div>

        {/* PESTAÑA 1: CHECKIN (Mantenida idéntica por brevedad visual, el código funciona igual) */}
        {activeTab === 'CHECKIN' && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-blue-900 uppercase bg-blue-50/70 border-b border-blue-100">
                <tr>
                  <th className="px-6 py-3">Inmueble</th>
                  <th className="px-6 py-3">Propietario / Delegado</th>
                  <th className="px-6 py-3 text-center">Coef.</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propiedades.map((p) => (
                  <tr key={p.property_id} className={p.is_present ? 'bg-green-50/20' : ''}>
                    <td className="px-6 py-4 font-bold text-blue-950">{p.tower ? `T${p.tower}-` : ""}Apto {p.number}</td>
                    <td className="px-6 py-4">
                      {p.owner_name} {p.is_proxy && <span className="ml-2 text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Delegado: {p.proxy_name}</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-center text-blue-700">{p.coefficient}%</td>
                    <td className="px-6 py-4 text-center">
                      {p.is_present ? (
                        <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs font-bold">✓ Registrado (Anular)</button>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-blue-600 hover:text-white text-xs font-bold border">Titular</button>
                          <button onClick={() => { setPropiedadSeleccionada(p.property_id); setModalOpen(true); }} className="px-3 py-1.5 rounded bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 text-xs font-bold border border-purple-200">Poder</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
{/* PESTAÑA 2: VOTACIONES */}
{activeTab === 'VOTACION' && (
  <div className="space-y-6">
    
    {/* Panel de Creación de Pregunta */}
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <h3 className="text-lg font-bold text-blue-950 mb-4">Lanzar Nueva Votación</h3>
      <form onSubmit={crearPregunta} className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-semibold text-gray-700 mb-1 block">Pregunta o Tema a decidir</label>
          <input 
            type="text" 
            required 
            value={nuevaPregunta} 
            onChange={e => setNuevaPregunta(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" 
            placeholder="Ej. ¿Aprueba la gestión y el presupuesto?" 
          />
        </div>
        <button 
          type="submit" 
          disabled={creandoPregunta || quorumActual === 0}
          className={`py-3 px-6 rounded-lg font-bold text-white shadow-sm transition-colors ${quorumActual === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {creandoPregunta ? 'Creando...' : 'Abrir Votación'}
        </button>
      </form>
    </div>

    {/* Listado de Preguntas con Control de Estado */}
    <div className="space-y-4">
      {preguntas.map((pregunta) => (
        <div key={pregunta.id} className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="text-lg font-bold text-blue-900">{pregunta.title}</h4>
            <p className="text-xs font-bold mt-1">
              Estado: <span className={pregunta.status === 'OPEN' ? 'text-green-600' : 'text-red-600'}>
                {pregunta.status === 'OPEN' ? '🟢 ABIERTA (Recibiendo decisiones)' : '🔴 CERRADA (Resultados Congelados)'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => abrirPanelVotacion(pregunta)} 
              className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              {pregunta.status === 'OPEN' ? 'Administrar / Ver Votos' : 'Ver Resultados Finales'}
            </button>
            
            {pregunta.status === 'OPEN' && (
              <button 
                onClick={async () => {
                  if (!confirm("¿Estás seguro de cerrar esta votación? Los datos quedarán bloqueados.")) return;
                  await supabase.from("assembly_questions").update({ status: 'CLOSED' }).eq("id", pregunta.id);
                  cargarDatosSala();
                }}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Cerrar Votación
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
    
  </div>
)}

      </div>

      {/* MODALES */}
      
      {/* 1. Modal Delegado */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           {/* ... Mantenido idéntico por brevedad, es el mismo de antes ... */}
           <div className="bg-white rounded-xl p-6 w-full max-w-md">
             <h3 className="text-xl font-bold mb-4">Registrar Poder Legal</h3>
             <form onSubmit={registrarDelegado} className="space-y-4">
               <input required type="text" value={formDelegado.nombre} onChange={e => setFormDelegado({...formDelegado, nombre: e.target.value})} className="w-full p-2 border rounded" placeholder="Nombre Delegado"/>
               <input required type="text" value={formDelegado.documento} onChange={e => setFormDelegado({...formDelegado, documento: e.target.value})} className="w-full p-2 border rounded" placeholder="Documento" />
               <div className="flex gap-2">
                 <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 bg-gray-200 rounded font-bold">Cancelar</button>
                 <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded font-bold">Registrar</button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* 2. NUEVO: MODAL PANEL DE VOTACIÓN */}
      {preguntaActiva && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Cabecera del Panel */}
            <div className="bg-blue-950 p-6 text-white flex justify-between items-center">
              <div>
                <span className="text-xs font-bold bg-blue-800 px-2 py-1 rounded text-blue-200">VOTACIÓN EN CURSO</span>
                <h2 className="text-2xl font-bold mt-2">{preguntaActiva.title}</h2>
              </div>
              <button onClick={() => setPreguntaActiva(null)} className="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full font-bold text-xl">×</button>
            </div>

            {/* Barra de Resultados en Vivo */}
            <div className="bg-gray-50 p-6 border-b flex justify-between gap-4">
              <div className="flex-1 bg-white p-4 rounded-xl border border-green-200 text-center">
                <p className="text-xs font-bold text-green-600 uppercase">A Favor</p>
                <p className="text-2xl font-bold text-green-700">{votosFavor.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-red-200 text-center">
                <p className="text-xs font-bold text-red-600 uppercase">En Contra</p>
                <p className="text-2xl font-bold text-red-700">{votosContra.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-gray-300 text-center">
                <p className="text-xs font-bold text-gray-500 uppercase">En Blanco</p>
                <p className="text-2xl font-bold text-gray-600">{votosBlanco.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                <p className="text-xs font-bold text-blue-600 uppercase">Participación</p>
                <p className="text-2xl font-bold text-blue-900">{totalVotado.toFixed(2)}% / {quorumActual.toFixed(2)}%</p>
              </div>
            </div>

            {/* Lista Interactiva de Inmuebles Presentes (Solo los que hicieron check-in) */}
            <div className="overflow-y-auto p-6 flex-1">
              <h3 className="font-bold text-blue-900 mb-4">Registro de votos por apartamento asistente:</h3>
              {cargandoVotos ? (
                <p className="text-center text-gray-500 animate-pulse">Cargando votos...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {propiedades.filter(p => p.is_present).map(p => {
                    // Buscar si este apartamento ya votó
                    const miVoto = votos.find(v => v.property_id === p.property_id)?.vote_option;

                    return (
                      <div key={p.property_id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${miVoto ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}>
                        <div>
                          <p className="font-bold text-gray-800">Apto {p.number}</p>
                          <p className="text-xs text-blue-600 font-semibold">Coef: {p.coefficient}%</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => registrarVoto(p.property_id, 'FAVOR', p.coefficient)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${miVoto === 'FAVOR' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}
                          >Favor</button>
                          <button 
                            onClick={() => registrarVoto(p.property_id, 'CONTRA', p.coefficient)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${miVoto === 'CONTRA' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                          >Contra</button>
                          <button 
                            onClick={() => registrarVoto(p.property_id, 'BLANCO', p.coefficient)}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${miVoto === 'BLANCO' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >Blanco</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}