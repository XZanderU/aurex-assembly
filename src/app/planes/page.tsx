// 1. EL SERVIDOR (Extrae la sesión de forma 100% segura usando tu cliente)
import { supabase } from "../../../lib/supabase"; 
import PlanesClient from "./PlanesClient"; // Importamos el componente visual (lo crearemos ahora)

export default async function PlanesPage() {
  // Obtenemos el usuario directamente en el servidor
  const { data: { user } } = await supabase.auth.getUser();
  
  // Le pasamos el ID (si existe) al componente cliente
  const userId = user ? user.id : null;

  return (
    <div className="py-10 px-4 w-full min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-3xl font-black text-blue-900 mb-3">Planes Aurex</h1>
        <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
          Selecciona el plan adecuado para la gestión de tus asambleas.
        </p>
        
        {/* Aquí renderizamos tu UI pasándole el ID seguro */}
        <PlanesClient userId={userId} />
      </div>
    </div>
  );
}