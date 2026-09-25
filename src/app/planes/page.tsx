"use client";
import { useState } from "react";
// Importamos tu cliente de Supabase intacto, respetando tu configuración vital
import { supabase } from "../../../lib/supabase"; 

export default function PlanesPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCrearOrden = async (plan: any) => {
    setLoadingPlan(plan.id);
    
    // 1. Generamos el código único una sola vez por clic
    const referenceCode = `AUREX-${plan.id}-${Date.now()}`;
    
    // 2. Insertamos la orden real en tu base de datos usando tu cliente configurado
    const { error } = await supabase
      .from('invoices')
      .insert({
        reference_code: referenceCode,
        amount_in_cents: plan.precioEnCentavos,
        currency: 'COP',
        status: 'PENDING'
      });

    // 3. Validación estricta de QA: Si falla la inserción, bloqueamos el redireccionamiento
    if (error) {
      console.error("Fallo crítico al insertar en Supabase:", error);
      alert("Hubo un problema al generar la orden. Por favor intenta nuevamente.");
      setLoadingPlan(null);
      return; 
    }

    // 4. Si se guardó con éxito en Supabase, hacemos el salto al micro-frontend
    // llevando exactamente el mismo código que acabamos de guardar.
    window.location.href = `http://localhost:3000/checkout/${referenceCode}`;
  };

  const planes = [
    {
      id: "ASAMBLEA_UNICA",
      nombre: "Por Asamblea",
      precioVisual: "$150.000",
      precioEnCentavos: 15000000,
      descripcion: "Ideal para conjuntos pequeños que realizan una asamblea al año.",
      caracteristicas: ["1 Asamblea Activa", "Soporte por email", "Votaciones en tiempo real"]
    },
    {
      id: "PLAN_SEMESTRAL",
      nombre: "Semestral",
      precioVisual: "$750.000",
      precioEnCentavos: 75000000,
      descripcion: "Para administradores que gestionan asambleas extraordinarias frecuentes.",
      caracteristicas: ["Asambleas Ilimitadas (6 meses)", "Soporte prioritario", "Exportación de actas"]
    },
    {
      id: "PLAN_ANUAL",
      nombre: "Anual Pro",
      precioVisual: "$1.200.000",
      precioEnCentavos: 120000000,
      descripcion: "La solución definitiva para empresas de administración de propiedad horizontal.",
      caracteristicas: ["Asambleas Ilimitadas (1 año)", "Soporte 24/7", "Marca blanca", "Capacitación"]
    }
  ];

  return (
    <div className="py-10 px-4 w-full min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-3xl font-black text-blue-900 mb-3">Planes Aurex</h1>
        <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
          Selecciona el plan adecuado para la gestión de tus asambleas.
        </p>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {planes.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 flex flex-col hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{plan.nombre}</h3>
              <p className="text-sm text-gray-500 mb-6 h-10">{plan.descripcion}</p>
              <div className="text-3xl font-black text-blue-700 mb-6">{plan.precioVisual}</div>
              
              <ul className="text-left mb-8 space-y-3 flex-grow">
                {plan.caracteristicas.map((caracteristica, i) => (
                  <li key={i} className="flex items-center text-gray-600 text-sm">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {caracteristica}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleCrearOrden(plan)}
                disabled={loadingPlan === plan.id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-blue-300"
              >
                {loadingPlan === plan.id ? "Procesando..." : "Contratar Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}