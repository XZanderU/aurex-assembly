import Link from "next/link";
import React from "react";

// El layout recibe un "prop" llamado children. 
// Aquí es donde Next.js inyectará automáticamente el contenido de tus page.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      
      {/* Sidebar Lateral (Menú de Navegación) */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Aurex</h2>
          <p className="text-blue-400 text-sm font-medium">Assembly Panel</p>
        </div>
        
        {/* Enlaces de Navegación */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {/* 
            IMPORTANTE: Usamos <Link> de Next.js en lugar de la etiqueta <a> clásica de HTML. 
            <Link> hace la transición instantánea sin recargar la página (SPA real).
          */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white"
          >
            🏢 Configurar Conjunto
          </Link>
          
          <Link 
            href="/dashboard/importar" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white"
          >
            📊 Importar Propietarios
          </Link>
          
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white opacity-50 cursor-not-allowed title='En desarrollo'"
          >
            🤝 Mis Asambleas
          </Link>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-blue-900 bg-blue-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center font-bold">
              AD
            </div>
            <div>
              <p className="text-sm font-bold">Administrador</p>
              <p className="text-xs text-blue-400">Modo de prueba</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Aquí Next.js inyecta dinámicamente tu page.tsx de crear conjunto o importar excel */}
        {children}
      </main>
      
    </div>
  );
}