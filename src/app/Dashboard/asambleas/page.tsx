"use client";

import { useState } from "react";
import { supabase } from "../../../../lib/supabase";

export default function CrearAsambleaPage() {
  const [tipo, setTipo] = useState("ORDINARIA");
  const [modalidad, setModalidad] = useState("HIBRIDA");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  
  // Estados de QA
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "exito" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje(null);

    // 1. Validar el contexto (Saber a qué conjunto pertenece esta asamblea)
    const complexId = localStorage.getItem("complex_id");
    if (!complexId) {
      setMensaje({ texto: "Error: No hay un conjunto seleccionado en el menú lateral.", tipo: "error" });
      setIsLoading(false);
      return;
    }

    try {
      // 2. Unir Fecha y Hora en un formato ISO 8601 compatible con PostgreSQL (TIMESTAMP)
      // Ejemplo: "2026-10-15" y "18:30" se convierte en "2026-10-15T18:30:00"
      const fechaHoraCombinada = new Date(`${fecha}T${hora}:00`).toISOString();

      // 3. Inserción en la base de datos
      const { error } = await supabase
        .from("assemblies")
        .insert([
          {
            complex_id: complexId,
            type: tipo,
            modality: modalidad,
            scheduled_date: fechaHoraCombinada,
            status: "DRAFT" // Estado inicial por defecto (Borrador/Programada)
          }
        ]);

      if (error) throw error;

      setMensaje({ texto: "¡Asamblea programada y guardada exitosamente en la base de datos!", tipo: "exito" });
      
      // Limpiamos los campos de fecha y hora tras el éxito
      setFecha("");
      setHora("");

    } catch (err: any) {
      setMensaje({ texto: `Error al guardar: ${err.message}`, tipo: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 border border-blue-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-950">
            Programar Nueva Asamblea
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura los parámetros iniciales para la reunión de copropietarios de tu conjunto actual.
          </p>
        </div>

        {/* Alertas Visuales */}
        {mensaje && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm border ${mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">Tipo de Asamblea</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition disabled:bg-gray-100"
              >
                <option value="ORDINARIA">Ordinaria</option>
                <option value="EXTRAORDINARIA">Extraordinaria</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">Modalidad</label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition disabled:bg-gray-100"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="HIBRIDA">Híbrida (Presencial y Virtual)</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">Fecha Programada</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">Hora de Inicio</label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-md text-white
                ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isLoading ? "Guardando..." : "Crear Asamblea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}