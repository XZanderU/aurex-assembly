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

  useEffect(() => {
    const cargarAsamblea = async () => {
      try {
        const { data, error } = await supabase
          .from("assemblies")
          .select("*, residential_complexes(name)")
          .eq("id", assemblyId)
          .single();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngresando(true);
    setMensajeError("");

    try {
      // 1. Buscamos TODOS los asistentes de esta asamblea sin el filtro de PIN para evitar el bloqueo del RLS
      const { data, error } = await supabase
        .from("assembly_attendees")
        .select(`
          property_id,
          access_pin,
          properties (number, tower, coefficient)
        `)
        .eq("assembly_id", assemblyId);

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("No hay ningún copropietario registrado con asistencia en esta asamblea.");
      }

      // 2. Buscamos la coincidencia manualmente en JavaScript
      const asistente = data.find((item: any) => {
        const prop = Array.isArray(item.properties) ? item.properties[0] : item.properties;
        const numAptoMatch = prop?.number?.toString().trim() === apto.trim();
        const pinMatch = item.access_pin?.toString().trim() === pin.trim();
        
        return numAptoMatch && pinMatch;
      });

      if (!asistente) {
        throw new Error(`El Apto "${apto}" o el PIN "${pin}" son incorrectos.`);
      }

      const propFinal = Array.isArray(asistente.properties) 
        ? asistente.properties[0] 
        : asistente.properties;

      setMiPropiedad({
        property_id: asistente.property_id,
        number: propFinal.number,
        tower: propFinal.tower,
        coefficient: propFinal.coefficient
      });

    } catch (err: any) {
      setMensajeError(err.message || "Error al validar credenciales.");
    } finally {
      setIngresando(false);
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
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {asamblea?.type}
              </span>
              <h2 className="text-gray-800 font-bold mt-3">Ingreso de Copropietarios</h2>
              <p className="text-xs text-gray-500 mt-1">Ingresa tu número de apartamento y el PIN de 4 dígitos que te entregaron en el registro.</p>
            </div>

            {mensajeError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 text-center border border-red-200">
                {mensajeError}
              </div>
            )}

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
      <div className="bg-blue-950 p-4 text-white shadow-md flex justify-between items-center">
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

      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Esperando Votación...</h3>
          <p className="text-gray-500 text-sm">Estás conectado correctamente. Cuando el administrador abra una pregunta, las opciones de voto aparecerán aquí automáticamente.</p>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between text-xs text-gray-400 font-bold uppercase">
            <span>Tu Coeficiente:</span>
            <span className="text-blue-600">{miPropiedad.coefficient}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}