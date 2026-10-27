"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";

type ClienteOpcion = {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
};

type VehiculoOpcion = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
};

type Reserva = {
  id: number;
  vehiculoId: number;
  clienteId: number | null;
  nombreCliente: string | null;
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  notas: string | null;
  estado: "confirmada" | "cancelada";
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
};

const HOY = new Date();
const FECHA_HOY = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}-${String(HOY.getDate()).padStart(2, "0")}`;
const CAMPO =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]";

function formatoFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

export default function ReservasPage() {
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoOpcion[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteNombreManual, setClienteNombreManual] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(FECHA_HOY);
  const [fechaFin, setFechaFin] = useState(FECHA_HOY);
  const [horaEntrega, setHoraEntrega] = useState("09:00");
  const [horaDevolucion, setHoraDevolucion] = useState("09:00");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarReservas = useCallback(async () => {
    const respuesta = await fetch("/api/reservas", { cache: "no-store" });
    const resultado = (await respuesta.json()) as
      | Reserva[]
      | { error?: string };
    if (!respuesta.ok || !Array.isArray(resultado)) {
      throw new Error(
        !Array.isArray(resultado)
          ? resultado.error ?? "No se pudieron cargar las reservas."
          : "No se pudieron cargar las reservas."
      );
    }
    setReservas(resultado);
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function cargarOpciones() {
      setCargandoVehiculos(true);
      try {
        const parametros = new URLSearchParams();
        if (fechaInicio && fechaFin) {
          parametros.set("fechaInicio", fechaInicio);
          parametros.set("fechaFin", fechaFin);
        }
        const query = parametros.size > 0 ? `?${parametros.toString()}` : "";
        const respuesta = await fetch(`/api/reservas/opciones${query}`, {
          cache: "no-store",
        });
        const resultado = (await respuesta.json()) as
          | { clientes: ClienteOpcion[]; vehiculos: VehiculoOpcion[] }
          | { error?: string };
        if (!respuesta.ok || !("clientes" in resultado)) {
          throw new Error(
            "error" in resultado
              ? resultado.error ?? "No se pudieron cargar las opciones."
              : "No se pudieron cargar las opciones."
          );
        }
        if (cancelado) return;
        setClientes(resultado.clientes);
        setVehiculos(resultado.vehiculos);
        setVehiculoId((actual) =>
          resultado.vehiculos.some((vehiculo) => String(vehiculo.id) === actual)
            ? actual
            : ""
        );
        setError("");
      } catch (errorCarga) {
        console.error("Error al cargar opciones de reservas:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar las opciones."
          );
        }
      } finally {
        if (!cancelado) setCargandoVehiculos(false);
      }
    }
    void cargarOpciones();
    return () => {
      cancelado = true;
    };
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const respuesta = await fetch("/api/reservas", { cache: "no-store" });
        const resultado = (await respuesta.json()) as
          | Reserva[]
          | { error?: string };
        if (!respuesta.ok || !Array.isArray(resultado)) {
          throw new Error(
            !Array.isArray(resultado)
              ? resultado.error ?? "No se pudieron cargar las reservas."
              : "No se pudieron cargar las reservas."
          );
        }
        if (!cancelado) setReservas(resultado);
      } catch (errorCarga: unknown) {
        console.error("Error al cargar reservas:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar las reservas."
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

  async function crearReserva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    let reservaGuardada = false;
    try {
      const respuesta = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiculoId: Number(vehiculoId),
          clienteId: clienteId ? Number(clienteId) : null,
          clienteNombreManual: clienteId ? "" : clienteNombreManual,
          fechaInicio,
          fechaFin,
          horaEntrega,
          horaDevolucion,
          notas,
        }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo registrar la reserva.");
      }
      reservaGuardada = true;
      setMensaje("Reserva confirmada. El vehículo quedó bloqueado en ese rango.");
      setClienteId("");
      setClienteNombreManual("");
      setNotas("");
      await Promise.all([cargarReservas()]);
      const opciones = await fetch(
        `/api/reservas/opciones?${new URLSearchParams({ fechaInicio, fechaFin })}`,
        { cache: "no-store" }
      );
      const datos = (await opciones.json()) as {
        vehiculos?: VehiculoOpcion[];
        error?: string;
      };
      if (!opciones.ok || !datos.vehiculos) {
        throw new Error(datos.error ?? "No se actualizó la lista de vehículos.");
      }
      setVehiculos(datos.vehiculos);
      setVehiculoId("");
    } catch (errorGuardado) {
      console.error("Error al registrar reserva:", errorGuardado);
      setError(
        reservaGuardada
          ? "La reserva quedó guardada, pero no se pudo actualizar la pantalla. Recarga para ver los datos más recientes."
          : errorGuardado instanceof Error
            ? errorGuardado.message
            : "No se pudo registrar la reserva."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cancelarReserva(reserva: Reserva) {
    if (
      reserva.estado !== "confirmada" ||
      !window.confirm("¿Deseas cancelar esta reserva?")
    ) {
      return;
    }
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/reservas/${reserva.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelada" }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo cancelar la reserva.");
      }
      setMensaje("Reserva cancelada.");
      await cargarReservas();
    } catch (errorCancelacion) {
      console.error("Error al cancelar reserva:", errorCancelacion);
      setError(
        errorCancelacion instanceof Error
          ? errorCancelacion.message
          : "No se pudo cancelar la reserva."
      );
    }
  }

  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id) === clienteId
  );
  const rangoInvalido = fechaInicio && fechaFin && fechaFin < fechaInicio;

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Reservas y disponibilidad"
          description="Bloquea vehículos por fechas y consulta las reservas registradas."
        >
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Volver al dashboard
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

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
            <CalendarDays size={20} className="text-[#D4202C]" />
            Nueva reserva
          </h2>
          <form onSubmit={crearReserva} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-semibold text-gray-700">
              Fecha de entrega *
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(evento) => setFechaInicio(evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Fecha de devolución *
              <input
                type="date"
                required
                min={fechaInicio}
                value={fechaFin}
                onChange={(evento) => setFechaFin(evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Vehículo disponible *
              <select
                required
                value={vehiculoId}
                onChange={(evento) => setVehiculoId(evento.target.value)}
                disabled={cargandoVehiculos || Boolean(rangoInvalido)}
                className={CAMPO}
              >
                <option value="">
                  {cargandoVehiculos
                    ? "Buscando disponibilidad..."
                    : vehiculos.length
                      ? "Seleccionar vehículo"
                      : "Sin vehículos disponibles"}
                </option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
                    {vehiculo.placa ? ` · ${vehiculo.placa}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Cliente registrado
              <select
                value={clienteId}
                onChange={(evento) => {
                  setClienteId(evento.target.value);
                  if (evento.target.value) setClienteNombreManual("");
                }}
                className={CAMPO}
              >
                <option value="">Cliente nuevo / nombre manual</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} {cliente.apellido} · {cliente.cedula}
                  </option>
                ))}
              </select>
            </label>
            {!clienteSeleccionado && (
              <label className="text-sm font-semibold text-gray-700">
                Nombre del cliente *
                <input
                  required
                  maxLength={200}
                  value={clienteNombreManual}
                  onChange={(evento) => setClienteNombreManual(evento.target.value)}
                  placeholder="Nombre y apellido"
                  className={CAMPO}
                />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-gray-700">
                Hora de entrega
                <input
                  type="time"
                  required
                  value={horaEntrega}
                  onChange={(evento) => setHoraEntrega(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Hora de devolución
                <input
                  type="time"
                  required
                  value={horaDevolucion}
                  onChange={(evento) => setHoraDevolucion(evento.target.value)}
                  className={CAMPO}
                />
              </label>
            </div>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2 lg:col-span-3">
              Notas
              <textarea
                rows={2}
                maxLength={2000}
                value={notas}
                onChange={(evento) => setNotas(evento.target.value)}
                className={CAMPO}
              />
            </label>
            {rangoInvalido && (
              <p className="text-sm text-red-700 sm:col-span-2 lg:col-span-3">
                La devolución no puede ser anterior a la entrega.
              </p>
            )}
            <button
              type="submit"
              disabled={
                guardando ||
                cargandoVehiculos ||
                !vehiculoId ||
                Boolean(rangoInvalido) ||
                (!clienteId && !clienteNombreManual.trim())
              }
              className="rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-3"
            >
              {guardando ? "Guardando reserva..." : "Confirmar reserva"}
            </button>
          </form>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Los días de entrega y devolución se consideran ocupados. La reserva solo se registra cuando la operación se confirma.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-extrabold text-gray-950">Reservas registradas</h2>
            <span className="text-sm text-gray-500">{reservas.length} registros</span>
          </div>
          {cargando ? (
            <p className="p-6 text-sm text-gray-500">Cargando reservas...</p>
          ) : reservas.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Todavía no hay reservas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {reservas.map((reserva) => (
                <li
                  key={reserva.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-gray-950">
                      {reserva.marca} {reserva.modelo} {reserva.anio}
                      {reserva.placa ? ` · ${reserva.placa}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {reserva.nombreCliente ?? "Cliente"} · {formatoFecha(reserva.fechaInicio)} {reserva.horaEntrega} — {formatoFecha(reserva.fechaFin)} {reserva.horaDevolucion}
                    </p>
                    {reserva.notas && (
                      <p className="mt-1 text-xs text-gray-500">{reserva.notas}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        reserva.estado === "confirmada"
                          ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800"
                          : "rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600"
                      }
                    >
                      {reserva.estado === "confirmada" ? "Confirmada" : "Cancelada"}
                    </span>
                    {reserva.estado === "confirmada" ? (
                      <button
                        type="button"
                        onClick={() => void cancelarReserva(reserva)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        <XCircle size={15} />
                        Cancelar
                      </button>
                    ) : (
                      <CheckCircle2 size={18} className="text-gray-300" />
                    )}
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
