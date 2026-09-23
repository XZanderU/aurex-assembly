import Link from "next/link";
import React from "react";
import SelectorConjunto from "./SelectorConjunto"; //componente cliente
import { LogoAurex } from "../components/LogoAurex";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-blue-50 overflow-hidden">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 mb-2">
          <h2 className="text-2xl font-bold tracking-tight">Aurex</h2>
          <p className="text-blue-400 text-sm font-medium">Assembly Panel</p>
        </div>
        
        {/* NUEVO: Contenedor del Selector de Contexto */}
        <div className="px-5 mb-4 border-b border-blue-900 pb-4">
          <SelectorConjunto />
        </div>
        
        {/* Enlaces de Navegación */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
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
          href="/dashboard/mis-asambleas"
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white"
          >
            📋 Mis Asambleas
            </Link>
          
          <Link 
            href="/dashboard/asambleas" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium text-blue-100 hover:text-white"
          >
            🤝 Crear Asamblea
          </Link>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-blue-900 bg-blue-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center font-bold">
             <LogoAurex className="w-10 h-10"/>
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
        {children}
      </main>
      
    </div>
  );
}