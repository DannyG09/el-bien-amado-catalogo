"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  FileText,
  CheckCircle2,
  Plus,
  Receipt,
  CircleAlert,
  FileSignature,
  UsersRound,
  Wrench,
  CalendarDays,
} from "lucide-react";
import AdminPageHeader from "./AdminPageHeader";

type VehiculoMatricula = {
  vehiculoId: number;
  tieneMatricula: boolean;
};

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  placa: string;
  estado: "disponible" | "reservado" | "rentado" | "mantenimiento" | "pintura";
  ultimoKilometraje: number | null;
};

type MantenimientoReciente = {
  id: number;
  vehiculoId: number;
  vehiculo: string;
  placa: string;
  fecha: string;
  categoria: string;
  monto: number;
  kilometraje: number;
};

type ResumenMantenimiento = {
  gastoTotal: number;
  mantenimientoHistorico: number;
  proyeccionRecurrenteAnual: number;
};

type RespuestaMantenimiento = {
  registros: MantenimientoReciente[];
  resumen: ResumenMantenimiento;
};

type MultaDanoReciente = {
  id: number;
  vehiculo: string;
  placa: string | null;
  cliente: string | null;
  tipo: "multa" | "dano";
  fecha: string;
  monto: number;
  estado: "pendiente" | "pagado";
};

type RespuestaMultasDanos = {
  registros: MultaDanoReciente[];
  resumen: {
    montoTotal: number;
    pendiente: number;
    pagado: number;
  };
};

type EventoAgenda = {
  origen: "contrato" | "reserva";
  registroId: number;
  tipo: "entrega" | "devolucion" | "extension_pendiente";
  fecha: string;
  hora: string;
  cliente: string | null;
  marca: string;
  modelo: string;
  placa: string | null;
  estado: string;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});
const FORMATO_NUMERO = new Intl.NumberFormat("es-DO");

function formatFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function fechaHoyLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[] | null>(null);
  const [resumen, setResumen] = useState<ResumenMantenimiento | null>(null);
  const [mantenimientos, setMantenimientos] = useState<
    MantenimientoReciente[] | null
  >(null);
  const [multasDanos, setMultasDanos] = useState<
    MultaDanoReciente[] | null
  >(null);
  const [resumenMultasDanos, setResumenMultasDanos] = useState<
    RespuestaMultasDanos["resumen"] | null
  >(null);
  const [agenda, setAgenda] = useState<EventoAgenda[] | null>(null);
  const [matriculas, setMatriculas] = useState<VehiculoMatricula[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarResumen() {
      const resultados = await Promise.allSettled([
        fetch("/api/vehiculos?administracion=true", { cache: "no-store" }),
        fetch("/api/mantenimientos?pagina=1&limite=5", {
          cache: "no-store",
        }),
        fetch("/api/multas-danos?pagina=1&limite=5", {
          cache: "no-store",
        }),
        fetch("/api/agenda", { cache: "no-store" }),
        fetch("/api/matriculas", { cache: "no-store" }),
      ]);

      if (cancelado) return;

      const errores: string[] = [];
      const respuestaVehiculos = resultados[0];
      if (respuestaVehiculos.status === "rejected") {
        errores.push("No se pudo cargar el resumen de vehículos.");
      } else if (!respuestaVehiculos.value.ok) {
        errores.push("No se pudo cargar el resumen de vehículos.");
      } else {
        const datos = (await respuestaVehiculos.value.json()) as Vehiculo[];
        if (!cancelado) setVehiculos(datos);
      }

      const respuestaMantenimiento = resultados[1];
      if (respuestaMantenimiento.status === "rejected") {
        errores.push("No se pudo cargar el resumen de mantenimiento.");
      } else if (!respuestaMantenimiento.value.ok) {
        errores.push("No se pudo cargar el resumen de mantenimiento.");
      } else {
        const datos = (await respuestaMantenimiento.value.json()) as
          RespuestaMantenimiento;
        if (!cancelado) {
          setResumen(datos.resumen);
          setMantenimientos(datos.registros);
        }
      }

      const respuestaMultasDanos = resultados[2];
      if (respuestaMultasDanos.status === "rejected") {
        errores.push("No se pudo cargar el resumen de multas y daños.");
      } else if (!respuestaMultasDanos.value.ok) {
        errores.push("No se pudo cargar el resumen de multas y daños.");
      } else {
        const datos = (await respuestaMultasDanos.value.json()) as
          RespuestaMultasDanos;
        if (!cancelado) {
          setResumenMultasDanos(datos.resumen);
          setMultasDanos(datos.registros);
        }
      }

      const respuestaAgenda = resultados[3];
      if (respuestaAgenda.status === "rejected") {
        errores.push("No se pudo cargar la agenda de entregas y devoluciones.");
      } else if (!respuestaAgenda.value.ok) {
        errores.push("No se pudo cargar la agenda de entregas y devoluciones.");
      } else {
        const datos = (await respuestaAgenda.value.json()) as EventoAgenda[];
        if (!cancelado) setAgenda(datos);
      }

      const respuestaMatriculas = resultados[4];
      if (respuestaMatriculas.status === "rejected" || !respuestaMatriculas.value.ok) {
        errores.push("No se pudo cargar el resumen de matrículas.");
      } else {
        try {
          const datos: unknown = await respuestaMatriculas.value.json();
          // La API debe devolver una lista de vehículos con tieneMatricula.
          if (
            !Array.isArray(datos) ||
            !datos.every(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as VehiculoMatricula).tieneMatricula === "boolean"
            )
          ) {
            throw new Error("Formato inesperado en /api/matriculas");
          }
          if (!cancelado) setMatriculas(datos as VehiculoMatricula[]);
        } catch {
          errores.push("La API de matrículas devolvió datos no válidos.");
        }
      }

      if (!cancelado && errores.length > 0) setError(errores.join(" "));
    }

    void cargarResumen().catch((errorCarga: unknown) => {
      if (cancelado) return;
      console.error("Error al cargar el resumen del panel:", errorCarga);
      setError("No se pudo cargar el resumen del panel.");
    });

    return () => {
      cancelado = true;
    };
  }, []);

  const cantidadVehiculos = vehiculos?.length ?? null;
  const vehiculosDisponibles =
    vehiculos?.filter((vehiculo) => vehiculo.estado === "disponible").length ??
    null;
  const vehiculosRentados =
    vehiculos?.filter((vehiculo) => vehiculo.estado === "rentado").length ?? null;
  const vehiculosReservados =
    vehiculos?.filter((vehiculo) => vehiculo.estado === "reservado").length ?? null;
  const vehiculosEnMantenimiento =
    vehiculos?.filter((vehiculo) => vehiculo.estado === "mantenimiento") ?? [];
  const vehiculosEnPintura =
    vehiculos?.filter((vehiculo) => vehiculo.estado === "pintura") ?? [];
  const vehiculosEnTaller = [
    ...vehiculosEnMantenimiento,
    ...vehiculosEnPintura,
  ];

  const matriculasRegistradas = matriculas?.filter(
    (vehiculo) => vehiculo.tieneMatricula
  ).length ?? null;
  const matriculasPendientes = matriculas === null
    ? null
    : matriculas.length - (matriculasRegistradas ?? 0);

  const estadisticas = [
    {
      label: "Vehículos en flota",
      valor: cantidadVehiculos === null ? "—" : FORMATO_NUMERO.format(cantidadVehiculos),
      detalle:
        vehiculosDisponibles === null
          ? "Cargando inventario"
          : `${FORMATO_NUMERO.format(vehiculosDisponibles)} disponibles`,
      icono: CarFront,
      color: "bg-red-50 text-[#D4202C]",
    },
    {
      label: "Matrículas registradas",
      valor: matriculasRegistradas === null
        ? "—"
        : FORMATO_NUMERO.format(matriculasRegistradas),
      detalle: matriculasPendientes === null
        ? "Cargando documentos"
        : `${FORMATO_NUMERO.format(matriculasPendientes)} pendientes`,
      icono: FileText,
      color: "bg-red-50 text-[#D4202C]",
    },
    {
      label: "Disponibles para renta",
      valor:
        vehiculosDisponibles === null
          ? "—"
          : FORMATO_NUMERO.format(vehiculosDisponibles),
      detalle:
        vehiculos === null
          ? "Cargando inventario"
          : `${FORMATO_NUMERO.format(vehiculosRentados ?? 0)} rentados · ${FORMATO_NUMERO.format(
              vehiculosReservados ?? 0
            )} reservados · ${FORMATO_NUMERO.format(vehiculosEnTaller.length)} en taller`,
      icono: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Proyección anual de gastos",
      valor:
        resumen === null
          ? "—"
          : FORMATO_DOP.format(resumen.proyeccionRecurrenteAnual),
      detalle: "Gastos mensuales anualizados",
      icono: Receipt,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Vehículos en taller",
      valor:
        vehiculos === null
          ? "—"
          : FORMATO_NUMERO.format(vehiculosEnTaller.length),
      detalle:
        vehiculos === null
          ? "Cargando inventario"
          : `${vehiculosEnMantenimiento.length} en mantenimiento · ${vehiculosEnPintura.length} en pintura`,
      icono: Wrench,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Multas y daños pendientes",
      valor:
        resumenMultasDanos === null
          ? "—"
          : FORMATO_DOP.format(resumenMultasDanos.pendiente),
      detalle:
        resumenMultasDanos === null
          ? "Cargando registros"
          : `${FORMATO_DOP.format(resumenMultasDanos.pagado)} pagados`,
      icono: CircleAlert,
      color: "bg-orange-50 text-orange-700",
    },
  ];

  const accesos = [
    {
      titulo: "Vehículos",
      descripcion: "Administra el inventario, disponibilidad y fotografías.",
      href: "/admin/vehiculos",
      icono: CarFront,
      acento: "bg-red-50 text-[#D4202C]",
      etiqueta: cantidadVehiculos === null ? "Ver flota" : `${cantidadVehiculos} en flota`,
      disponible: true,
    },
    {
      titulo: "Matrículas",
      descripcion:
        "Consulta, registra y actualiza matrículas de vehículos en formato imagen o PDF.",
      href: "/admin/matriculas",
      icono: FileText,
      acento: "bg-red-50 text-[#D4202C]",
      etiqueta: matriculasPendientes === null
        ? "Ver matrículas"
        : `${FORMATO_NUMERO.format(matriculasPendientes)} pendientes`,
      disponible: true,
    },
    {
      titulo: "Mantenimiento",
      descripcion: "Registra mantenimientos y consulta el historial de la flota.",
      href: "/admin/mantenimiento",
      icono: Wrench,
      acento: "bg-amber-50 text-amber-700",
      etiqueta:
        resumen === null
          ? "Ver reportes"
          : FORMATO_DOP.format(resumen.gastoTotal),
      disponible: true,
    },
    {
      titulo: "Clientes",
      descripcion: "Administra los datos y documentos de tus clientes.",
      href: "/admin/clientes",
      icono: UsersRound,
      acento: "bg-blue-50 text-blue-700",
      etiqueta: "Ver clientes",
      disponible: true,
    },
    {
      titulo: "Contratos",
      descripcion: "Crea contratos de renta, registra pagos y firmas.",
      href: "/admin/contratos",
      icono: FileSignature,
      acento: "bg-indigo-50 text-indigo-700",
      etiqueta: "Administrar contratos",
      disponible: true,
    },
    {
      titulo: "Reservas",
      descripcion: "Bloquea vehículos por fecha y administra la disponibilidad.",
      href: "/admin/reservas",
      icono: CalendarDays,
      acento: "bg-cyan-50 text-cyan-700",
      etiqueta: "Ver reservas",
      disponible: true,
    },
    {
      titulo: "Pagos",
      descripcion: "Administra los pagos y gastos recurrentes de los vehículos.",
      href: "/admin/gastos-recurrentes",
      icono: Receipt,
      acento: "bg-violet-50 text-violet-700",
      etiqueta: "Gastos recurrentes",
      disponible: true,
    },
    {
      titulo: "Multas y daño",
      descripcion: "Registra incidentes, evidencia y seguimiento de pagos.",
      href: "/admin/multas-danos",
      icono: CircleAlert,
      acento: "bg-orange-50 text-orange-700",
      etiqueta:
        resumenMultasDanos === null
          ? "Ver registros"
          : `${FORMATO_DOP.format(resumenMultasDanos.pendiente)} pendiente`,
      disponible: true,
    },
  ];

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Dashboard"
          description="Un vistazo rápido al estado de tu flota y las herramientas para administrarla."
        >
          <Link
            href="/admin/mantenimiento"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Wrench size={17} />
            Registrar mantenimiento
          </Link>
          <Link
            href="/admin/reservas"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-cyan-800 transition hover:bg-cyan-50"
          >
            <CalendarDays size={17} />
            Nueva reserva
          </Link>
          <Link
            href="/admin/multas-danos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-800 transition hover:bg-orange-50"
          >
            <CircleAlert size={17} />
            Registrar multa o daño
          </Link>
          <Link
            href="/admin/vehiculos/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-[#b81b26]"
          >
            <Plus size={18} />
            Agregar vehículo
          </Link>
        </AdminPageHeader>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
          >
            {error}
          </div>
        )}

        <section
          aria-label="Indicadores de la flota"
          className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {estadisticas.map(({ label, valor, detalle, icono: Icon, color }) => (
            <article
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-500">{label}</p>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon size={19} />
                </span>
              </div>
              <p className="mt-5 text-2xl font-extrabold tracking-tight text-gray-950">
                {valor}
              </p>
              <p className="mt-1 text-xs text-gray-500">{detalle}</p>
            </article>
          ))}
        </section>

        <section className="mb-9 overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-gray-950">
                Próximas entregas y devoluciones
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Reservas confirmadas, contratos activos y extensiones pendientes
              </p>
            </div>
            <Link
              href="/admin/reservas"
              className="text-sm font-bold text-[#D4202C] hover:underline"
            >
              Administrar reservas
            </Link>
          </div>
          {agenda === null ? (
            <p className="p-5 text-sm text-gray-500">Cargando agenda...</p>
          ) : agenda.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">
              No hay movimientos próximos ni devoluciones vencidas.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {agenda.map((evento, indice) => {
                const vencido =
                  evento.tipo === "devolucion" &&
                  evento.fecha < fechaHoyLocal();
                const titulo =
                  evento.tipo === "entrega"
                    ? "Entrega"
                    : evento.tipo === "extension_pendiente"
                      ? "Extensión por aprobar"
                      : vencido
                        ? "Devolución vencida"
                        : "Devolución";
                const href =
                  evento.origen === "contrato"
                    ? `/admin/contratos/${evento.registroId}`
                    : "/admin/reservas";
                return (
                  <li
                    key={`${evento.origen}-${evento.registroId}-${evento.tipo}-${indice}`}
                    className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">
                        <span
                          className={
                            vencido
                              ? "mr-2 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-700"
                              : "mr-2 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-bold uppercase text-cyan-800"
                          }
                        >
                          {titulo}
                        </span>
                        {evento.marca} {evento.modelo}
                        {evento.placa ? ` · ${evento.placa}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatFecha(evento.fecha)} · {evento.hora}
                        {evento.cliente ? ` · ${evento.cliente}` : ""}
                        {evento.origen === "reserva" ? " · Reserva" : ""}
                      </p>
                    </div>
                    <Link
                      href={href}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Ver detalle
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-9 grid gap-6 xl:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-extrabold text-gray-950">
                  Vehículos en taller
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Unidades en mantenimiento mecánico o pintura
                </p>
              </div>
              <Link
                href="/admin/vehiculos"
                className="text-sm font-bold text-[#D4202C] hover:underline"
              >
                Ver flota
              </Link>
            </div>
            {vehiculos === null ? (
              <p className="p-5 text-sm text-gray-500">Cargando vehículos...</p>
            ) : vehiculosEnTaller.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">
                No hay vehículos en taller.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {vehiculosEnTaller.slice(0, 5).map((vehiculo) => (
                  <li
                    key={vehiculo.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {vehiculo.marca} {vehiculo.modelo}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {vehiculo.estado === "pintura"
                          ? "Taller de pintura"
                          : "En mantenimiento"}{" "}
                        · {vehiculo.placa || "Sin placa"}
                        {vehiculo.ultimoKilometraje != null &&
                          ` · ${FORMATO_NUMERO.format(
                            vehiculo.ultimoKilometraje
                          )} km`}
                      </p>
                    </div>
                    <Link
                      href={`/admin/vehiculos/${vehiculo.id}/editar`}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Ver vehículo
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {vehiculosEnTaller.length > 5 && (
              <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                y {vehiculosEnTaller.length - 5} más en taller
              </p>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-extrabold text-gray-950">
                  Mantenimientos recientes
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Últimos registros de la flota
                </p>
              </div>
              <Link
                href="/admin/mantenimiento"
                className="text-sm font-bold text-[#D4202C] hover:underline"
              >
                Ver historial
              </Link>
            </div>
            {mantenimientos === null ? (
              <p className="p-5 text-sm text-gray-500">
                Cargando mantenimientos...
              </p>
            ) : mantenimientos.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">
                Aún no hay mantenimientos registrados.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {mantenimientos.map((mantenimiento) => (
                  <li
                    key={mantenimiento.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {mantenimiento.vehiculo}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {mantenimiento.categoria} ·{" "}
                        {formatFecha(mantenimiento.fecha)} ·{" "}
                        {FORMATO_NUMERO.format(mantenimiento.kilometraje)} km
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-900">
                      {FORMATO_DOP.format(mantenimiento.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="mb-9 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="font-extrabold text-gray-950">
                Multas y daños recientes
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Últimos incidentes y su estado de pago
              </p>
            </div>
            <Link
              href="/admin/multas-danos"
              className="text-sm font-bold text-[#D4202C] hover:underline"
            >
              Ver historial
            </Link>
          </div>
          {multasDanos === null ? (
            <p className="p-5 text-sm text-gray-500">
              Cargando multas y daños...
            </p>
          ) : multasDanos.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">
              Aún no hay multas o daños registrados.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {multasDanos.map((registro) => (
                <li
                  key={registro.id}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {registro.tipo === "multa" ? "Multa" : "Daño"} ·{" "}
                      {registro.vehiculo} · {registro.placa || "Sin placa"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {formatFecha(registro.fecha)}
                      {registro.cliente ? ` · ${registro.cliente}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        registro.estado === "pagado"
                          ? "bg-green-50 text-green-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {registro.estado === "pagado" ? "Pagado" : "Pendiente"}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {FORMATO_DOP.format(registro.monto)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4202C]">
              Herramientas
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-950">
              Administración
            </h2>
          </div>
          <span className="hidden text-sm text-gray-500 sm:block">
            Accesos rápidos a tu operación
          </span>
        </div>

        <section
          aria-label="Opciones de administración"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {accesos.map(
            ({
              titulo,
              descripcion,
              href,
              icono: Icon,
              acento,
              etiqueta,
              disponible,
            }) => {
              const contenido = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${acento}`}
                    >
                      <Icon size={23} />
                    </span>
                    {disponible ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                        {etiqueta}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-400">
                        {etiqueta}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-gray-950">
                    {titulo}
                  </h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">
                    {descripcion}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm font-bold">
                    <span className={disponible ? "text-[#D4202C]" : "text-gray-400"}>
                      {disponible ? "Abrir sección" : "En desarrollo"}
                    </span>
                    {disponible ? (
                      <ArrowRight
                        size={18}
                        className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#D4202C]"
                      />
                    ) : (
                      <ArrowUpRight size={18} className="text-gray-300" />
                    )}
                  </div>
                </>
              );

              return disponible ? (
                <Link
                  key={titulo}
                  href={href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                >
                  {contenido}
                </Link>
              ) : (
                <div
                  key={titulo}
                  aria-disabled="true"
                  className="rounded-2xl border border-gray-200 bg-white p-5 opacity-70"
                >
                  {contenido}
                </div>
              );
            }
          )}
        </section>
      </div>
    </main>
  );
}
