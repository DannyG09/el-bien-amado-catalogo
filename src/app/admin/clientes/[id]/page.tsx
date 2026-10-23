"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  FileText,
  MessageCircle,
  UserRound,
  X,
} from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";
import { NACIONALIDADES } from "../../../lib/nacionalidades";

type DocumentoCliente = {
  id: number;
  tipo: "foto_perfil" | "cedula" | "licencia" | "otro";
  nombreArchivo: string;
  formato: string;
  creadoEn: string;
};

type Cliente = {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  nacionalidad: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  vencimientoLicencia: string;
  direccion: string;
  notas: string | null;
  documentos: DocumentoCliente[];
  contratos: {
    id: number;
    fechaInicio: string;
    fechaFin: string;
    moneda: "DOP" | "USD";
    total: number;
    pagado: number;
    estado: "pendiente_firma" | "activo" | "completado" | "cancelado";
    marca: string;
    modelo: string;
    anio: number;
    placa: string | null;
  }[];
};

const ETIQUETAS_DOCUMENTO: Record<DocumentoCliente["tipo"], string> = {
  foto_perfil: "Foto de perfil",
  cedula: "Cédula",
  licencia: "Licencia",
  otro: "Otro documento",
};

const NOMBRES_NACIONALIDAD = new Map(
  NACIONALIDADES.map(({ codigo, nombre }) => [codigo, nombre])
);

export default function PerfilClientePage() {
  const params = useParams<{ id: string }>();
  const clienteId = Number(params.id);
  const idInvalido = !Number.isSafeInteger(clienteId) || clienteId <= 0;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(!idInvalido);
  const [error, setError] = useState("");
  const [documentoExpandidoId, setDocumentoExpandidoId] = useState<number | null>(
    null
  );

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
        console.error("Error al cargar perfil del cliente:", errorCarga);
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
    if (!idInvalido) void cargarCliente();
    return () => {
      cancelado = true;
    };
  }, [clienteId, idInvalido]);

  const fotoPerfil = cliente?.documentos.find(
    (documento) => documento.tipo === "foto_perfil"
  );
  const numeroWhatsApp = cliente?.whatsapp?.replace(/\D/g, "");

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Perfil del cliente"
          description={
            cliente
              ? `${cliente.nombre} ${cliente.apellido}`
              : "Consulta los datos y documentos del cliente."
          }
        >
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/clientes"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Clientes
            </Link>
            {cliente && (
              <Link
                href={`/admin/clientes/${cliente.id}/editar`}
                className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white hover:bg-gray-800"
              >
                Editar perfil
              </Link>
            )}
          </div>
        </AdminPageHeader>

        {(error || idInvalido) && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {error || "El identificador del cliente no es válido."}
          </p>
        )}

        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando perfil...
          </p>
        ) : cliente ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                {fotoPerfil ? (
                  <img
                    src={`/api/clientes/${cliente.id}/documentos/${fotoPerfil.id}`}
                    alt={`Foto de perfil de ${cliente.nombre}`}
                    className="h-20 w-20 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserRound size={32} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold text-gray-950">
                    {cliente.nombre} {cliente.apellido}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Cédula: {cliente.cedula}
                  </p>
                </div>
                {numeroWhatsApp && (
                  <a
                    href={`https://wa.me/${numeroWhatsApp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800 hover:bg-green-100"
                  >
                    <MessageCircle size={17} />
                    Abrir WhatsApp
                  </a>
                )}
              </div>

              <dl className="grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Nacionalidad
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {NOMBRES_NACIONALIDAD.get(cliente.nacionalidad) ??
                      cliente.nacionalidad}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Vencimiento de licencia
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {cliente.vencimientoLicencia}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Teléfono
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {cliente.telefono || "No registrado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    WhatsApp
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {cliente.whatsapp || "No registrado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Correo electrónico
                  </dt>
                  <dd className="mt-1 break-all text-sm text-gray-900">
                    {cliente.email || "No registrado"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Dirección
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {cliente.direccion}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Notas
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {cliente.notas || "Sin notas"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-extrabold text-gray-950">
                  Contratos del cliente
                </h2>
                <Link
                  href={`/admin/contratos/nuevo?clienteId=${cliente.id}`}
                  className="rounded-xl bg-[#D4202C] px-3 py-2 text-xs font-bold text-white hover:bg-[#b81b26]"
                >
                  Nuevo contrato
                </Link>
              </div>
              {cliente.contratos.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  Este cliente todavía no tiene contratos.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {cliente.contratos.map((contrato) => (
                    <li
                      key={contrato.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <Link
                          href={`/admin/contratos/${contrato.id}`}
                          className="text-sm font-bold text-gray-900 hover:text-[#D4202C]"
                        >
                          Contrato #{contrato.id} · {contrato.marca}{" "}
                          {contrato.modelo} {contrato.anio}
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">
                          {contrato.fechaInicio} → {contrato.fechaFin}
                          {contrato.placa ? ` · ${contrato.placa}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {contrato.total.toLocaleString("es-DO", {
                            style: "currency",
                            currency: contrato.moneda,
                          })}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {contrato.estado.replaceAll("_", " ")} · abonado{" "}
                          {contrato.pagado.toLocaleString("es-DO", {
                            style: "currency",
                            currency: contrato.moneda,
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="font-extrabold text-gray-950">
                Documentos del cliente
              </h2>
              {cliente.documentos.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  No hay documentos registrados.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {cliente.documentos.map((documento) => (
                    <li
                      key={documento.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <FileText size={19} className="shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#D4202C]">
                          {ETIQUETAS_DOCUMENTO[documento.tipo]}
                        </p>
                        <p className="block truncate text-sm font-semibold text-gray-800">
                          {documento.nombreArchivo}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-expanded={documentoExpandidoId === documento.id}
                        onClick={() =>
                          setDocumentoExpandidoId((actual) =>
                            actual === documento.id ? null : documento.id
                          )
                        }
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={15} />
                        {documentoExpandidoId === documento.id
                          ? "Cerrar vista"
                          : "Vista previa"}
                      </button>
                      {documentoExpandidoId === documento.id && (
                        <div className="mt-3 w-full basis-full rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-semibold text-gray-600">
                              Vista previa: {documento.nombreArchivo}
                            </p>
                            <button
                              type="button"
                              onClick={() => setDocumentoExpandidoId(null)}
                              aria-label="Cerrar vista previa"
                              className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
                            >
                              <X size={17} />
                            </button>
                          </div>
                          {documento.formato === "pdf" ? (
                            <iframe
                              title={`Vista previa de ${documento.nombreArchivo}`}
                              src={`/api/clientes/${cliente.id}/documentos/${documento.id}`}
                              className="h-[70vh] min-h-96 w-full rounded-lg border border-gray-200 bg-white"
                            />
                          ) : (
                            <img
                              src={`/api/clientes/${cliente.id}/documentos/${documento.id}`}
                              alt={`Vista previa de ${documento.nombreArchivo}`}
                              className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain"
                            />
                          )}
                        </div>
                      )}
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
