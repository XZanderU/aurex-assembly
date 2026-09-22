"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";

interface Asamblea {
  id: string;
  type: string;
  modality: string;
  scheduled_date: string;
  status: string;
}

export default function MisAsambleasPage() {
  const [asambleas, setAsambleas] = useState<Asamblea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarAsambleas = async () => {
    setCargando(true);
    const complexId = localStorage.getItem("complex_id");
    
    if (!complexId) {
      setError("No hay un conjunto seleccionado. Por favor, selecciona uno en el menú lateral.");
      setCargando(false);
      return;
    }

    // Consulta a PostgreSQL filtrando por el conjunto actual
    const { data, error: err } = await supabase
      .from("assemblies")
      .select("*")
      .eq("complex_id", complexId)
      .order("scheduled_date", { ascending: true }); // Ordenamos por fecha

    if (err) {
      setError(err.message);
    } else {
      setAsambleas(data || []);
      setError(null);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarAsambleas();
  }, []);

  if (cargando) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="text-blue-600 font-medium animate-pulse text-lg">Cargando tus asambleas...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabecera */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-950">Mis Asambleas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona y accede a las reuniones de tu copropiedad actual.
            </p>
          </div>
          <Link 
            href="/dashboard/asambleas"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg transition-colors shadow-sm text-sm"
          >
            + Programar Nueva Asamblea
          </Link>
        </div>

        {/* Manejo de Errores */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Estado Vacío */}
        {asambleas.length === 0 && !error ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-2">No hay asambleas programadas</h3>
            <p className="text-gray-500 mb-6">Aún no has creado ninguna asamblea para este conjunto.</p>
            <Link 
              href="/dashboard/asambleas"
              className="inline-block bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Crear mi primera asamblea
            </Link>
          </div>
        ) : (
          /* Cuadrícula de Tarjetas */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {asambleas.map((asamblea) => (
              <div key={asamblea.id} className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-blue-300">
                
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      asamblea.status === 'DRAFT' ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                      {asamblea.status === 'DRAFT' ? 'PROGRAMADA' : asamblea.status}
                    </span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      {asamblea.modality}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-blue-950 mb-2 capitalize">
                    Asamblea {asamblea.type.toLowerCase()}
                  </h3>
                  
                  <div className="flex items-center text-gray-600 text-sm mb-4">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {new Date(asamblea.scheduled_date).toLocaleString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>

                <div className="border-t border-blue-50 p-4 bg-blue-50/30">
                  <button className="w-full bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-800 font-bold py-2.5 px-4 rounded-lg transition-colors text-sm">
                    Ingresar a Sala de Control
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}