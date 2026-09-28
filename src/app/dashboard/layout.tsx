"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SelectorConjunto from "./SelectorConjunto";
import { LogoAurex } from "../components/LogoAurex";
import { supabase } from "../../../lib/supabase"; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [guardData, setGuardData] = useState({ hasPaidPlan: false, trialDaysLeft: 0 });

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      // 1. Validar sesión en el cliente
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // 2. Excepción para el administrador
      const isAdmin = user.email === "admin@aurex-assembly.com";

      // 3. Validar facturas
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "APPROVED")
        .limit(1);

      const hasPaidPlan = isAdmin || (invoices && invoices.length > 0);
      let trialDaysLeft = 0;

      // 4. Lógica de días de prueba
      if (!hasPaidPlan) {
        const creationDate = new Date(user.created_at);
        const currentDate = new Date();
        const diffInMs = currentDate.getTime() - creationDate.getTime();
        const daysActive = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        trialDaysLeft = 14 - daysActive;

        if (trialDaysLeft < 0) {
          router.push("/planes");
          return;
        }
      }

      // 5. Permitir el acceso
      setGuardData({ hasPaidPlan: hasPaidPlan as boolean, trialDaysLeft });
      setIsLoading(false);
    };

    checkAuthAndSubscription();
  }, [router]);

  // Pantalla de carga mientras el Guardián verifica los datos
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-blue-50 font-bold text-blue-900">Validando credenciales...</div>;
  }

  const { hasPaidPlan, trialDaysLeft } = guardData;

  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Aurex</h2>
          <p className="text-blue-400 text-sm font-medium">Assembly Panel</p>
        </div>
        
        <div className="px-5 mb-4 border-b border-blue-900 pb-4">
          <SelectorConjunto />
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white">
            🏢 Configurar Conjunto
          </Link>
          
          <Link href="/dashboard/importar" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white">
            📊 Importar Propietarios
          </Link>

          <Link href="/dashboard/mis-asambleas" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white">
            📋 Mis Asambleas
          </Link>
          
          <Link href="/dashboard/asambleas" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white">
            🤝 Crear Asamblea
          </Link>
        </nav>

        <div className="p-4 border-t border-blue-900 bg-blue-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold">
             <LogoAurex className="w-10 h-10"/>
            </div>
            <div>
              <p className="text-sm font-bold">Administrador</p>
              <p className="text-xs text-blue-400">
                {hasPaidPlan ? "SaaS Activo" : "Modo de prueba"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {!hasPaidPlan && trialDaysLeft >= 0 && (
          <div className="bg-blue-100 border-b border-blue-200 text-blue-800 text-center py-2 text-sm font-bold shadow-sm z-10 w-full shrink-0">
            Estás en tu prueba gratis. Te quedan {trialDaysLeft} días para actualizar tu plan.
          </div>
        )}
        
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>
      
    </div>
  );
}