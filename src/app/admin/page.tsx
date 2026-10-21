"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Plus,
  Receipt,
  UsersRound,
  Wrench,
} from "lucide-react";
import AdminPageHeader from "./AdminPageHeader";

type Vehiculo = {
  id: number;
  disponible: boolean;
};

type ResumenMantenimiento = {
  gastoTotal: number;
  mantenimientoHistorico: number;
  proyeccionRecurrenteAnual: number;
  vehiculoMayorKilometraje: {
    kilometraje: number;
  } | null;
};

type RespuestaMantenimiento = {
  resumen: ResumenMantenimiento;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});
const FORMATO_NUMERO = new Intl.NumberFormat("es-DO");

export default function AdminPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[] | null>(null);
  const [resumen, setResumen] = useState<ResumenMantenimiento | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function cargarResumen() {
      const resultados = await Promise.allSettled([
        fetch("/api/vehiculos", { cache: "no-store" }),
        fetch("/api/mantenimientos?pagina=1&limite=1", {
          cache: "no-store",
        }),
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
        if (!cancelado) setResumen(datos.resumen);
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
    vehiculos?.filter((vehiculo) => vehiculo.disponible).length ?? null;

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
      label: "Disponibles para renta",
      valor:
        vehiculosDisponibles === null
          ? "—"
          : FORMATO_NUMERO.format(vehiculosDisponibles),
      detalle:
        vehiculos === null
          ? "Cargando inventario"
          : `${FORMATO_NUMERO.format(
              vehiculos.length -
                vehiculos.filter((vehiculo) => vehiculo.disponible).length
            )} no disponibles`,
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
      label: "Kilometraje más alto",
      valor:
        resumen?.vehiculoMayorKilometraje === null
          ? "—"
          : resumen?.vehiculoMayorKilometraje
            ? `${FORMATO_NUMERO.format(
                resumen.vehiculoMayorKilometraje.kilometraje
              )} km`
            : "—",
      detalle:
        resumen?.vehiculoMayorKilometraje === null
          ? "Sin lecturas registradas"
          : "Última lectura registrada",
      icono: Gauge,
      color: "bg-blue-50 text-blue-700",
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
      titulo: "Mantenimiento",
      descripcion: "Consulta gastos, kilometraje y próximos costos de la flota.",
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
      descripcion: "La gestión de clientes estará disponible próximamente.",
      href: "#",
      icono: UsersRound,
      acento: "bg-blue-50 text-blue-700",
      etiqueta: "Próximamente",
      disponible: false,
    },
    {
      titulo: "Rentas",
      descripcion: "La gestión de rentas estará disponible próximamente.",
      href: "#",
      icono: ClipboardList,
      acento: "bg-violet-50 text-violet-700",
      etiqueta: "Próximamente",
      disponible: false,
    },
  ];

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Panel general"
          description="Un vistazo rápido al estado de tu flota y las herramientas para administrarla."
        >
          <Link
            href="/admin/mantenimiento"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Wrench size={17} />
            Registrar gasto
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
          className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
