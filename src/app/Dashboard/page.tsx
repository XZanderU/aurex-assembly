"use client"; 

import { useState } from "react";

export default function DashboardPage() {
  // Estado del formulario. Tipamos 'unidades' como string temporalmente para el input.
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [unidades, setUnidades] = useState("");

  // Función que se ejecuta al enviar el formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora simulamos el guardado. Más adelante esto irá a PostgreSQL.
    alert(`Simulación: Conjunto "${nombre}" creado con ${unidades} unidades.`);
    
    // Limpiamos el formulario
    setNombre("");
    setNit("");
    setUnidades("");
  };

  return (
    // Contenedor principal con fondo azul, preparado para alojar una imagen de fondo después
    <div className="min-h-screen p-8 flex items-center justify-center">
      
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-8 border border-blue-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-950">
            Registrar Conjunto Residencial
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crea el perfil principal de la copropiedad para iniciar la gestión de asambleas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo: Nombre del Conjunto */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-blue-900 mb-1">
              Nombre del Conjunto o Edificio
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
              placeholder="Ej. Torres del Parque"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Campo: NIT */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-blue-900 mb-1">
                NIT (Opcional)
              </label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                placeholder="Ej. 900.123.456-7"
              />
            </div>

            {/* Campo: Unidades Totales */}
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
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition"
                placeholder="Ej. 120"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
          >
            Crear Copropiedad
          </button>
        </form>
      </div>
    </div>
  );
}

