"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setError("");
    setCargando(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 relative"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      {/* Capa oscura sobre la imagen */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Contenido */}
      <div className="relative z-10 w-full max-w-md">

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Encabezado */}
          <div className="text-center mb-8">

            <h1 className="text-3xl font-bold text-gray-900">
              El Bien Amado
            </h1>

            <p className="text-gray-500 mt-2">
              Panel administrativo
            </p>

          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>

              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

          </form>

          {/* Volver al catálogo */}
          <div className="text-center mt-6">

            <a
              href="/"
              className="text-sm text-gray-500 hover:text-red-600 transition"
            >
              ← Volver al catálogo
            </a>

          </div>

        </div>

      </div>
    </main>
  );
}

