"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function SalaControlPage() {
  const params = useParams();
  const assemblyId = params.id; // Capturamos el UUID de la asamblea desde la URL
  
  const [asamblea, setAsamblea] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDetalleAsamblea = async () => {
      if (!assemblyId) return;

      // Consultamos los datos específicos de esta asamblea en PostgreSQL
      const { data, error } = await supabase
        .from("assemblies")
        .select("*")
        .eq("id", assemblyId)
        .single();

      if (error) {
        setError("No se pudo cargar la información de la asamblea.");
      } else {
        setAsamblea(data);
      }
      setCargando(false);
    };

    cargarDetalleAsamblea();
  }, [assemblyId]);

  if (cargando) {
    return <div className="p-8 text-blue-600 font-medium">Cargando Sala de Control...</div>;
  }

  if (error || !asamblea) {
    return <div className="p-8 text-red-600 font-medium">{error || "Asamblea no encontrada."}</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado de la Sala */}
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
            <h1 className="text-2xl font-bold text-blue-950">Sala de Control de Asamblea</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">ID de sesión: {assemblyId}</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Quórum Actual</p>
            <p className="text-3xl font-extrabold text-blue-900">0.00%</p>
          </div>
        </div>

        {/* Panel de Control Principal (Próximo paso: Módulo de Check-in) */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-blue-100 text-center">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Módulo de Asistencia y Quórum en Desarrollo</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Desde aquí el administrador podrá registrar la entrada de los propietarios y ver en tiempo real la sumatoria de coeficientes.
          </p>
        </div>

      </div>
    </div>
  );
}