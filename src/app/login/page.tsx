"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { LogoAurex } from "../components/LogoAurex";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Intentamos iniciar sesión con Supabase Auth
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      setLoading(false);
    } else {
      // Si el token es válido, el cliente de Supabase lo guarda automáticamente
      // y redirigimos al dashboard.
      router.push("/dashboard");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-blue-900 bg-cover bg-center relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')" }}
    >
      {/* Capa de opacidad azul para que el texto sea legible */}
      <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-blue-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
            <LogoAurex className="w-10 h-10"/>
          </div>
          <h1 className="text-3xl font-bold text-blue-950 mb-2">Aurex Assembly</h1>
          <p className="text-sm text-gray-500">Ingresa tus credenciales para administrar tu copropiedad</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-blue-900 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
              placeholder="admin@ejemplo.com"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-semibold text-blue-900 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 font-bold py-3 px-4 rounded-lg transition-colors shadow-md text-white
              ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {loading ? "Autenticando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}