"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function PlanesPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCrearOrden = async (plan: any) => {
    setLoadingPlan(plan.id);
    
    // 1. Lectura forzada de la sesión en el navegador
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 2. Bloqueo estricto si no hay ID real
    if (authError || !user || !user.id) {
      alert("Debes iniciar sesión para contratar un plan.");
      setLoadingPlan(null);
      window.location.href = "/"; 
      return;
    }

    const referenceCode = `AUREX-${plan.id}-${Date.now()}`;
    
    // 3. Empaquetado explícito de los datos
    const payload = {
      reference_code: referenceCode,
      amount_in_cents: plan.precioEnCentavos,
      currency: 'COP',
      status: 'PENDING',
      user_id: user.id
    };

    // AUDITORÍA DE QA: Imprimimos en consola exactamente lo que viaja a Supabase
    console.log("🚨 PAYLOAD ENVIADO A SUPABASE:", payload);

    // 4. Inserción
    const { error } = await supabase.from('invoices').insert(payload);

    if (error) {
      console.error("Fallo crítico al insertar:", error);
      alert("Hubo un problema al generar la orden.");
      setLoadingPlan(null);
      return; 
    }

    window.location.href = `https://aurex-billing.vercel.app/checkout/${referenceCode}`;
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

              {/* Aquí termina tu <div className="grid..."> existente */}
        
        {/* NUEVA SECCIÓN: Prueba Gratuita */}
        <div className="mt-16 bg-blue-50 border border-blue-100 rounded-2xl p-8 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-blue-900 mb-3">
            ¿Quieres probar Aurex antes de decidir?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Crea tu cuenta hoy y obtén <strong>14 días de acceso total</strong> a la plataforma. 
            Configura tu primera asamblea, invita a los propietarios y realiza votaciones de prueba 
            sin compromisos ni tarjetas de crédito.
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-white border-2 border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Comenzar prueba gratis de 14 días
          </Link>
        </div>
              
              <ul className="text-left mb-8 space-y-3 grow">
                {plan.caracteristicas.map((caracteristica, i) => (
                  <li key={i} className="flex items-center text-gray-600 text-sm">
                    <svg className="w-5 h-5 text-blue-500 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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