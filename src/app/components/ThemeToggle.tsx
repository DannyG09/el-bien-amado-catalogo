"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [temaOscuro, setTemaOscuro] = useState(false);
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    const temaGuardado = localStorage.getItem("tema");

    const oscuro =
      temaGuardado === "oscuro" ||
      (!temaGuardado &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", oscuro);

    setTemaOscuro(oscuro);
    setInicializado(true);
  }, []);

  function cambiarTema() {
    const nuevoTema = !temaOscuro;

    setTemaOscuro(nuevoTema);

    document.documentElement.classList.toggle(
      "dark",
      nuevoTema
    );

    localStorage.setItem(
      "tema",
      nuevoTema ? "oscuro" : "claro"
    );
  }

  if (!inicializado) {
    return (
      <button
        type="button"
        disabled
        aria-label="Cargando tema"
        className="fixed bottom-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        <Sun size={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cambiarTema}
      aria-label={
        temaOscuro
          ? "Cambiar a modo día"
          : "Cambiar a modo noche"
      }
      title={
        temaOscuro
          ? "Cambiar a modo día"
          : "Cambiar a modo noche"
      }
      aria-pressed={temaOscuro}
      className="fixed bottom-5 left-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-lg transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4202C] dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
    >
      {temaOscuro ? (
        <Sun size={20} />
      ) : (
        <Moon size={20} />
      )}
    </button>
  );
}