"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase"; 

export default function PortalVotacionPropietario() {
  const params = useParams();
  const assemblyId = params.id as string;

  const [cargando, setCargando] = useState(true);
  const [asamblea, setAsamblea] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [apto, setApto] = useState("");
  const [pin, setPin] = useState("");
  const [ingresando, setIngresando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  const [miPropiedad, setMiPropiedad] = useState<any>(null);

  // Estados para Votación
  const [preguntaActiva, setPreguntaActiva] = useState<any>(null);
  const [miVoto, setMiVoto] = useState<string | null>(null);
  const [enviandoVoto, setEnviandoVoto] = useState(false);

  // NUEVO: Estados para Debate
  const [miTurno, setMiTurno] = useState<any>(null);
  const [pidiendoTurno, setPidiendoTurno] = useState(false);

  useEffect(() => {
    const cargarAsamblea = async () => {
      try {
        const { data, error } = await supabase.from("assemblies").select("*, residential_complexes(name)").eq("id", assemblyId).single();
        if (error) throw error;
        setAsamblea(data);
      } catch (err: any) {
        setError("Asamblea no encontrada o enlace inválido.");
      } finally {
        setCargando(false);
      }
    };
    cargarAsamblea();
  }, [assemblyId]);

  // MOTOR DE TIEMPO REAL: Votaciones y Turnos
  useEffect(() => {
    if (!miPropiedad) return;

    const fetchDatosIniciales = async () => {
      // 1. Buscar pregunta activa
      const { data: qData } = await supabase.from("assembly_questions").select("*").eq("assembly_id", assemblyId).eq("status", "OPEN").single();
      if (qData) {
        setPreguntaActiva(qData);
        const { data: vData } = await supabase.from("assembly_votes").select("*").eq("question_id", qData.id).eq("property_id", miPropiedad.property_id).single();
        if (vData) setMiVoto(vData.vote_option);
      } else {
        setPreguntaActiva(null);
        setMiVoto(null);
      }

      // 2. Buscar si tengo un turno de debate activo o en espera
      const { data: tData } = await supabase.from("assembly_speakers").select("*").eq("assembly_id", assemblyId).eq("property_id", miPropiedad.property_id).order("created_at", { ascending: false }).limit(1).single();
      if (tData) setMiTurno(tData);
    };

    fetchDatosIniciales();

    // Suscripción a WebSockets de Preguntas
    const canalPreguntas = supabase.channel('preguntas-en-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assembly_questions', filter: `assembly_id=eq.${assemblyId}` }, (payload) => {
        const nuevoRegistro = payload.new as any;
        if (nuevoRegistro && nuevoRegistro.status === 'OPEN') {
          setPreguntaActiva(nuevoRegistro);
          setMiVoto(null);
        } else {
          setPreguntaActiva(null);
        }
      }).subscribe();

    // Suscripción a WebSockets de Mi Turno de Palabra
    const canalTurnos = supabase.channel('mis-turnos-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assembly_speakers', filter: `property_id=eq.${miPropiedad.property_id}` }, (payload) => {
        setMiTurno(payload.new as any);
      }).subscribe();

    // NUEVO: Suscripción a Cambios en la Asamblea (Para que aparezca el enlace de Zoom en vivo)
    const canalAsamblea = supabase.channel('asamblea-en-vivo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assemblies', filter: `id=eq.${assemblyId}` }, (payload) => {
        setAsamblea((prev: any) => ({ ...prev, streaming_url: payload.new.streaming_url }));
      }).subscribe();

    return () => {
      supabase.removeChannel(canalPreguntas);
      supabase.removeChannel(canalTurnos);
      supabase.removeChannel(canalAsamblea); // Asegúrate de limpiar este también
    };
    return () => {
      supabase.removeChannel(canalPreguntas);
      supabase.removeChannel(canalTurnos);
    };
  }, [miPropiedad, assemblyId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngresando(true);
    setMensajeError("");
    try {
      const { data, error } = await supabase.from("assembly_attendees").select(`property_id, access_pin, properties (number, tower, coefficient)`).eq("assembly_id", assemblyId);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No hay registros en esta asamblea.");

      const asistente = data.find((item: any) => {
        const prop = Array.isArray(item.properties) ? item.properties[0] : item.properties;
        return prop?.number?.toString().trim() === apto.trim() && item.access_pin?.toString().trim() === pin.trim();
      });

      if (!asistente) throw new Error(`El Apto "${apto}" o el PIN "${pin}" son incorrectos.`);

      const propFinal = Array.isArray(asistente.properties) ? asistente.properties[0] : asistente.properties;
      setMiPropiedad({ property_id: asistente.property_id, number: propFinal.number, tower: propFinal.tower, coefficient: propFinal.coefficient });
    } catch (err: any) {
      setMensajeError(err.message || "Error al validar credenciales.");
    } finally {
      setIngresando(false);
    }
  };

  const registrarVoto = async (opcion: 'FAVOR' | 'CONTRA' | 'BLANCO') => {
    if (!preguntaActiva || miVoto) return;
    setEnviandoVoto(true);
    try {
      const { error } = await supabase.from("assembly_votes").insert([{ question_id: preguntaActiva.id, property_id: miPropiedad.property_id, vote_option: opcion, coefficient: miPropiedad.coefficient }]);
      if (error) throw error;
      setMiVoto(opcion);
    } catch (err) { alert("Hubo un error al registrar el voto."); } 
    finally { setEnviandoVoto(false); }
  };

  // NUEVA FUNCIÓN: Pedir la palabra
  const pedirPalabra = async () => {
    setPidiendoTurno(true);
    try {
      const { data, error } = await supabase.from("assembly_speakers").insert([{
        assembly_id: assemblyId,
        property_id: miPropiedad.property_id
      }]).select().single();
      
      if (error) throw error;
      setMiTurno(data);
    } catch (err) {
      alert("Error al pedir la palabra. Intenta de nuevo.");
    } finally {
      setPidiendoTurno(false);
    }
  };

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-blue-50 text-blue-800 font-bold animate-pulse">Cargando asamblea...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-blue-50 text-red-600 font-bold">{error}</div>;

  if (!miPropiedad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-blue-950 p-6 text-center">
            <h1 className="text-2xl font-bold text-white">Aurex Votaciones</h1>
            <p className="text-blue-200 text-sm mt-1">{asamblea?.residential_complexes?.name}</p>
          </div>
          <div className="p-8">
            <div className="text-center mb-6">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">{asamblea?.type}</span>
              <h2 className="text-gray-800 font-bold mt-3">Ingreso de Copropietarios</h2>
              <p className="text-xs text-gray-500 mt-1">Ingresa tu número de apartamento y el PIN de 4 dígitos que te entregaron en el registro.</p>
            </div>
            {mensajeError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 text-center border border-red-200">{mensajeError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">Número de Apartamento</label>
                <input type="text" required value={apto} onChange={e => setApto(e.target.value)} placeholder="Ej. 101" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-center font-bold text-lg" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">PIN de Acceso</label>
                <input type="text" required maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="****" className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-center font-bold text-2xl tracking-[0.5em]" />
              </div>
              <button type="submit" disabled={ingresando || pin.length < 4 || !apto} className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:bg-gray-400 shadow-md">
                {ingresando ? 'Validando...' : 'Entrar a la Asamblea'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-blue-950 p-4 text-white shadow-md flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-lg">{asamblea?.residential_complexes?.name}</h2>
          <p className="text-blue-300 text-xs">{asamblea?.type}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-200">Inmueble validado</p>
          <p className="font-bold bg-blue-800 px-3 py-1 rounded-lg mt-1 inline-block">
            {miPropiedad.tower ? `T${miPropiedad.tower}-` : ""}Apto {miPropiedad.number}
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 flex flex-col items-center max-w-lg mx-auto w-full">
        
        {/* TARJETA 1: DEBATE Y TRANSMISIÓN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center w-full mb-6">
          <h3 className="font-bold text-blue-950 mb-4 flex justify-center items-center gap-2">
            <span>💬</span> Intervención y Audio
          </h3>
          
          {asamblea?.streaming_url && (
            <a href={asamblea.streaming_url} target="_blank" rel="noopener noreferrer" className="block w-full py-3 mb-4 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
              🎥 Ingresar a la Videollamada
            </a>
          )}

          {(!miTurno || miTurno.status === 'COMPLETED') && (
            <button onClick={pedirPalabra} disabled={pidiendoTurno} className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition-colors shadow-sm">
              {pidiendoTurno ? "Enviando..." : "✋ Pedir la palabra"}
            </button>
          )}

          {miTurno?.status === 'PENDING' && (
            <div className="w-full py-3 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              Estás en la cola de espera...
            </div>
          )}

          {miTurno?.status === 'ACTIVE' && (
            <div className="w-full py-4 bg-green-100 text-green-800 font-bold rounded-xl border-2 border-green-400 animate-pulse flex items-center justify-center gap-2">
              <span>🎤</span> ¡Es tu turno! Abre tu micrófono
            </div>
          )}
        </div>

        {/* TARJETA 2: VOTACIÓN EN VIVO */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 text-center w-full">
          {!preguntaActiva && (
            <>
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">Esperando Votación...</h3>
              <p className="text-gray-500 text-sm">Mantén esta pantalla abierta. Las opciones de voto aparecerán automáticamente cuando se inicie una votación.</p>
            </>
          )}

          {preguntaActiva && miVoto && (
            <>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¡Voto Registrado!</h3>
              <p className="text-gray-500 text-sm mb-4">Tu decisión para la pregunta actual ha sido guardada de forma segura.</p>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Votaste:</p>
                <p className={`font-bold text-lg ${miVoto === 'FAVOR' ? 'text-green-600' : miVoto === 'CONTRA' ? 'text-red-600' : 'text-gray-600'}`}>
                  {miVoto === 'FAVOR' ? 'A FAVOR' : miVoto === 'CONTRA' ? 'EN CONTRA' : 'EN BLANCO'}
                </p>
              </div>
            </>
          )}

          {preguntaActiva && !miVoto && (
            <>
              <div className="mb-6"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase animate-pulse">Votación en Curso</span></div>
              <h3 className="text-xl font-bold text-blue-950 mb-8 leading-tight">{preguntaActiva.title}</h3>
              <div className="space-y-3">
                <button disabled={enviandoVoto} onClick={() => registrarVoto('FAVOR')} className="w-full py-4 px-6 bg-white border-2 border-green-500 text-green-700 font-bold text-lg rounded-xl hover:bg-green-50 active:bg-green-100 transition-colors shadow-sm disabled:opacity-50 flex justify-between items-center">
                  <span>A FAVOR</span><span className="text-2xl">👍</span>
                </button>
                <button disabled={enviandoVoto} onClick={() => registrarVoto('CONTRA')} className="w-full py-4 px-6 bg-white border-2 border-red-500 text-red-700 font-bold text-lg rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors shadow-sm disabled:opacity-50 flex justify-between items-center">
                  <span>EN CONTRA</span><span className="text-2xl">👎</span>
                </button>
                <button disabled={enviandoVoto} onClick={() => registrarVoto('BLANCO')} className="w-full py-4 px-6 bg-white border-2 border-gray-300 text-gray-600 font-bold text-lg rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm disabled:opacity-50 flex justify-between items-center">
                  <span>VOTO EN BLANCO</span><span className="text-2xl">⚪</span>
                </button>
              </div>
            </>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between text-xs text-gray-400 font-bold uppercase">
            <span>Tu Coeficiente:</span>
            <span className="text-blue-600">{miPropiedad.coefficient}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}