"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { NACIONALIDADES } from "../../lib/nacionalidades";

export type CamposCliente = {
  nombre: string;
  apellido: string;
  cedula: string;
  nacionalidad: string;
  telefono: string;
  whatsapp: string;
  email: string;
  vencimientoLicencia: string;
  direccion: string;
  notas: string;
};

type ClienteFormProps = {
  clienteId?: number;
  inicial?: CamposCliente;
};

const FORMULARIO_VACIO: CamposCliente = {
  nombre: "",
  apellido: "",
  cedula: "",
  nacionalidad: "DO",
  telefono: "",
  whatsapp: "",
  email: "",
  vencimientoLicencia: "",
  direccion: "",
  notas: "",
};

const INPUT_CLASE =
  "mt-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20";

export default function ClienteForm({
  clienteId,
  inicial = FORMULARIO_VACIO,
}: ClienteFormProps) {
  const router = useRouter();
  const [campos, setCampos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cambiarCampo(
    evento: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = evento.target;
    setCampos((actual) => ({ ...actual, [name]: value }));
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch(
        clienteId ? `/api/clientes/${clienteId}` : "/api/clientes",
        {
          method: clienteId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campos),
        }
      );
      const resultado = (await respuesta.json()) as {
        error?: string;
        id?: number;
      };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo guardar el cliente.");
      }
      if (!clienteId && resultado.id) {
        router.push(`/admin/clientes/${resultado.id}`);
        return;
      }
      router.push("/admin/clientes");
      router.refresh();
    } catch (errorGuardado) {
      console.error("Error al guardar cliente:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar el cliente."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">
            Nombre *
            <input
              name="nombre"
              value={campos.nombre}
              onChange={cambiarCampo}
              maxLength={100}
              autoComplete="given-name"
              required
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Apellido *
            <input
              name="apellido"
              value={campos.apellido}
              onChange={cambiarCampo}
              maxLength={100}
              autoComplete="family-name"
              required
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Cédula *
            <input
              name="cedula"
              value={campos.cedula}
              onChange={cambiarCampo}
              maxLength={50}
              required
              autoComplete="off"
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Nacionalidad *
            <select
              name="nacionalidad"
              value={campos.nacionalidad}
              onChange={cambiarCampo}
              required
              className={INPUT_CLASE}
            >
              {NACIONALIDADES.map(({ codigo, nombre }) => (
                <option key={codigo} value={codigo}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Teléfono
            <input
              name="telefono"
              type="tel"
              value={campos.telefono}
              onChange={cambiarCampo}
              maxLength={40}
              autoComplete="tel"
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            WhatsApp
            <input
              name="whatsapp"
              type="tel"
              value={campos.whatsapp}
              onChange={cambiarCampo}
              maxLength={40}
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Email
            <input
              name="email"
              type="email"
              value={campos.email}
              onChange={cambiarCampo}
              maxLength={254}
              autoComplete="email"
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Vencimiento de licencia *
            <input
              name="vencimientoLicencia"
              type="date"
              value={campos.vencimientoLicencia}
              onChange={cambiarCampo}
              required
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
            Dirección *
            <textarea
              name="direccion"
              value={campos.direccion}
              onChange={cambiarCampo}
              maxLength={2000}
              rows={3}
              required
              autoComplete="street-address"
              className={INPUT_CLASE}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
            Notas
            <textarea
              name="notas"
              value={campos.notas}
              onChange={cambiarCampo}
              maxLength={5000}
              rows={4}
              className={INPUT_CLASE}
            />
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Link
          href={clienteId ? "/admin/clientes" : "/admin/clientes"}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Volver a clientes
        </Link>
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-wait disabled:opacity-60"
        >
          <Save size={17} />
          {guardando ? "Guardando..." : "Guardar cliente"}
        </button>
      </div>
    </form>
  );
}
