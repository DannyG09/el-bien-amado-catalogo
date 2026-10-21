"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";

/*
  PALETA: negro, rojo #D4202C y blanco.
  LOGO: /public/logo.jpeg
*/

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  color: string;
  tipoSeguro: string;
  precioDia: number;
  imagen: string | null;
  descripcion: string | null;
  disponible: boolean;
  ultimoKilometraje: number | null;
};

type Filtro = "todos" | "disponibles" | "no-disponibles";

type Orden =
  | "reciente"
  | "precio-asc"
  | "precio-desc"
  | "anio-desc"
  | "anio-asc"
  | "marca-asc";

const OPCIONES_ORDEN: { id: Orden; label: string }[] = [
  { id: "reciente", label: "Más recientes" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "anio-desc", label: "Año: más nuevo primero" },
  { id: "anio-asc", label: "Año: más antiguo primero" },
  { id: "marca-asc", label: "Marca: A-Z" },
];
const FORMATO_NUMERO = new Intl.NumberFormat("es-DO");

export default function VehiculosAdminPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("reciente");
  const [marcaFiltro, setMarcaFiltro] = useState("todas");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [vehiculoPendienteEliminar, setVehiculoPendienteEliminar] =
    useState<Vehiculo | null>(null);
  const [passwordEliminar, setPasswordEliminar] = useState("");
  const [errorEliminar, setErrorEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [vehiculoPendienteDisponibilidad, setVehiculoPendienteDisponibilidad] =
    useState<Vehiculo | null>(null);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");
  const [actualizandoDisponibilidad, setActualizandoDisponibilidad] =
    useState<number | null>(null);
  const [vehiculosExpandidos, setVehiculosExpandidos] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    let cancelado = false;

    async function cargarVehiculos() {
      try {
        const respuesta = await fetch("/api/vehiculos", {
          cache: "no-store",
        });
        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los vehículos.");
        }

        const datos = (await respuesta.json()) as Vehiculo[];
        if (!cancelado) setVehiculos(datos);
      } catch (errorCarga) {
        if (!cancelado) {
          console.error(errorCarga);
          setError("Ocurrió un error al cargar los vehículos.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarVehiculos();
    return () => {
      cancelado = true;
    };
  }, []);

  function cancelarEliminacion() {
    if (eliminando) return;
    setVehiculoPendienteEliminar(null);
    setPasswordEliminar("");
    setErrorEliminar("");
  }

  async function eliminarVehiculo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!vehiculoPendienteEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar("");
    try {
      const respuesta = await fetch(
        `/api/vehiculos/${vehiculoPendienteEliminar.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: passwordEliminar }),
        }
      );
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo eliminar el vehículo.");
      }

      setVehiculos((actuales) =>
        actuales.filter((vehiculo) => vehiculo.id !== vehiculoPendienteEliminar.id)
      );
      setVehiculoPendienteEliminar(null);
      setPasswordEliminar("");
    } catch (errorEliminacion) {
      console.error("Error al eliminar el vehículo:", errorEliminacion);
      setErrorEliminar(
        errorEliminacion instanceof Error
          ? errorEliminacion.message
          : "No se pudo eliminar el vehículo."
      );
    } finally {
      setEliminando(false);
    }
  }

  async function cambiarDisponibilidad(
    vehiculo: Vehiculo,
    disponible: boolean
  ) {
    if (actualizandoDisponibilidad !== null) return;

    setActualizandoDisponibilidad(vehiculo.id);
    setErrorDisponibilidad("");
    setError("");
    try {
      const respuesta = await fetch(`/api/vehiculos/${vehiculo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponible }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        disponible?: boolean;
      };
      if (!respuesta.ok) {
        throw new Error(
          resultado.error ?? "No se pudo actualizar la disponibilidad."
        );
      }

      setVehiculos((actuales) =>
        actuales.map((actual) =>
          actual.id === vehiculo.id
            ? { ...actual, disponible: resultado.disponible ?? disponible }
            : actual
        )
      );
      setVehiculoPendienteDisponibilidad(null);
    } catch (errorActualizacion) {
      console.error("Error al actualizar la disponibilidad:", errorActualizacion);
      const mensaje =
        errorActualizacion instanceof Error
          ? errorActualizacion.message
          : "No se pudo actualizar la disponibilidad.";
      if (!disponible) {
        setErrorDisponibilidad(mensaje);
      } else {
        setError(mensaje);
      }
    } finally {
      setActualizandoDisponibilidad(null);
    }
  }

  function solicitarCambioDisponibilidad(vehiculo: Vehiculo) {
    if (vehiculo.disponible) {
      setVehiculoPendienteDisponibilidad(vehiculo);
      setErrorDisponibilidad("");
      return;
    }
    void cambiarDisponibilidad(vehiculo, true);
  }

  function alternarDetallesVehiculo(vehiculoId: number) {
    setVehiculosExpandidos((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(vehiculoId)) {
        nuevos.delete(vehiculoId);
      } else {
        nuevos.add(vehiculoId);
      }
      return nuevos;
    });
  }

  const disponibles = vehiculos.filter((v) => v.disponible).length;

  const marcas = useMemo(
    () => Array.from(new Set(vehiculos.map((v) => v.marca))).sort(),
    [vehiculos]
  );

  const hayFiltrosActivos =
    busqueda !== "" ||
    filtro !== "todos" ||
    orden !== "reciente" ||
    marcaFiltro !== "todas" ||
    precioMin !== "" ||
    precioMax !== "";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltro("todos");
    setOrden("reciente");
    setMarcaFiltro("todas");
    setPrecioMin("");
    setPrecioMax("");
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const min = precioMin === "" ? null : Number(precioMin);
    const max = precioMax === "" ? null : Number(precioMax);

    const lista = vehiculos.filter((v) => {
      if (filtro === "disponibles" && !v.disponible) return false;
      if (filtro === "no-disponibles" && v.disponible) return false;
      if (marcaFiltro !== "todas" && v.marca !== marcaFiltro) return false;
      if (min !== null && Number(v.precioDia) < min) return false;
      if (max !== null && Number(v.precioDia) > max) return false;
      if (!texto) return true;
      return `${v.marca} ${v.modelo} ${v.placa} ${v.color} ${v.anio}`
        .toLowerCase()
        .includes(texto);
    });

    return [...lista].sort((a, b) => {
      switch (orden) {
        case "precio-asc":
          return Number(a.precioDia) - Number(b.precioDia);
        case "precio-desc":
          return Number(b.precioDia) - Number(a.precioDia);
        case "anio-desc":
          return b.anio - a.anio;
        case "anio-asc":
          return a.anio - b.anio;
        case "marca-asc":
          return `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`);
        default:
          return b.id - a.id;
      }
    });
  }, [vehiculos, busqueda, filtro, orden, marcaFiltro, precioMin, precioMax]);

  const filtros: { id: Filtro; label: string; total: number }[] = [
    { id: "todos", label: "Todos", total: vehiculos.length },
    { id: "disponibles", label: "Disponibles", total: disponibles },
    { id: "no-disponibles", label: "No disponibles", total: vehiculos.length - disponibles },
  ];

  return (
    <main className="min-h-screen bg-gray-100">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <AdminPageHeader
          title="Vehículos"
          description="Administra el inventario, la disponibilidad y las fotografías de tu flota."
        >
            <Link
              href="/"
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Ver sitio
            </Link>
            <Link
              href="/admin/vehiculos/nuevo"
              className="rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-[#b81b26]"
            >
              Agregar vehículo
            </Link>
        </AdminPageHeader>
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 font-medium text-[#D4202C]">
            {error}
          </div>
        )}

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        {!cargando && vehiculos.length > 0 && (
          <div className="mb-8 space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            {/* Buscador + estado */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por marca, modelo o placa..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filtros.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    className={
                      filtro === f.id
                        ? "rounded-full bg-black px-4 py-2 text-sm font-bold text-white shadow"
                        : "rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
                    }
                  >
                    {f.label}
                    <span
                      className={
                        filtro === f.id
                          ? "ml-2 rounded-full bg-[#D4202C] px-2 py-0.5 text-xs"
                          : "ml-2 rounded-full bg-white px-2 py-0.5 text-xs"
                      }
                    >
                      {f.total}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ordenar, marca y precio */}
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-gray-500">
                  Ordenar por
                </span>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]"
                >
                  {OPCIONES_ORDEN.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-gray-500">
                  Marca
                </span>
                <select
                  value={marcaFiltro}
                  onChange={(e) => setMarcaFiltro(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]"
                >
                  <option value="todas">Todas las marcas</option>
                  {marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-gray-500">
                  Precio mínimo (USD$)
                </span>
                <input
                  type="number"
                  min={0}
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold text-gray-500">
                  Precio máximo (USD$)
                </span>
                <input
                  type="number"
                  min={0}
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]"
                />
              </label>

              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  disabled={!hayFiltrosActivos}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-[#D4202C] transition hover:bg-[#D4202C] hover:text-white disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Mostrando <strong>{filtrados.length}</strong> de {vehiculos.length} vehículos
            </p>
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </div>
        )}

        {/* SIN VEHÍCULOS */}
        {!cargando && vehiculos.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">🚘</div>
            <h2 className="mt-4 text-xl font-bold">No hay vehículos registrados</h2>
            <p className="mt-2 text-gray-500">Agrega tu primer vehículo para comenzar.</p>
            <Link
              href="/admin/vehiculos/nuevo"
              className="mt-6 inline-block rounded-lg bg-[#D4202C] px-5 py-3 font-bold text-white transition hover:bg-[#b81b26]"
            >
              Agregar vehículo
            </Link>
          </div>
        )}

        {/* SIN RESULTADOS */}
        {!cargando && vehiculos.length > 0 && filtrados.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">🔎</div>
            <h2 className="mt-4 text-lg font-bold">Sin resultados</h2>
            <p className="mt-1 text-gray-500">Prueba con otra búsqueda o filtro.</p>
            <button
              onClick={limpiarFiltros}
              className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#D4202C]"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* LISTA */}
        {!cargando && filtrados.length > 0 && (
          <div className="space-y-3">
            {filtrados.map((vehiculo) => (
              <article
                key={vehiculo.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
                  {vehiculo.imagen ? (
                    <img
                      src={vehiculo.imagen}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="h-16 w-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl">
                      🚘
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-base font-extrabold text-gray-900">
                        {vehiculo.marca} {vehiculo.modelo}
                      </h3>
                      <span className="text-xs font-semibold text-gray-500">
                        {vehiculo.anio}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          vehiculo.disponible
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {vehiculo.disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                      <span>
                        Placa:{" "}
                        <strong className="font-mono text-gray-800">
                          {vehiculo.placa || "Pendiente"}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gauge size={14} className="text-gray-400" />
                        {vehiculo.ultimoKilometraje == null
                          ? "Sin registro de km"
                          : `${FORMATO_NUMERO.format(vehiculo.ultimoKilometraje)} km`}
                      </span>
                      <span className="font-bold text-gray-900">
                        USD$ {Number(vehiculo.precioDia).toLocaleString("es-DO")}
                        <span className="ml-1 font-normal text-gray-500">/ día</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={vehiculo.disponible}
                      aria-label={`${
                        vehiculo.disponible ? "Ocultar" : "Mostrar"
                      } ${vehiculo.marca} ${vehiculo.modelo} ${
                        vehiculo.disponible
                          ? "(requiere confirmación)"
                          : "en el catálogo"
                      }`}
                      disabled={actualizandoDisponibilidad === vehiculo.id}
                      onClick={() => solicitarCambioDisponibilidad(vehiculo)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                        vehiculo.disponible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {vehiculo.disponible ? (
                        <Eye size={15} />
                      ) : (
                        <EyeOff size={15} />
                      )}
                      {actualizandoDisponibilidad === vehiculo.id
                        ? "Actualizando..."
                        : vehiculo.disponible
                          ? "Visible"
                          : "Oculto"}
                    </button>
                    <button
                      type="button"
                      aria-expanded={vehiculosExpandidos.has(vehiculo.id)}
                      aria-controls={`detalles-vehiculo-${vehiculo.id}`}
                      onClick={() => alternarDetallesVehiculo(vehiculo.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                      {vehiculosExpandidos.has(vehiculo.id) ? (
                        <>
                          <ChevronUp size={15} />
                          Menos
                        </>
                      ) : (
                        <>
                          <ChevronDown size={15} />
                          Más
                        </>
                      )}
                    </button>
                    <Link
                      href={`/admin/vehiculos/${vehiculo.id}/editar`}
                      aria-label={`Editar ${vehiculo.marca} ${vehiculo.modelo}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800"
                    >
                      <Pencil size={14} />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setVehiculoPendienteEliminar(vehiculo);
                        setPasswordEliminar("");
                        setErrorEliminar("");
                      }}
                      aria-label={`Eliminar ${vehiculo.marca} ${vehiculo.modelo}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-[#D4202C] transition hover:bg-[#D4202C] hover:text-white"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </div>
                </div>

                {vehiculosExpandidos.has(vehiculo.id) && (
                  <div
                    id={`detalles-vehiculo-${vehiculo.id}`}
                    className="grid gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 sm:grid-cols-3"
                  >
                    <p className="text-sm text-gray-600">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Color
                      </span>
                      <span className="mt-1 block font-semibold text-gray-800">
                        {vehiculo.color || "No especificado"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Seguro
                      </span>
                      <span className="mt-1 block font-semibold text-gray-800">
                        {vehiculo.tipoSeguro || "No especificado"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 sm:col-span-3">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Descripción
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap text-gray-700">
                        {vehiculo.descripcion || "Sin descripción"}
                      </span>
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {vehiculoPendienteDisponibilidad && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(evento) => {
            if (
              evento.target === evento.currentTarget &&
              actualizandoDisponibilidad === null
            ) {
              setVehiculoPendienteDisponibilidad(null);
              setErrorDisponibilidad("");
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-no-disponible-titulo"
            aria-describedby="confirmar-no-disponible-descripcion"
            className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle size={24} />
            </span>
            <h2
              id="confirmar-no-disponible-titulo"
              className="mt-5 text-2xl font-extrabold text-gray-950"
            >
              ¿Ocultar este vehículo?
            </h2>
            <p
              id="confirmar-no-disponible-descripcion"
              className="mt-2 text-sm leading-6 text-gray-600"
            >
              <span className="font-bold text-gray-900">
                {vehiculoPendienteDisponibilidad.marca}{" "}
                {vehiculoPendienteDisponibilidad.modelo}
              </span>{" "}
              dejará de aparecer como disponible en el catálogo público. Puedes
              volver a mostrarlo cuando quieras.
            </p>
            {errorDisponibilidad && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800"
              >
                {errorDisponibilidad}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actualizandoDisponibilidad !== null}
                onClick={() => {
                  setVehiculoPendienteDisponibilidad(null);
                  setErrorDisponibilidad("");
                }}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actualizandoDisponibilidad !== null}
                onClick={() =>
                  void cambiarDisponibilidad(
                    vehiculoPendienteDisponibilidad,
                    false
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-wait disabled:opacity-60"
              >
                <EyeOff size={16} />
                {actualizandoDisponibilidad !== null
                  ? "Actualizando..."
                  : "Sí, ocultar vehículo"}
              </button>
            </div>
          </section>
        </div>
      )}

      {vehiculoPendienteEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cancelarEliminacion();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmar-eliminacion-titulo"
            aria-describedby="confirmar-eliminacion-descripcion"
            className="my-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#D4202C]">
                <AlertTriangle size={24} />
              </span>
              <button
                type="button"
                aria-label="Cerrar confirmación"
                disabled={eliminando}
                onClick={cancelarEliminacion}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <h2
              id="confirmar-eliminacion-titulo"
              className="mt-5 text-2xl font-extrabold text-gray-950"
            >
              ¿Eliminar este vehículo?
            </h2>
            <p
              id="confirmar-eliminacion-descripcion"
              className="mt-2 text-sm leading-6 text-gray-600"
            >
              Estás a punto de eliminar{" "}
              <span className="font-bold text-gray-900">
                {vehiculoPendienteEliminar.marca} {vehiculoPendienteEliminar.modelo}
              </span>{" "}
              ({vehiculoPendienteEliminar.placa}). Esta acción no se puede
              deshacer. Para continuar, confirma tu contraseña de administrador.
            </p>

            <form onSubmit={eliminarVehiculo} className="mt-6">
              <label
                htmlFor="password-confirmacion-eliminar"
                className="text-sm font-semibold text-gray-700"
              >
                Contraseña de administrador
                <span className="relative mt-2 block">
                  <LockKeyhole
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="password-confirmacion-eliminar"
                    type="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    value={passwordEliminar}
                    onChange={(evento) => setPasswordEliminar(evento.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-sm font-normal text-gray-900 outline-none transition focus:border-[#D4202C] focus:ring-4 focus:ring-red-100"
                    placeholder="Ingresa tu contraseña"
                  />
                </span>
              </label>

              {errorEliminar && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
                  {errorEliminar}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={cancelarEliminacion}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={eliminando || !passwordEliminar}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AlertTriangle size={16} />
                  {eliminando ? "Eliminando..." : "Sí, eliminar vehículo"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}