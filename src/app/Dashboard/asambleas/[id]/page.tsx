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
  access_pin?: string; // NUEVO: Guardaremos el PIN de acceso
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
  
  // Estados para Delegados
  const [modalOpen, setModalOpen] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<string | null>(null);
  const [formDelegado, setFormDelegado] = useState({ nombre: "", documento: "" });
  
  // Estados para Votaciones
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [creandoPregunta, setCreandoPregunta] = useState(false);
  const [preguntaActiva, setPreguntaActiva] = useState<any>(null);
  const [votos, setVotos] = useState<any[]>([]);
  const [cargandoVotos, setCargandoVotos] = useState(false);

  // NUEVA FUNCIÓN: Generador de PIN de 4 dígitos
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

      const { data: propData, error: propError } = await supabase.from("properties").select("id, tower, number, coefficient").eq("complex_id", complexId);
      if (propError) throw propError;

      const { data: relData, error: relError } = await supabase.from("property_owners").select("property_id, owners(full_name, document_number)").eq("is_main_contact", true);
      if (relError) throw relError;

      // ACTUALIZADO: Traemos también el access_pin de la base de datos
      const { data: attData, error: attError } = await supabase.from("assembly_attendees").select("property_id, is_present, is_proxy, proxy_name, proxy_document, access_pin").eq("assembly_id", assemblyId);
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
          access_pin: asistencia ? asistencia.access_pin : undefined,
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

  // Funciones Check-in (Modificadas para generar PIN)
  const toggleAsistencia = async (propertyId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const nuevoPin = nuevoEstado ? generarPin() : ""; // Genera PIN solo si entra

    setPropiedades(prev => prev.map(p => p.property_id === propertyId ? { ...p, is_present: nuevoEstado, is_proxy: false, proxy_name: "", proxy_document: "", access_pin: nuevoPin } : p));
    
    try {
      if (nuevoEstado) {
        await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propertyId, is_present: true, is_proxy: false, access_pin: nuevoPin }]);
      } else {
        await supabase.from("assembly_attendees").delete().eq("assembly_id", assemblyId).eq("property_id", propertyId);
      }
    } catch (err) { console.error(err); cargarDatosSala(); }
  };

  const registrarDelegado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propiedadSeleccionada) return;
    
    const nuevoPin = generarPin(); // Genera PIN para el delegado
    
    setPropiedades(prev => prev.map(p => p.property_id === propiedadSeleccionada ? { ...p, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento, access_pin: nuevoPin } : p));
    setModalOpen(false);
    setFormDelegado({ nombre: "", documento: "" });
    
    try {
      await supabase.from("assembly_attendees").insert([{ assembly_id: assemblyId, property_id: propiedadSeleccionada, is_present: true, is_proxy: true, proxy_name: formDelegado.nombre, proxy_document: formDelegado.documento, access_pin: nuevoPin }]);
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

  const cerrarVotacion = async (preguntaId: string) => {
    if (!confirm("¿Estás seguro de cerrar esta votación? Los datos quedarán bloqueados de forma permanente.")) return;
    setPreguntas(prev => prev.map(q => q.id === preguntaId ? { ...q, status: 'CLOSED' } : q));
    if (preguntaActiva && preguntaActiva.id === preguntaId) {
      setPreguntaActiva({ ...preguntaActiva, status: 'CLOSED' });
    }
    try {
      await supabase.from("assembly_questions").update({ status: 'CLOSED' }).eq("id", preguntaId);
    } catch (err) { console.error("Error", err); cargarDatosSala(); }
  };

  // Funciones Panel de Votos
  const abrirPanelVotacion = async (pregunta: any) => {
    setPreguntaActiva(pregunta);
    setCargandoVotos(true);
    const { data, error } = await supabase.from("assembly_votes").select("*").eq("question_id", pregunta.id);
    if (!error && data) setVotos(data);
    setCargandoVotos(false);
  };

  const registrarVoto = async (propertyId: string, option: 'FAVOR' | 'CONTRA' | 'BLANCO', coefficient: number) => {
    if (preguntaActiva.status !== 'OPEN') return; 
    setVotos(prev => {
      const filtrados = prev.filter(v => v.property_id !== propertyId);
      return [...filtrados, { property_id: propertyId, vote_option: option, coefficient }];
    });
    try {
      await supabase.from("assembly_votes").delete().eq("question_id", preguntaActiva.id).eq("property_id", propertyId);
      await supabase.from("assembly_votes").insert([{ question_id: preguntaActiva.id, property_id: propertyId, vote_option: option, coefficient }]);
    } catch (err) { console.error("Error", err); }
  };

  // Cálculos en tiempo real
  const quorumActual = propiedades.filter((p) => p.is_present).reduce((acc, curr) => acc + curr.coefficient, 0);
  const votosFavor = votos.filter(v => v.vote_option === 'FAVOR').reduce((sum, v) => sum + v.coefficient, 0);
  const votosContra = votos.filter(v => v.vote_option === 'CONTRA').reduce((sum, v) => sum + v.coefficient, 0);
  const votosBlanco = votos.filter(v => v.vote_option === 'BLANCO').reduce((sum, v) => sum + v.coefficient, 0);
  const totalVotado = votosFavor + votosContra + votosBlanco;

  // EXPORTACIÓN A EXCEL
  const exportarAExcel = async () => {
    const datosAsistencia = propiedades.map(p => ({
      "Inmueble": p.tower ? `Torre ${p.tower} - Apto ${p.number}` : `Apto ${p.number}`,
      "Propietario": p.owner_name,
      "Coeficiente (%)": p.coefficient,
      "Asistencia": p.is_present ? "PRESENTE" : "AUSENTE",
      "Tipo Asistente": p.is_present ? (p.is_proxy ? "DELEGADO" : "TITULAR") : "",
      "Nombre Delegado": p.is_proxy ? p.proxy_name : "",
      "PIN Acceso": p.is_present ? p.access_pin : "" // ACTUALIZADO: Exportamos el PIN
    }));
    datosAsistencia.push({ "Inmueble": "TOTAL QUÓRUM", "Propietario": "", "Coeficiente (%)": quorumActual, "Asistencia": "", "Tipo Asistente": "", "Nombre Delegado": "", "PIN Acceso": "" });

    const { data: allVotes } = await supabase.from("assembly_votes").select("question_id, vote_option, coefficient");

    const datosVotaciones: any[] = [];
    preguntas.forEach(q => {
      const votosQ = allVotes?.filter(v => v.question_id === q.id) || [];
      const fv = votosQ.filter(v => v.vote_option === 'FAVOR').reduce((acc, curr) => acc + curr.coefficient, 0);
      const cv = votosQ.filter(v => v.vote_option === 'CONTRA').reduce((acc, curr) => acc + curr.coefficient, 0);
      const bv = votosQ.filter(v => v.vote_option === 'BLANCO').reduce((acc, curr) => acc + curr.coefficient, 0);
      
      datosVotaciones.push({
        "Pregunta / Decisión": q.title,
        "Estado": q.status === 'OPEN' ? 'EN CURSO' : 'CERRADA',
        "Total A Favor (%)": fv.toFixed(2),
        "Total En Contra (%)": cv.toFixed(2),
        "Total En Blanco (%)": bv.toFixed(2),
        "Resultado Preliminar/Final": fv > (quorumActual / 2) ? "APROBADO" : "NO APROBADO"
      });
    });

    const hojaAsistencia = XLSX.utils.json_to_sheet(datosAsistencia);
    const hojaVotaciones = XLSX.utils.json_to_sheet(datosVotaciones);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaAsistencia, "Padrón y Asistencia");
    XLSX.utils.book_append_sheet(libro, hojaVotaciones, "Acta de Votaciones");
    
    XLSX.writeFile(libro, `Acta_Asamblea_${asamblea?.type}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            <button onClick={exportarAExcel} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Descargar Acta
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center min-w-37.5">
              <p className="text-xs text-blue-600 font-bold uppercase">Quórum</p>
              <p className="text-2xl font-extrabold text-blue-900">{quorumActual.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button onClick={() => setActiveTab('CHECKIN')} className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'CHECKIN' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>1. Padrón y Asistencia</button>
          <button onClick={() => setActiveTab('VOTACION')} className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'VOTACION' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>2. Votaciones en Vivo</button>
        </div>

        {/* PESTAÑA 1: CHECKIN */}
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
                  <tr key={p.property_id} className={`transition-colors ${p.is_present ? 'bg-green-50/20' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-6 py-4 font-bold text-blue-950">{p.tower ? `T${p.tower}-` : ""}Apto {p.number}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{p.owner_name}</div>
                      {p.is_proxy && <div className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md mt-1 inline-block">Delegado: {p.proxy_name}</div>}
                      
                      {/* NUEVO: Mostrar el PIN si está presente */}
                      {p.is_present && p.access_pin && (
                        <div className="mt-2 block">
                          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded-md border border-blue-200 shadow-sm">
                            PIN Acceso: {p.access_pin}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-center text-blue-700">{p.coefficient}%</td>
                    <td className="px-6 py-4 text-center">
                      {p.is_present ? (
                        <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-green-600 hover:bg-red-600 text-white text-xs font-bold transition-colors">✓ Registrado (Anular)</button>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => toggleAsistencia(p.property_id, p.is_present)} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 text-xs font-bold border transition-colors">Titular</button>
                          <button onClick={() => { setPropiedadSeleccionada(p.property_id); setModalOpen(true); }} className="px-3 py-1.5 rounded bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 text-xs font-bold border border-purple-200 transition-colors">Poder</button>
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
              <h3 className="text-lg font-bold text-blue-950 mb-4">Lanzar Nueva Votación</h3>
              <form onSubmit={crearPregunta} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Pregunta o Tema a decidir</label>
                  <input type="text" required value={nuevaPregunta} onChange={e => setNuevaPregunta(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" placeholder="Ej. ¿Aprueba la gestión y el presupuesto?" />
                </div>
                <button type="submit" disabled={creandoPregunta || quorumActual === 0} className="py-3 px-6 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                  {creandoPregunta ? 'Creando...' : 'Abrir Votación'}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {preguntas.map((pregunta) => (
                <div key={pregunta.id} className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-blue-900">{pregunta.title}</h4>
                    <p className="text-xs font-bold mt-1">
                      Estado: <span className={pregunta.status === 'OPEN' ? 'text-green-600' : 'text-red-600'}>
                        {pregunta.status === 'OPEN' ? '🟢 ABIERTA' : '🔴 CERRADA'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => abrirPanelVotacion(pregunta)} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm">
                      {pregunta.status === 'OPEN' ? 'Administrar / Ver Votos' : 'Ver Resultados'}
                    </button>
                    {pregunta.status === 'OPEN' && (
                      <button onClick={() => cerrarVotacion(pregunta.id)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm">
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

      {/* MODAL DELEGADO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-blue-100">
             <h3 className="text-xl font-bold text-blue-950 mb-4">Registrar Poder Legal</h3>
             <form onSubmit={registrarDelegado} className="space-y-4">
               <div>
                 <label className="text-sm font-semibold text-gray-700">Nombre del Delegado</label>
                 <input required type="text" value={formDelegado.nombre} onChange={e => setFormDelegado({...formDelegado, nombre: e.target.value})} className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
               </div>
               <div>
                 <label className="text-sm font-semibold text-gray-700">Documento</label>
                 <input required type="text" value={formDelegado.documento} onChange={e => setFormDelegado({...formDelegado, documento: e.target.value})} className="w-full mt-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
               </div>
               <div className="flex gap-3 mt-6">
                 <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 bg-gray-100 font-bold rounded-lg transition-colors">Cancelar</button>
                 <button type="submit" className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg transition-colors">Registrar</button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* MODAL PANEL DE VOTACIÓN */}
      {preguntaActiva && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className={`p-6 text-white flex justify-between items-center ${preguntaActiva.status === 'OPEN' ? 'bg-blue-950' : 'bg-red-900'}`}>
              <div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${preguntaActiva.status === 'OPEN' ? 'bg-blue-800 text-blue-200' : 'bg-red-800 text-red-200'}`}>
                  {preguntaActiva.status === 'OPEN' ? 'VOTACIÓN EN CURSO' : 'VOTACIÓN CERRADA'}
                </span>
                <h2 className="text-2xl font-bold mt-2">{preguntaActiva.title}</h2>
              </div>
              <button onClick={() => setPreguntaActiva(null)} className="bg-white/20 hover:bg-white/40 text-white w-10 h-10 rounded-full font-bold text-xl">×</button>
            </div>

            <div className="bg-gray-50 p-6 border-b flex justify-between gap-4 overflow-x-auto">
              <div className="flex-1 bg-white p-4 rounded-xl border border-green-200 text-center min-w-30">
                <p className="text-xs font-bold text-green-600 uppercase">A Favor</p>
                <p className="text-2xl font-bold text-green-700">{votosFavor.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-red-200 text-center min-w-30">
                <p className="text-xs font-bold text-red-600 uppercase">En Contra</p>
                <p className="text-2xl font-bold text-red-700">{votosContra.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-white p-4 rounded-xl border border-gray-300 text-center min-w-30">
                <p className="text-xs font-bold text-gray-500 uppercase">En Blanco</p>
                <p className="text-2xl font-bold text-gray-600">{votosBlanco.toFixed(2)}%</p>
              </div>
              <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-200 text-center min-w-30">
                <p className="text-xs font-bold text-blue-600 uppercase">Participación</p>
                <p className="text-2xl font-bold text-blue-900">{totalVotado.toFixed(2)}% / {quorumActual.toFixed(2)}%</p>
              </div>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <h3 className="font-bold text-blue-900 mb-4">Registro de votos por apartamento asistente:</h3>
              {cargandoVotos ? (
                <p className="text-center text-gray-500 animate-pulse">Cargando votos...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {propiedades.filter(p => p.is_present).map(p => {
                    const miVoto = votos.find(v => v.property_id === p.property_id)?.vote_option;
                    const estaCerrada = preguntaActiva.status !== 'OPEN';

                    return (
                      <div key={p.property_id} className={`flex justify-between items-center p-3 rounded-lg border transition-all ${miVoto ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}>
                        <div>
                          <p className="font-bold text-gray-800">{p.tower ? `T${p.tower}-` : ""}Apto {p.number}</p>
                          <p className="text-xs text-blue-600 font-semibold">Coef: {p.coefficient}%</p>
                        </div>
                        <div className="flex gap-1">
                          <button disabled={estaCerrada} onClick={() => registrarVoto(p.property_id, 'FAVOR', p.coefficient)} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${estaCerrada ? 'opacity-50' : ''} ${miVoto === 'FAVOR' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}>Favor</button>
                          <button disabled={estaCerrada} onClick={() => registrarVoto(p.property_id, 'CONTRA', p.coefficient)} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${estaCerrada ? 'opacity-50' : ''} ${miVoto === 'CONTRA' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}>Contra</button>
                          <button disabled={estaCerrada} onClick={() => registrarVoto(p.property_id, 'BLANCO', p.coefficient)} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${estaCerrada ? 'opacity-50' : ''} ${miVoto === 'BLANCO' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Blanco</button>
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