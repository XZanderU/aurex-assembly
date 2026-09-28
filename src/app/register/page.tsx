"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { LogoAurex } from "../components/LogoAurex";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validación de QA del lado del cliente
    if (password !== confirmPassword) {
      setMessage({ text: "Las contraseñas no coinciden.", type: "error" });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: "La contraseña debe tener al menos 6 caracteres.", type: "error" });
      setLoading(false);
      return;
    }

    // Conexión con tu instancia de Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Error de registro:", error.message);
      setMessage({ text: error.message, type: "error" });
    } else if (data.user) {
      setMessage({ 
        text: "¡Registro exitoso! Ya puedes iniciar sesión con tu nueva cuenta.", 
        type: "success" 
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  return (
    // Aplicamos el fondo azul base, listo para recibir una imagen de fondo si lo deseas
    <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4">
      
      <div className="mb-8">
        <LogoAurex />
      </div>

      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-500">
        <h1 className="text-3xl font-bold text-blue-950 text-center mb-2">Crear Cuenta</h1>
        <p className="text-gray-500 text-center text-sm mb-6">Regístrate para gestionar tus asambleas</p>

        {message && (
          <div className={`p-3 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Repite tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          {/* Asumiendo que tu página principal (page.tsx)[cite: 13] contiene el login */}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}