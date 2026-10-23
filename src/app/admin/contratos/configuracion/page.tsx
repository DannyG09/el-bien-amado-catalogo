"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";

type Configuracion = {
  nombreEmpresa: string;
  telefono: string | null;
  email: string | null;
  terminos: string;
  tieneFirmaEmpresa: boolean;
};

const CAMPO =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D4202C]";

export default function ConfiguracionContratosPage() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [eliminarFirma, setEliminarFirma] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const respuesta = await fetch("/api/contratos/configuracion", {
          cache: "no-store",
        });
        const resultado = (await respuesta.json()) as
          | Configuracion
          | { error?: string };
        if (!respuesta.ok || !("nombreEmpresa" in resultado)) {
          throw new Error(
            "error" in resultado
              ? resultado.error ?? "No se pudo cargar la configuración."
              : "No se pudo cargar la configuración."
          );
        }
        if (!cancelado) setConfiguracion(resultado);
      } catch (errorCarga) {
        console.error("Error al cargar configuración de contrato:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudo cargar la configuración."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!configuracion || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const formulario = new FormData();
      formulario.set("nombreEmpresa", configuracion.nombreEmpresa);
      formulario.set("telefono", configuracion.telefono ?? "");
      formulario.set("email", configuracion.email ?? "");
      formulario.set("terminos", configuracion.terminos);
      formulario.set("eliminarFirma", String(eliminarFirma));
      if (archivo) formulario.set("firmaEmpresa", archivo);
      const respuesta = await fetch("/api/contratos/configuracion", {
        method: "PUT",
        body: formulario,
      });
      const resultado = (await respuesta.json()) as
        | Configuracion
        | { error?: string };
      if (!respuesta.ok || !("nombreEmpresa" in resultado)) {
        throw new Error(
          "error" in resultado
            ? resultado.error ?? "No se pudo guardar la configuración."
            : "No se pudo guardar la configuración."
        );
      }
      setConfiguracion(resultado);
      setArchivo(null);
      setEliminarFirma(false);
      setMensaje("La configuración del contrato se guardó.");
    } catch (errorGuardado) {
      console.error("Error al guardar configuración de contrato:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar la configuración."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Configuración del contrato"
          description="Los datos y términos aquí definidos aparecerán en los nuevos contratos."
        >
          <Link
            href="/admin/contratos"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Contratos
          </Link>
        </AdminPageHeader>
        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {mensaje && (
          <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {mensaje}
          </p>
        )}
        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando configuración...
          </p>
        ) : configuracion ? (
          <form
            onSubmit={guardar}
            className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7"
          >
            <label className="text-sm font-semibold text-gray-700">
              Nombre de la empresa *
              <input
                required
                maxLength={200}
                value={configuracion.nombreEmpresa}
                onChange={(evento) =>
                  setConfiguracion({
                    ...configuracion,
                    nombreEmpresa: evento.target.value,
                  })
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Teléfono de contacto
              <input
                type="tel"
                maxLength={40}
                value={configuracion.telefono ?? ""}
                onChange={(evento) =>
                  setConfiguracion({
                    ...configuracion,
                    telefono: evento.target.value,
                  })
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Correo electrónico
              <input
                type="email"
                maxLength={254}
                value={configuracion.email ?? ""}
                onChange={(evento) =>
                  setConfiguracion({
                    ...configuracion,
                    email: evento.target.value,
                  })
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Términos y condiciones *
              <textarea
                required
                maxLength={20000}
                rows={12}
                value={configuracion.terminos}
                onChange={(evento) =>
                  setConfiguracion({
                    ...configuracion,
                    terminos: evento.target.value,
                  })
                }
                className={CAMPO}
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">
                Estos términos aparecerán en el PDF del contrato.
              </span>
            </label>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700">
                Firma o sello de la empresa
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(evento) =>
                    setArchivo(evento.target.files?.[0] ?? null)
                  }
                  className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-bold`}
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Imagen PNG o JPG de hasta 8 MB. Se almacena en la base de datos y se
                incluye en los PDF.
              </p>
              {configuracion.tieneFirmaEmpresa && (
                <label className="mt-3 inline-flex items-center gap-2 text-sm text-red-700">
                  <input
                    type="checkbox"
                    checked={eliminarFirma}
                    onChange={(evento) => setEliminarFirma(evento.target.checked)}
                  />
                  <Trash2 size={15} />
                  Eliminar firma/sello guardado
                </label>
              )}
            </div>
            <div className="flex justify-end sm:col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white hover:bg-[#b81b26] disabled:opacity-60"
              >
                <Save size={16} />
                {guardando ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
