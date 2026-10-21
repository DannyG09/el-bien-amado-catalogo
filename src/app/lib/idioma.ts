import { useSyncExternalStore } from "react";

export type Idioma = "es" | "en";

export const CLAVE_IDIOMA = "el-bien-amado-idioma";

let idiomaEnMemoria: Idioma | null = null;

export function obtenerIdiomaGuardado(): Idioma | null {
  try {
    const idioma = window.localStorage.getItem(CLAVE_IDIOMA);
    return idioma === "es" || idioma === "en" ? idioma : null;
  } catch (error) {
    console.error("No se pudo leer el idioma guardado:", error);
    return null;
  }
}

export function guardarIdioma(idioma: Idioma) {
  idiomaEnMemoria = idioma;
  try {
    window.localStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch (error) {
    console.error("No se pudo guardar el idioma seleccionado:", error);
  }
  window.dispatchEvent(new Event(CLAVE_IDIOMA));
}

function suscribirIdioma(notificar: () => void) {
  function actualizarDesdeOtraPestana() {
    idiomaEnMemoria = null;
    notificar();
  }

  window.addEventListener(CLAVE_IDIOMA, notificar);
  window.addEventListener("storage", actualizarDesdeOtraPestana);
  return () => {
    window.removeEventListener(CLAVE_IDIOMA, notificar);
    window.removeEventListener("storage", actualizarDesdeOtraPestana);
  };
}

function leerIdioma(): Idioma {
  return idiomaEnMemoria ?? obtenerIdiomaGuardado() ?? "es";
}

function leerIdiomaServidor(): Idioma {
  return "es";
}

export function useIdioma(): Idioma {
  return useSyncExternalStore(
    suscribirIdioma,
    leerIdioma,
    leerIdiomaServidor
  );
}

export function traducirTipoSeguro(tipo: string, idioma: Idioma): string {
  if (idioma === "es") return tipo;

  return (
    {
      full: "Full coverage",
      ley: "Basic liability",
      "no especificado": "Not specified",
    }[tipo.toLowerCase()] ?? tipo
  );
}
