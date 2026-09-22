"use client";

import { useState } from "react";

export default function CrearAsambleaPage() {
  const [tipo, setTipo] = useState("ORDINARIA");
  const [modalidad, setModalidad] = useState("HIBRIDA");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Asamblea ${tipo} programada para el ${fecha} a las ${hora} en modalidad ${modalidad}.`);
    // Limpiamos (en un entorno real aquí redirigiríamos al panel de control de esa asamblea)
    setFecha("");
    setHora("");
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8 border border-blue-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-950">
            Programar Nueva Asamblea
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura los parámetros iniciales para la reunión de copropietarios.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo: Tipo de Asamblea */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                Tipo de Asamblea
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition"
              >
                <option value="ORDINARIA">Ordinaria</option>
                <option value="EXTRAORDINARIA">Extraordinaria</option>
              </select>
            </div>

            {/* Campo: Modalidad */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                Modalidad
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
                <option value="HIBRIDA">Híbrida (Presencial y Virtual)</option>
              </select>
            </div>

            {/* Campo: Fecha */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                Fecha Programada
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>

            {/* Campo: Hora */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                Hora de Inicio
              </label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
            >
              Crear Asamblea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}