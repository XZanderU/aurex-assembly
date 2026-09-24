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
  is_present: boolean;
  is_proxy?: boolean;
  proxy_name?: string;
  proxy_document?: string; // NUEVO: Se agrega el documento a la interfaz
  access_pin?: string;
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
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'VOTACION' | 'DEBATE'>('CHECKIN');
  
  // Estados para Delegados
  const [modalOpen, setModalOpen] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | null>(null);
  const [formDelegado, setFormDelegado] = useState({ nombre: "", documento: "" });
  
  // Estados para Votaciones
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [creandoPregunta, setCreandoPregunta] = useState(false);
  const [preguntaActiva, setPreguntaActiva] = useState<any>(null);
  const [votos, setVotos] = useState<any[]>([]);
  
  // Estados para Debate y Enlace
  const [turnos, setTurnos] = useState<any[]>([]);
  const [streamingUrl, setStreamingUrl] = useState("");
  const [guardandoLink, setGuardandoLink] = useState(false);

  const generarPin = () => Math.floor(1000 + Math.random() * 9000).toString();

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
      setStreamingUrl(asmData.streaming_url || "");

      const { data: propData } = await supabase.from("properties").select("id, tower, number, coefficient").eq("complex_id", complexId);
      const { data: relData } = await supabase.from("property_owners").select("property_id, owners(full_name)").eq("is_main_contact", true);
      // NUEVO: Ahora solicitamos proxy_document de la base de datos
      const { data: attData } = await supabase.from("assembly_attendees").select("property_id, is_present, is_proxy, proxy_name, proxy_document, access_pin").eq("assembly_id", assemblyId);
      const { data: qData } = await supabase.from("assembly_questions").select("*").eq("assembly_id", assemblyId).order("created_at", { ascending: false });
      
      const { data: turnosData } = await supabase.from("assembly_speakers").select("*, properties(number, tower)").eq("assembly_id", assemblyId).order("created_at", { ascending: true });

      setPreguntas(qData || []);
      setTurnos(turnosData || []);

      const listaUnificada: PropertyWithOwner[] = (propData || []).map((prop: any) => {
        const relacion = (relData || []).find((r: any) => r.property_id === prop.id);
        const asistencia = (attData || []).find((a: any) => a.property_id === prop.id);
        const propietarioInfo = relacion?.owners as unknown as { full_name: string } | null;

        return {
          property_id: prop.id,
          tower: prop.tower,
          number: prop.number,
          coefficient: Number(prop.coefficient) || 0,
          owner_name: propietarioInfo?.full_name || "Sin propietario",
          is_present: asistencia ? asistencia.is_present : false,
          is_proxy: asistencia ? asistencia.is_proxy : false,
          proxy_name: asistencia ? asistencia.proxy_name : undefined,
          proxy_document: asistencia ? asistencia.proxy_document : undefined, // NUEVO
          access_pin: asistencia ? asistencia.access_pin : undefined,
        };
      });

      listaUnificada.sort((a, b) => a.number.localeCompare(b.number));
      setPropiedades(listaUnificada);
      setError(null);
    } catch (err: any) {
      setError("Error al cargar la sala de asamblea.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosSala();
  }, [assemblyId]);

  // TIEMPO REAL ADMINISTRADOR (Votos y Turnos)
  useEffect(() => {
    let canalVotos: any;
    if (preguntaActiva && preguntaActiva.status === 'OPEN') {
      canalVotos = supabase.channel('votos-admin-vivo')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assembly_votes', filter: `question_id=eq.${preguntaActiva.id}` }, (payload) => {
          setVotos(prev => prev.some(v => v.property_id === payload.new.property_id) ? prev : [...prev, payload.new]);
        }).subscribe();
    }

    const canalTurnos = supabase.channel('turnos-admin-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assembly_speakers', filter: `assembly_id=eq.${assemblyId}` }, async (payload) => {
        const { data: turnosData } = await supabase.from("assembly_speakers").select("*, properties(number, tower)").eq("assembly_id", assemblyId).order("created_at", { ascending: true });
        setTurnos(turnosData || []);
      }).subscribe();

    return () => {
      if (canalVotos) supabase.removeChannel(canalVotos);
      supabase.removeChannel(canalTurnos);
    };
  }, [preguntaActiva, assemblyId]);

  // Funciones Check-in
  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const nuevoPin = nuevoEstado ? generarPin() : "";
    setPropiedades(prev => prev.map(p => p.property_id === propertyId ? { ...p, is_present: nuevoEstado, is_proxy: false, proxy_name: "", proxy_document: "", access_pin: nuevoPin } : p));
    try {
      if (nuevoEstado) await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propertyId, is_present: true, access_pin: nuevoPin }]);
      else await supabase.from("assembly_attendees").delete().eq("assembly_id", assemblyId).eq("property_id", propertyId);
    } catch (err) { cargarDatosSala(); }
  };

  const registrarDelegado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propiedadSeleccionada) return;
    
    const nuevoPin = generarPin();
    
    // NUEVO: Agregamos proxy_document a la actualización visual
    setPropiedades(prev => prev.map(p => p.property_id === propiedadSeleccionada ? { ...p, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento, access_pin: nuevoPin } : p));
    setModalOpen(false);
    
    try {
      // NUEVO: Guardamos proxy_document en Supabase
      await supabase.from("assembly_attendees").insert([{ 
        assembly_id: assemblyId, 
        property_id: propiedadSeleccionada, 
        is_present: true, 
        is_proxy: true, 
        proxy_name: formDelegado.nombre, 
        proxy_document: formDelegado.documento,
        access_pin: nuevoPin 
      }]);
      setFormDelegado({ nombre: "", documento: "" });
    } catch (err) { 
      setError("Error al guardar el delegado. Verifique la conexión.");
      cargarDatosSala(); 
    }
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
    } finally { setCreandoPregunta(false); }
  };

  const cerrarVotacion = async (preguntaId: string) => {
    if (!confirm("¿Cerrar votación de forma permanente?")) return;
    setPreguntas(prev => prev.map(q => q.id === preguntaId ? { ...q, status: 'CLOSED' } : q));
    if (preguntaActiva?.id === preguntaId) setPreguntaActiva({ ...preguntaActiva, status: 'CLOSED' });
    await supabase.from("assembly_questions").update({ status: 'CLOSED' }).eq("id", preguntaId);
  };

  const abrirPanelVotacion = async (pregunta: any) => {
    setPreguntaActiva(pregunta);
    const { data } = await supabase.from("assembly_votes").select("*").eq("question_id", pregunta.id);
    setVotos(data || []);
  };

  const registrarVotoAdmin = async (propertyId: string, option: 'FAVOR'|'CONTRA'|'BLANCO', coefficient: number) => {
    if (preguntaActiva.status !== 'OPEN') return; 
    setVotos(prev => [...prev.filter(v => v.property_id !== propertyId), { property_id: propertyId, vote_option: option, coefficient }]);
    await supabase.from("assembly_votes").delete().eq("question_id", preguntaActiva.id).eq("property_id", propertyId);
    await supabase.from("assembly_votes").insert([{ question_id: preguntaActiva.id, property_id: propertyId, vote_option: option, coefficient }]);
  };

  // Funciones de Debate y Streaming
  const guardarEnlaceTransmision = async () => {
    setGuardandoLink(true);
    await supabase.from("assemblies").update({ streaming_url: streamingUrl }).eq("id", assemblyId);
    alert("Enlace compartido con los propietarios al instante.");
    setGuardandoLink(false);
  };

  const cambiarEstadoTurno = async (turnoId: string, nuevoEstado: 'ACTIVE' | 'COMPLETED') => {
    if (nuevoEstado === 'ACTIVE') {
      await supabase.from("assembly_speakers").update({ status: 'COMPLETED' }).eq("assembly_id", assemblyId).eq("status", "ACTIVE");
    }
    await supabase.from("assembly_speakers").update({ status: nuevoEstado }).eq("id", turnoId);
  };

  // Cálculos en tiempo real
  const quorumActual = propiedades.filter((p) => p.is_present).reduce((acc, curr) => acc + curr.coefficient, 0);
  const votosFavor = votos.filter(v => v.vote_option === 'FAVOR').reduce((sum, v) => sum + v.coefficient, 0);
  const votosContra = votos.filter(v => v.vote_option === 'CONTRA').reduce((sum, v) => sum + v.coefficient, 0);
  const votosBlanco = votos.filter(v => v.vote_option === 'BLANCO').reduce((sum, v) => sum + v.coefficient, 0);
  const totalVotado = votosFavor + votosContra + votosBlanco;

  const exportarAExcel = async () => {
    try {
      // 1. HOJA DE PADRÓN Y ASISTENCIA
      const datosAsistencia = propiedades.map(p => ({
        "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
        "Coeficiente (%)": p.coefficient,
        "Asistencia": p.is_present ? "PRESENTE" : "AUSENTE",
        "Tipo": p.is_proxy ? "Delegado / Poder" : (p.is_present ? "Titular" : ""),
        "Nombre Asistente": p.is_proxy ? p.proxy_name : p.owner_name,
        "Documento": p.is_proxy ? (p.proxy_document || "No registrado") : "N/A",
        "PIN Acceso": p.is_present ? p.access_pin : ""
      }));
      datosAsistencia.push({ "Inmueble": "TOTAL QUÓRUM", "Coeficiente (%)": quorumActual, "Asistencia": "", "Tipo": "", "Nombre Asistente": "", "Documento": "", "PIN Acceso": "" });
      
      const questionIds = preguntas.map(q => q.id);
      
      // Aseguramos traer el property_id para la matriz detallada
      const { data: allVotes, error: votesError } = await supabase
        .from("assembly_votes")
        .select("question_id, property_id, vote_option, coefficient")
        .in("question_id", questionIds.length > 0 ? questionIds : ['dummy-id']);

      if (votesError) throw votesError;

      // 2. HOJA DE RESULTADOS GENERALES (Con conversión estricta a Number)
      const datosVotaciones: any[] = [];
      preguntas.forEach(q => {
        const vQ = allVotes?.filter(v => v.question_id === q.id) || [];
        const fv = vQ.filter(v => v.vote_option === 'FAVOR').reduce((a, c) => a + Number(c.coefficient), 0);
        const cv = vQ.filter(v => v.vote_option === 'CONTRA').reduce((a, c) => a + Number(c.coefficient), 0);
        const bv = vQ.filter(v => v.vote_option === 'BLANCO').reduce((a, c) => a + Number(c.coefficient), 0);
        
        datosVotaciones.push({ 
          "Pregunta": q.title, 
          "Estado": q.status === 'OPEN' ? 'ABIERTA' : 'CERRADA', 
          "A Favor (%)": fv.toFixed(3), 
          "En Contra (%)": cv.toFixed(3),
          "En Blanco (%)": bv.toFixed(3),
          "Total Participación (%)": (fv + cv + bv).toFixed(3)
        });
      });

      // 3. NUEVA HOJA: MATRIZ DETALLADA DE VOTOS POR INMUEBLE
      const detalleVotos = propiedades.map(p => {
        // Datos base del inmueble
        const filaDetalle: any = {
          "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
          "Coeficiente (%)": p.coefficient,
          "Asistencia": p.is_present ? "PRESENTE" : "AUSENTE"
        };

        // Creamos una columna dinámica por cada pregunta de la asamblea
        preguntas.forEach(q => {
          const votoInmueble = allVotes?.find(v => v.question_id === q.id && v.property_id === p.property_id);
          filaDetalle[q.title] = votoInmueble ? votoInmueble.vote_option : "NO VOTÓ";
        });

        return filaDetalle;
      });
      
      // Creación del libro de Excel con las 3 hojas
      const l = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(l, XLSX.utils.json_to_sheet(datosAsistencia), "1. Padrón");
      XLSX.utils.book_append_sheet(l, XLSX.utils.json_to_sheet(datosVotaciones), "2. Resultados Totales");
      XLSX.utils.book_append_sheet(l, XLSX.utils.json_to_sheet(detalleVotos), "3. Detalle por Inmueble");
      
      XLSX.writeFile(l, `Acta_Asamblea_${asamblea?.name ? asamblea.name.replace(/\s+/g, '_') : new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert("Hubo un error al generar el archivo Excel. Verifica la conexión.");
    }
  };

  if (cargando) return <div className="p-8 animate-pulse text-blue-600">Cargando Sala...</div>;

  return (
    <div className="p-8 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* CABECERA */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-950">Sala de Control</h1>
            {asamblea?.name && <p className="text-sm font-semibold text-gray-500 uppercase mt-1">{asamblea.name}</p>}
          </div>
          <div className="flex gap-4 items-center">
            <button onClick={exportarAExcel} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg">Descargar Acta</button>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center min-w-37.5">
              <p className="text-xs font-bold uppercase text-blue-600">Quórum</p>
              <p className="text-2xl font-extrabold text-blue-900">{quorumActual.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* MENÚ PESTAÑAS */}
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
          <button onClick={() => setActiveTab('CHECKIN')} className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CHECKIN' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>1. Padrón y Asistencia</button>
          <button onClick={() => setActiveTab('VOTACION')} className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'VOTACION' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>2. Votaciones en Vivo</button>
          <button onClick={() => setActiveTab('DEBATE')} className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'DEBATE' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}>
            3. Intervenciones 
            {turnos.filter(t => t.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{turnos.filter(t => t.status === 'PENDING').length}</span>
            )}
          </button>
        </div>

        {/* PESTAÑA 1: CHECKIN */}
        {activeTab === 'CHECKIN' && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-blue-50 text-blue-900 uppercase text-xs">
                <tr><th className="px-6 py-3">Inmueble</th><th className="px-6 py-3">Propietario / Delegado</th><th className="px-6 py-3 text-center">Coef.</th><th className="px-6 py-3 text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propiedades.map((p) => (
                  <tr key={p.property_id} className={p.is_present ? 'bg-green-50/20' : ''}>
                    <td className="px-6 py-4 font-bold text-blue-950">{p.tower ? `T${p.tower}-` : ""}Apto {p.number}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{p.owner_name}</div>
                      {p.is_proxy && (
                        <div className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                          {/* NUEVO: Muestra el documento en la tabla para confirmar que se guardó */}
                          Delegado: {p.proxy_name} {p.proxy_document ? `(CC: ${p.proxy_document})` : ''}
                        </div>
                      )}
                      {p.is_present && p.access_pin && <span className="block mt-1 text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded-md w-max">PIN: {p.access_pin}</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-center text-blue-700">{p.coefficient}%</td>
                    <td className="px-6 py-4 text-center">
                      {p.is_present ? (
                        <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-green-600 hover:bg-red-600 text-white text-xs font-bold transition-colors">✓ Registrado (Anular)</button>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-blue-600 hover:text-white text-xs font-bold border">Titular</button>
                          <button onClick={() => { setPropiedadSeleccionada(p.property_id); setModalOpen(true); }} className="px-3 py-1.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white text-xs font-bold border border-purple-200">Poder</button>
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
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
              <form onSubmit={crearPregunta} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Lanzar Nueva Decisión</label>
                  <input required value={nuevaPregunta} onChange={e => setNuevaPregunta(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-blue-600 outline-none" placeholder="¿Aprueba el presupuesto?" />
                </div>
                <button type="submit" disabled={creandoPregunta || quorumActual===0} className="py-3 px-6 rounded-lg font-bold text-white bg-blue-600 disabled:bg-gray-400">Abrir Votación</button>
              </form>
            </div>
            {preguntas.map((pregunta) => (
              <div key={pregunta.id} className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-bold text-blue-900">{pregunta.title}</h4>
                  <p className="text-xs font-bold mt-1">{pregunta.status === 'OPEN' ? <span className="text-green-600">🟢 ABIERTA</span> : <span className="text-red-600">🔴 CERRADA</span>}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => abrirPanelVotacion(pregunta)} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg text-sm">{pregunta.status === 'OPEN' ? 'Ver Votos en Vivo' : 'Ver Resultados'}</button>
                  {pregunta.status === 'OPEN' && <button onClick={() => cerrarVotacion(pregunta.id)} className="bg-red-50 text-red-700 border-red-200 font-bold py-2 px-4 rounded-lg text-sm border">Cerrar Votación</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PESTAÑA 3: DEBATE E INTERACCIÓN */}
        {activeTab === 'DEBATE' && (
          <div className="space-y-6 flex flex-col md:flex-row gap-6">
            
            <div className="md:w-1/3 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
                <h3 className="font-bold text-blue-950 mb-2 flex items-center gap-2">
                  <span>🎥</span> Enlace de Transmisión
                </h3>
                <p className="text-xs text-gray-500 mb-4">Pega aquí el enlace de Zoom/Meet para que los propietarios puedan ingresar desde su celular.</p>
                <div className="flex flex-col gap-2">
                  <input 
                    type="url" 
                    value={streamingUrl} 
                    onChange={e => setStreamingUrl(e.target.value)} 
                    placeholder="https://zoom.us/j/..." 
                    className="w-full p-2 text-sm border rounded-lg focus:ring-blue-600 outline-none" 
                  />
                  <button 
                    onClick={guardarEnlaceTransmision}
                    disabled={guardandoLink}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                  >
                    {guardandoLink ? "Enviando..." : "Compartir a Propietarios"}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800">
                <p className="font-bold mb-1">💡 Reglas de Moderación:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Otorga el micrófono en Zoom/Meet únicamente a la persona que esté "HABLANDO AHORA" en la lista de turnos.</li>
                  <li>Al terminar, marca "Intervención Finalizada" para avanzar al siguiente.</li>
                </ul>
              </div>
            </div>

            <div className="md:w-2/3 bg-white rounded-xl shadow-sm p-6 border border-blue-100">
              <h3 className="font-bold text-blue-950 mb-4 flex items-center gap-2">
                <span>✋</span> Cola de Peticiones de Palabra
              </h3>

              {turnos.length === 0 ? (
                <div className="text-center py-10 text-gray-400">Ningún propietario ha pedido la palabra.</div>
              ) : (
                <div className="space-y-3">
                  {turnos.map((turno) => {
                    const esActivo = turno.status === 'ACTIVE';
                    const esCompletado = turno.status === 'COMPLETED';
                    const propNumber = Array.isArray(turno.properties) ? turno.properties[0]?.number : turno.properties?.number;
                    
                    return (
                      <div key={turno.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${esActivo ? 'bg-green-50 border-green-200 shadow-sm' : esCompletado ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                        <div>
                          <p className={`font-bold ${esActivo ? 'text-green-800 text-lg' : 'text-gray-800'}`}>Apto {propNumber}</p>
                          <p className="text-xs font-semibold uppercase">
                            {esActivo ? <span className="text-green-600 animate-pulse">🎤 Hablando Ahora</span> : esCompletado ? <span className="text-gray-400">Ya participó</span> : <span className="text-orange-500">Esperando turno</span>}
                          </p>
                        </div>
                        
                        {!esCompletado && (
                          <div className="flex gap-2">
                            {!esActivo && (
                              <button onClick={() => cambiarEstadoTurno(turno.id, 'ACTIVE')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs">
                                Dar Palabra
                              </button>
                            )}
                            {esActivo && (
                              <button onClick={() => cambiarEstadoTurno(turno.id, 'COMPLETED')} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded-lg text-xs">
                                Terminar Intervención
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* MODAL DE VOTACION EN VIVO */}
      {preguntaActiva && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className={`p-6 text-white flex justify-between items-center ${preguntaActiva.status==='OPEN' ? 'bg-blue-950':'bg-red-900'}`}>
              <div><span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">{preguntaActiva.status==='OPEN'?'EN CURSO':'CERRADA'}</span><h2 className="text-2xl font-bold mt-2">{preguntaActiva.title}</h2></div>
              <button onClick={() => setPreguntaActiva(null)} className="text-white text-xl">×</button>
            </div>
            <div className="bg-gray-50 p-6 border-b flex gap-4 overflow-x-auto">
              <div className="flex-1 bg-white p-4 rounded-xl border border-green-200 text-center"><p className="text-xs font-bold text-green-600">A Favor</p><p className="text-2xl font-bold text-green-700">{votosFavor.toFixed(2)}%</p></div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-red-200 text-center"><p className="text-xs font-bold text-red-600">En Contra</p><p className="text-2xl font-bold text-red-700">{votosContra.toFixed(2)}%</p></div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-gray-300 text-center"><p className="text-xs font-bold text-gray-500">En Blanco</p><p className="text-2xl font-bold text-gray-600">{votosBlanco.toFixed(2)}%</p></div>
              <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-200 text-center"><p className="text-xs font-bold text-blue-600">Participación</p><p className="text-2xl font-bold text-blue-900">{totalVotado.toFixed(2)}%</p></div>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {propiedades.filter(p=>p.is_present).map(p => {
                  const miVoto = votos.find(v=>v.property_id===p.property_id)?.vote_option;
                  const estaCerrada = preguntaActiva.status!=='OPEN';
                  return (
                    <div key={p.property_id} className={`flex justify-between items-center p-3 rounded-lg border ${miVoto?'bg-gray-50':'bg-white'}`}>
                      <div><p className="font-bold">Apto {p.number}</p><p className="text-xs text-blue-600">Coef: {p.coefficient}%</p></div>
                      <div className="flex gap-1">
                        <button disabled={estaCerrada} onClick={()=>registrarVotoAdmin(p.property_id, 'FAVOR', p.coefficient)} className={`px-2 py-1 rounded text-xs font-bold ${miVoto==='FAVOR'?'bg-green-600 text-white':'bg-gray-100 text-gray-400'}`}>F</button>
                        <button disabled={estaCerrada} onClick={()=>registrarVotoAdmin(p.property_id, 'CONTRA', p.coefficient)} className={`px-2 py-1 rounded text-xs font-bold ${miVoto==='CONTRA'?'bg-red-600 text-white':'bg-gray-100 text-gray-400'}`}>C</button>
                        <button disabled={estaCerrada} onClick={()=>registrarVotoAdmin(p.property_id, 'BLANCO', p.coefficient)} className={`px-2 py-1 rounded text-xs font-bold ${miVoto==='BLANCO'?'bg-gray-600 text-white':'bg-gray-100 text-gray-400'}`}>B</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR DELEGADO (Poder) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-blue-950 mb-4">Registrar Delegado (Poder)</h3>
            <form onSubmit={registrarDelegado} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo del Delegado</label>
                <input
                  required
                  type="text"
                  value={formDelegado.nombre}
                  onChange={(e) => setFormDelegado({ ...formDelegado, nombre: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-purple-600 outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula / Documento</label>
                <input
                  required
                  type="text"
                  value={formDelegado.documento}
                  onChange={(e) => setFormDelegado({ ...formDelegado, documento: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-purple-600 outline-none"
                  placeholder="Ej. 10203040"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setModalOpen(false); setFormDelegado({nombre:"", documento:""}); }} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
                  Guardar Delegado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}