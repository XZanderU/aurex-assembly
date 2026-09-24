"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Conjunto {
  id: string;
  name: string;
}

export default function SelectorConjunto() {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [seleccionado, setSeleccionado] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarConjuntos = async () => {
      // 1. Traemos los conjuntos desde PostgreSQL ordenados por fecha
      const { data, error } = await supabase
        .from("residential_complexes")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando conjuntos:", error);
        setCargando(false);
        return;
      }

      if (data && data.length > 0) {
        setConjuntos(data);
        
        // 2. Revisamos si ya había uno seleccionado previamente en memoria
        const guardado = localStorage.getItem("complex_id");
        if (guardado && data.find((c) => c.id === guardado)) {
          setSeleccionado(guardado);
        } else {
          // Si no hay ninguno guardado, seleccionamos el primero por defecto
          setSeleccionado(data[0].id);
          localStorage.setItem("complex_id", data[0].id);
        }
      }
      setCargando(false);
    };

    cargarConjuntos();
  }, []);

  const manejarCambio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoId = e.target.value;
    setSeleccionado(nuevoId);
    // Guardamos la elección en el navegador para que las otras pantallas la usen
    localStorage.setItem("complex_id", nuevoId);
  };

  if (cargando) {
    return <div className="text-xs text-blue-300 px-2 animate-pulse">Cargando contexto...</div>;
  }

  if (conjuntos.length === 0) {
    return <div className="text-xs text-red-300 px-2">No hay conjuntos creados</div>;
  }

  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2 block px-1">
        Contexto Actual
      </label>
      <select
        value={seleccionado}
        onChange={manejarCambio}
        className="w-full bg-blue-900 border border-blue-800 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer hover:bg-blue-800"
      >
        {conjuntos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}