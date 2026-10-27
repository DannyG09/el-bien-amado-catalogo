"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSignature } from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";

type ClienteOpcion = {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  whatsapp: string | null;
  vencimientoLicencia: string;
};
type VehiculoOpcion = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
  precioDia: number;
};

const HOY = new Date();
const FECHA_HOY = `${HOY.getFullYear()}-${String(HOY.getMonth() + 1).padStart(2, "0")}-${String(HOY.getDate()).padStart(2, "0")}`;
const CAMPO =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D4202C]";

export default function NuevoContratoPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoOpcion[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const vehiculoIdActual = useRef("");
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");
  const [fechaInicio, setFechaInicio] = useState(FECHA_HOY);
  const [fechaFin, setFechaFin] = useState(FECHA_HOY);
  const [horaEntrega, setHoraEntrega] = useState("09:00");
  const [horaDevolucion, setHoraDevolucion] = useState("09:00");
  const [precioDia, setPrecioDia] = useState("");
  const [deposito, setDeposito] = useState("0");
  const [tipoDescuento, setTipoDescuento] = useState<"fijo" | "porcentaje">("fijo");
  const [valorDescuento, setValorDescuento] = useState("0");
  const [lugarEntrega, setLugarEntrega] = useState("");
  const [lugarDevolucion, setLugarDevolucion] = useState("");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargarOpciones() {
      if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
        setVehiculos([]);
        vehiculoIdActual.current = "";
        setVehiculoId("");
        setPrecioDia("");
        setError("La fecha de devolución no puede ser anterior a la entrega.");
        setCargando(false);
        return;
      }

      try {
        const parametros = new URLSearchParams();
        if (fechaInicio && fechaFin) {
          parametros.set("fechaInicio", fechaInicio);
          parametros.set("fechaFin", fechaFin);
        }
        const consulta = parametros.size > 0 ? `?${parametros.toString()}` : "";
        const respuesta = await fetch(`/api/contratos/opciones${consulta}`, {
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
        if (!cancelado) {
          setClientes(resultado.clientes);
          setVehiculos(resultado.vehiculos);
          if (
            vehiculoIdActual.current &&
            !resultado.vehiculos.some(
              (vehiculo) => String(vehiculo.id) === vehiculoIdActual.current
            )
          ) {
            vehiculoIdActual.current = "";
            setVehiculoId("");
            setPrecioDia("");
          }
          const clientePreseleccionado = new URLSearchParams(
            window.location.search
          ).get("clienteId");
          if (
            clientePreseleccionado &&
            resultado.clientes.some((cliente) =>
              String(cliente.id) === clientePreseleccionado
            )
          ) {
            setClienteId((actual) => actual || clientePreseleccionado);
          }
        }
      } catch (errorCarga) {
        console.error("Error al cargar opciones del contrato:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar clientes y vehículos."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargarOpciones();
    return () => {
      cancelado = true;
    };
  }, [fechaInicio, fechaFin]);

  const vehiculoSeleccionado = vehiculos.find(
    (vehiculo) => String(vehiculo.id) === vehiculoId
  );
  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id) === clienteId
  );
  const dias = useMemo(() => {
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) return 1;
    const inicio = new Date(`${fechaInicio}T00:00:00Z`).getTime();
    const fin = new Date(`${fechaFin}T00:00:00Z`).getTime();
    return Math.max(1, Math.ceil((fin - inicio) / 86_400_000));
  }, [fechaInicio, fechaFin]);
  const subtotal = dias * Number(precioDia || 0);
  const descuentoCalculado =
    tipoDescuento === "porcentaje"
      ? (subtotal * Number(valorDescuento || 0)) / 100
      : Number(valorDescuento || 0);
  const total = Math.max(0, subtotal - descuentoCalculado);

  async function crearContrato(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: Number(clienteId),
          vehiculoId: Number(vehiculoId),
          moneda,
          fechaInicio,
          fechaFin,
          horaEntrega,
          horaDevolucion,
          precioDia,
          deposito,
          tipoDescuento,
          valorDescuento,
          lugarEntrega,
          lugarDevolucion,
          notas,
        }),
      });
      const resultado = (await respuesta.json()) as {
        id?: number;
        error?: string;
      };
      if (!respuesta.ok || !resultado.id) {
        throw new Error(resultado.error ?? "No se pudo crear el contrato.");
      }
      router.push(`/admin/contratos/${resultado.id}`);
    } catch (errorGuardado) {
      console.error("Error al crear contrato:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo crear el contrato."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Nuevo contrato"
          description="Selecciona el cliente y uno de los vehículos disponibles."
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
        {!cargando && clientes.length === 0 && (
          <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Registra al menos un cliente antes de crear un contrato.{" "}
            <Link className="font-bold underline" href="/admin/clientes/nuevo">
              Agregar cliente
            </Link>
          </p>
        )}
        {!cargando && vehiculos.length === 0 && (
          <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            No hay vehículos disponibles para contratar.{" "}
            <Link className="font-bold underline" href="/admin/vehiculos">
              Revisar vehículos
            </Link>
          </p>
        )}
        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando clientes y vehículos...
          </p>
        ) : (
          <form onSubmit={crearContrato} className="space-y-5">
            <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
              <h2 className="text-lg font-extrabold text-gray-950 sm:col-span-2">
                Cliente y vehículo
              </h2>
              <label className="text-sm font-semibold text-gray-700">
                Cliente *
                <select
                  required
                  value={clienteId}
                  onChange={(evento) => setClienteId(evento.target.value)}
                  className={CAMPO}
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre} {cliente.apellido} · {cliente.cedula}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Vehículo disponible *
                <select
                  required
                  value={vehiculoId}
                  onChange={(evento) => {
                    const valor = evento.target.value;
                    vehiculoIdActual.current = valor;
                    setVehiculoId(valor);
                    const elegido = vehiculos.find(
                      (vehiculo) => String(vehiculo.id) === valor
                    );
                    if (elegido) {
                      setPrecioDia(String(elegido.precioDia));
                      setMoneda("USD");
                    }
                  }}
                  className={CAMPO}
                >
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
                      {vehiculo.placa ? ` · ${vehiculo.placa}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {clienteSeleccionado && (
                <p className="text-xs text-gray-500 sm:col-span-2">
                  Vencimiento de licencia: {clienteSeleccionado.vencimientoLicencia}
                </p>
              )}
              {vehiculoSeleccionado && (
                <p className="text-xs text-gray-500 sm:col-span-2">
                  La disponibilidad se valida para el rango elegido y se vuelve a revisar al crear y firmar el contrato.
                </p>
              )}
            </section>

            <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
              <h2 className="text-lg font-extrabold text-gray-950 sm:col-span-2">
                Moneda y fechas
              </h2>
              <label className="text-sm font-semibold text-gray-700">
                Moneda *
                <select
                  value={moneda}
                  onChange={(evento) =>
                    setMoneda(evento.target.value as "DOP" | "USD")
                  }
                  className={CAMPO}
                >
                  <option value="DOP">Pesos dominicanos (DOP)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </label>
              <div className="hidden sm:block" />
              <label className="text-sm font-semibold text-gray-700">
                Fecha de entrega *
                <input
                  required
                  type="date"
                  value={fechaInicio}
                  onChange={(evento) => setFechaInicio(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Fecha de devolución *
                <input
                  required
                  type="date"
                  min={fechaInicio}
                  value={fechaFin}
                  onChange={(evento) => setFechaFin(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Hora de entrega *
                <input
                  required
                  type="time"
                  value={horaEntrega}
                  onChange={(evento) => setHoraEntrega(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Hora de devolución *
                <input
                  required
                  type="time"
                  value={horaDevolucion}
                  onChange={(evento) => setHoraDevolucion(evento.target.value)}
                  className={CAMPO}
                />
              </label>
            </section>

            <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7">
              <h2 className="text-lg font-extrabold text-gray-950 sm:col-span-2">
                Precio y condiciones
              </h2>
              <label className="text-sm font-semibold text-gray-700">
                Precio por día ({moneda}) *
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={precioDia}
                  onChange={(evento) => setPrecioDia(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Depósito / garantía ({moneda})
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deposito}
                  onChange={(evento) => setDeposito(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Tipo de descuento
                <select
                  value={tipoDescuento}
                  onChange={(evento) =>
                    setTipoDescuento(evento.target.value as "fijo" | "porcentaje")
                  }
                  className={CAMPO}
                >
                  <option value="fijo">Monto fijo ({moneda})</option>
                  <option value="porcentaje">Porcentaje (%)</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Descuento
                <input
                  type="number"
                  min="0"
                  max={tipoDescuento === "porcentaje" ? 100 : undefined}
                  step="0.01"
                  value={valorDescuento}
                  onChange={(evento) => setValorDescuento(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Lugar de entrega
                <input
                  maxLength={500}
                  value={lugarEntrega}
                  onChange={(evento) => setLugarEntrega(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700">
                Lugar de devolución
                <input
                  maxLength={500}
                  value={lugarDevolucion}
                  onChange={(evento) => setLugarDevolucion(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
                Notas
                <textarea
                  maxLength={5000}
                  rows={3}
                  value={notas}
                  onChange={(evento) => setNotas(evento.target.value)}
                  className={CAMPO}
                />
              </label>
              <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
                <p className="text-sm text-gray-600">
                  {dias} {dias === 1 ? "día" : "días"} · Subtotal{" "}
                  {(subtotal).toLocaleString("es-DO", {
                    style: "currency",
                    currency: moneda,
                  })}
                </p>
                <p className="mt-1 text-lg font-extrabold text-gray-950">
                  Total de renta:{" "}
                  {total.toLocaleString("es-DO", {
                    style: "currency",
                    currency: moneda,
                  })}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  La garantía se registra aparte. El contrato queda pendiente de firma y
                  reserva el vehículo.
                </p>
              </div>
            </section>

            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <Link
                href="/admin/contratos"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                Volver
              </Link>
              <button
                type="submit"
                disabled={
                  guardando ||
                  !clientes.length ||
                  !vehiculos.length ||
                  (clienteSeleccionado != null &&
                    clienteSeleccionado.vencimientoLicencia < fechaInicio)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileSignature size={17} />
                {guardando ? "Creando..." : "Crear contrato"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
