"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Trash2, Upload, UserRound } from "lucide-react";
import AdminPageHeader from "../../../AdminPageHeader";
import ClienteForm, { type CamposCliente } from "../../ClienteForm";

type DocumentoCliente = {
  id: number;
  tipo: "foto_perfil" | "cedula" | "licencia" | "otro";
  nombreArchivo: string;
  formato: string;
  creadoEn: string;
};

type Cliente = CamposCliente & {
  id: number;
  documentos: DocumentoCliente[];
};

const ETIQUETAS_DOCUMENTO: Record<DocumentoCliente["tipo"], string> = {
  foto_perfil: "Foto de perfil",
  cedula: "Cédula",
  licencia: "Licencia",
  otro: "Otro documento",
};

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const clienteId = Number(params.id);
  const idInvalido = !Number.isSafeInteger(clienteId) || clienteId <= 0;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<DocumentoCliente["tipo"]>("cedula");
  const [cargando, setCargando] = useState(!idInvalido);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargarCliente() {
      try {
        const respuesta = await fetch(`/api/clientes/${clienteId}`, {
          cache: "no-store",
        });
        const resultado = (await respuesta.json()) as
          | Cliente
          | { error?: string };
        if (!respuesta.ok || !("id" in resultado)) {
          throw new Error(
            "error" in resultado
              ? resultado.error ?? "No se pudo cargar el cliente."
              : "No se pudo cargar el cliente."
          );
        }
        if (!cancelado) setCliente(resultado);
      } catch (errorCarga) {
        console.error("Error al cargar cliente:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudo cargar el cliente."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    if (!idInvalido) {
      void cargarCliente();
    }
    return () => {
      cancelado = true;
    };
  }, [clienteId, idInvalido]);

  async function subirDocumento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivo || !cliente || subiendo) return;
    const formulario = evento.currentTarget;
    setSubiendo(true);
    setError("");
    setMensaje("");
    try {
      const datos = new FormData();
      datos.append("archivo", archivo);
      datos.append("tipo", tipo);
      const respuesta = await fetch(
        `/api/clientes/${cliente.id}/documentos`,
        { method: "POST", body: datos }
      );
      const resultado = (await respuesta.json()) as
        | DocumentoCliente
        | { error?: string };
      if (!respuesta.ok || !("id" in resultado)) {
        throw new Error(
          "error" in resultado
            ? resultado.error ?? "No se pudo subir el documento."
            : "No se pudo subir el documento."
        );
      }
      setCliente((actual) =>
        actual
          ? { ...actual, documentos: [resultado, ...actual.documentos] }
          : actual
      );
      setArchivo(null);
      formulario.reset();
      setMensaje("El archivo se subió y quedó guardado de forma privada.");
    } catch (errorSubida) {
      console.error("Error al subir documento del cliente:", errorSubida);
      setError(
        errorSubida instanceof Error
          ? errorSubida.message
          : "No se pudo subir el documento."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminarDocumento(documento: DocumentoCliente) {
    if (!cliente || eliminandoId !== null) return;
    setEliminandoId(documento.id);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/clientes/${cliente.id}/documentos?documentoId=${documento.id}`,
        { method: "DELETE" }
      );
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo eliminar el archivo.");
      }
      setCliente((actual) =>
        actual
          ? {
              ...actual,
              documentos: actual.documentos.filter(
                (item) => item.id !== documento.id
              ),
            }
          : actual
      );
      setMensaje("El documento se eliminó.");
    } catch (errorEliminacion) {
      console.error("Error al eliminar documento:", errorEliminacion);
      setError(
        errorEliminacion instanceof Error
          ? errorEliminacion.message
          : "No se pudo eliminar el archivo."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  const fotoPerfil = cliente?.documentos.find(
    (documento) => documento.tipo === "foto_perfil"
  );

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Editar cliente"
          description={
            cliente
              ? `${cliente.nombre} ${cliente.apellido} · documentos y datos`
              : "Edita los datos del cliente y administra sus archivos."
          }
        >
          <Link
            href={`/admin/clientes/${clienteId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Ver perfil
          </Link>
        </AdminPageHeader>

        {(error || idInvalido) && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error || "El identificador del cliente no es válido."}
          </p>
        )}
        {mensaje && (
          <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {mensaje}
          </p>
        )}

        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando cliente...
          </p>
        ) : cliente ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-extrabold text-gray-950">
                Datos personales
              </h2>
              <ClienteForm
                key={cliente.id}
                clienteId={cliente.id}
                inicial={{
                  nombre: cliente.nombre,
                  apellido: cliente.apellido,
                  cedula: cliente.cedula,
                  nacionalidad: cliente.nacionalidad,
                  telefono: cliente.telefono ?? "",
                  whatsapp: cliente.whatsapp ?? "",
                  email: cliente.email ?? "",
                  vencimientoLicencia: cliente.vencimientoLicencia,
                  direccion: cliente.direccion,
                  notas: cliente.notas ?? "",
                }}
              />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                {fotoPerfil ? (
                  <img
                    src={`/api/clientes/${cliente.id}/documentos/${fotoPerfil.id}`}
                    alt={`Foto de perfil de ${cliente.nombre}`}
                    className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserRound size={25} />
                  </span>
                )}
                <div>
                  <h2 className="font-extrabold text-gray-950">
                    Fotos y documentos
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Archivos privados; solo accesibles desde el panel.
                  </p>
                </div>
              </div>

              <form
                onSubmit={subirDocumento}
                className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
              >
                <label className="text-sm font-semibold text-gray-700">
                  Tipo de archivo
                  <select
                    value={tipo}
                    onChange={(evento) =>
                      setTipo(
                        evento.target.value as DocumentoCliente["tipo"]
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="foto_perfil">Foto de perfil</option>
                    <option value="cedula">Cédula</option>
                    <option value="licencia">Licencia</option>
                    <option value="otro">Otro documento</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                  Archivo (JPG, PNG, WEBP o PDF; máximo 8 MB)
                  <input
                    type="file"
                    accept={
                      tipo === "foto_perfil"
                        ? "image/jpeg,image/png,image/webp"
                        : "image/jpeg,image/png,image/webp,application/pdf"
                    }
                    required
                    onChange={(evento) =>
                      setArchivo(evento.target.files?.[0] ?? null)
                    }
                    className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-bold"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!archivo || subiendo}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-wait disabled:opacity-50"
                >
                  <Upload size={16} />
                  {subiendo ? "Subiendo..." : "Subir archivo"}
                </button>
              </form>

              {cliente.documentos.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  Todavía no se han subido documentos.
                </p>
              ) : (
                <ul className="mt-5 divide-y divide-gray-100">
                  {cliente.documentos.map((documento) => (
                    <li
                      key={documento.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <FileText size={19} className="shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#D4202C]">
                          {ETIQUETAS_DOCUMENTO[documento.tipo]}
                        </p>
                        <a
                          href={`/api/clientes/${cliente.id}/documentos/${documento.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm font-semibold text-gray-800 hover:underline"
                        >
                          {documento.nombreArchivo}
                        </a>
                      </div>
                      <button
                        type="button"
                        aria-label={`Eliminar ${documento.nombreArchivo}`}
                        disabled={eliminandoId !== null}
                        onClick={() => void eliminarDocumento(documento)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
