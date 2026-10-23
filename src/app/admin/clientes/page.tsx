"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, Search, Trash2, UserRound } from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";
import { NACIONALIDADES } from "../../lib/nacionalidades";

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
  fotoPerfilId: number | null;
};

const NOMBRES_NACIONALIDAD = new Map(
  NACIONALIDADES.map(({ codigo, nombre }) => [codigo, nombre])
);

export default function ClientesAdminPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const respuesta = await fetch("/api/clientes", { cache: "no-store" });
        const resultado = (await respuesta.json()) as
          | Cliente[]
          | { error?: string };
        if (!respuesta.ok || !Array.isArray(resultado)) {
          throw new Error(
            !Array.isArray(resultado)
              ? resultado.error ?? "No se pudieron cargar los clientes."
              : "No se pudieron cargar los clientes."
          );
        }
        if (!cancelado) setClientes(resultado);
      } catch (errorCarga) {
        console.error("Error al cargar clientes:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar los clientes."
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

  async function eliminarCliente(cliente: Cliente) {
    if (eliminandoId !== null) return;
    const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
    if (
      !window.confirm(
        `¿Eliminar a ${nombreCompleto}? También se eliminarán sus documentos y esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setEliminandoId(cliente.id);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/clientes/${cliente.id}`, {
        method: "DELETE",
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo eliminar el cliente.");
      }
      setClientes((actuales) =>
        actuales.filter((item) => item.id !== cliente.id)
      );
      setMensaje(`Se eliminó el perfil de ${nombreCompleto}.`);
    } catch (errorEliminacion) {
      console.error("Error al eliminar cliente:", errorEliminacion);
      setError(
        errorEliminacion instanceof Error
          ? errorEliminacion.message
          : "No se pudo eliminar el cliente."
      );
    } finally {
      setEliminandoId(null);
    }
  }

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    if (!consulta) return clientes;
    return clientes.filter((cliente) =>
      [
        cliente.nombre,
        cliente.apellido,
        cliente.cedula,
        cliente.telefono ?? "",
        cliente.whatsapp ?? "",
        cliente.email ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(consulta)
    );
  }, [busqueda, clientes]);

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Clientes"
          description="Consulta y administra los datos de los clientes y sus documentos."
        >
          <Link
            href="/admin/clientes/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-[#b81b26]"
          >
            <Plus size={18} />
            Agregar cliente
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

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <label className="relative block sm:max-w-md">
              <span className="sr-only">Buscar clientes</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por nombre, cédula o contacto"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#D4202C] focus:bg-white"
              />
            </label>
          </div>

          {cargando ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Cargando clientes...
            </p>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <UserRound className="mx-auto text-gray-300" size={34} />
              <p className="mt-3 font-bold text-gray-800">
                {clientes.length === 0
                  ? "Aún no hay clientes registrados."
                  : "No encontramos clientes para esa búsqueda."}
              </p>
              {clientes.length === 0 && (
                <Link
                  href="/admin/clientes/nuevo"
                  className="mt-4 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Registrar primer cliente
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtrados.map((cliente) => (
                <li
                  key={cliente.id}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
                >
                  {cliente.fotoPerfilId ? (
                    <img
                      src={`/api/clientes/${cliente.id}/documentos/${cliente.fotoPerfilId}`}
                      alt=""
                      className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <UserRound size={22} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-gray-950">
                      {cliente.nombre} {cliente.apellido}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Cédula: {cliente.cedula} ·{" "}
                      {NOMBRES_NACIONALIDAD.get(cliente.nacionalidad) ??
                        cliente.nacionalidad}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {cliente.telefono || cliente.email
                        ? [cliente.telefono, cliente.email]
                            .filter(Boolean)
                            .join(" · ")
                        : "Sin teléfono ni email"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <span className="text-xs text-gray-500">
                      Licencia vence {cliente.vencimientoLicencia}
                    </span>
                    <Link
                      href={`/admin/clientes/${cliente.id}`}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Ver perfil
                    </Link>
                    <Link
                      href={`/admin/clientes/${cliente.id}/editar`}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    {cliente.whatsapp?.replace(/\D/g, "") && (
                      <a
                        href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir WhatsApp para ${cliente.nombre} ${cliente.apellido}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-bold text-green-800 hover:bg-green-100"
                      >
                        <MessageCircle size={16} />
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={eliminandoId !== null}
                      onClick={() => void eliminarCliente(cliente)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {eliminandoId === cliente.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
