"use client";

import { useState } from "react";
// Importamos nuestro cliente de base de datos
import { supabase } from "../../../lib/supabase";

export default function DashboardPage() {
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [unidades, setUnidades] = useState("");
  
  // Nuevos estados para QA y UX
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "exito" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje(null); // Limpiamos mensajes anteriores

    try {
      // Inserción real en PostgreSQL usando Supabase
      const { error } = await supabase
        .from("residential_complexes")
        .insert([
          { 
            name: nombre, 
            tax_id: nit, 
            total_units: parseInt(unidades) // Aseguramos que sea un número entero
          }
        ]);

      if (error) {
        throw error;
      }

      // Si todo sale bien, mostramos mensaje de éxito y limpiamos
      setMensaje({ texto: "¡Copropiedad registrada exitosamente en la base de datos!", tipo: "exito" });
      setNombre("");
      setNit("");
      setUnidades("");
      
    } catch (err: any) {
      // Si hay error (ej. se cayó el internet o falló la BD), lo capturamos
      setMensaje({ texto: `Error al guardar: ${err.message}`, tipo: "error" });
    } finally {
      // Sin importar si falló o fue exitoso, quitamos el estado de carga
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-8 border border-blue-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-950">
            Registrar Conjunto Residencial
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea el perfil principal de la copropiedad para iniciar la gestión de asambleas.
          </p>
        </div>

        {/* Renderizado condicional de mensajes (Alertas visuales) */}
        {mensaje && (
          <div className={`p-4 mb-6 rounded-lg font-medium text-sm border ${mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-blue-900 mb-1">
              Nombre del Conjunto o Edificio
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isLoading}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100 disabled:text-gray-400"
              placeholder="Ej. Torres del Parque"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                NIT (Opcional)
              </label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
                placeholder="Ej. 900.123.456-7"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                Total de Unidades
              </label>
              <input
                type="number"
                required
                min="1"
                value={unidades}
                onChange={(e) => setUnidades(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
                placeholder="Ej. 120"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-4 font-bold py-3 px-4 rounded-lg transition-colors shadow-md text-white
              ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {isLoading ? "Guardando en base de datos..." : "Crear Copropiedad"}
          </button>
        </form>
      </div>
    </div>
  );
}