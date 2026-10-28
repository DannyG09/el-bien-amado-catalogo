"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Gauge,
  LayoutGrid,
  List,
  LockKeyhole,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";
import type { EstadoVehiculo } from "../../types/vehiculo";

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
  estado: EstadoVehiculo;
  ultimoKilometraje: number | null;
};

type Filtro = "todos" | EstadoVehiculo;

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
const VEHICULOS_POR_PAGINA = 6;

const FORMATO_NUMERO = new Intl.NumberFormat("es-DO");

export default function VehiculosAdminPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [vista, setVista] = useState<"lista" | "tarjetas">("lista");
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
  const [actualizandoVehiculoId, setActualizandoVehiculoId] =
    useState<number | null>(null);
  const [kilometrajesEditados, setKilometrajesEditados] = useState<
    Record<number, string>
  >({});
  const [vehiculosExpandidos, setVehiculosExpandidos] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    let cancelado = false;

    async function cargarVehiculos() {
      try {
        const respuesta = await fetch("/api/vehiculos?administracion=true", {
          cache: "no-store",
        });
        if (!respuesta.ok) {
          throw new Error("No se pudieron cargar los vehículos.");
        }

        const datos = (await respuesta.json()) as Vehiculo[];
        if (!cancelado) {
          setVehiculos(datos);
          setKilometrajesEditados(
            Object.fromEntries(
              datos.map((vehiculo) => [
                vehiculo.id,
                vehiculo.ultimoKilometraje?.toString() ?? "",
              ])
            )
          );
        }
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

  async function actualizarVehiculo(
    vehiculo: Vehiculo,
    cambios: { estado?: EstadoVehiculo; kilometraje?: number }
  ) {
    if (actualizandoVehiculoId !== null) return;

    setActualizandoVehiculoId(vehiculo.id);
    setError("");
    try {
      const respuesta = await fetch(`/api/vehiculos/${vehiculo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        estado?: EstadoVehiculo;
        disponible?: boolean;
        ultimoKilometraje?: number | null;
      };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo actualizar el vehículo.");
      }

      setVehiculos((actuales) =>
        actuales.map((actual) =>
          actual.id === vehiculo.id
            ? {
                ...actual,
                estado: resultado.estado ?? actual.estado,
                disponible: resultado.disponible ?? actual.disponible,
                ultimoKilometraje:
                  resultado.ultimoKilometraje ?? actual.ultimoKilometraje,
              }
            : actual
        )
      );
      if (cambios.kilometraje !== undefined) {
        setKilometrajesEditados((actuales) => ({
          ...actuales,
          [vehiculo.id]: String(
            resultado.ultimoKilometraje ?? cambios.kilometraje
          ),
        }));
      }
    } catch (errorActualizacion) {
      console.error("Error al actualizar el vehículo:", errorActualizacion);
      setError(
        errorActualizacion instanceof Error
          ? errorActualizacion.message
          : "No se pudo actualizar el vehículo."
      );
    } finally {
      setActualizandoVehiculoId(null);
    }
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
    setPaginaActual(1);
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
      if (filtro !== "todos" && v.estado !== filtro) return false;
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

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / VEHICULOS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const vehiculosPaginados = filtrados.slice(
    (paginaSegura - 1) * VEHICULOS_POR_PAGINA,
    paginaSegura * VEHICULOS_POR_PAGINA
  );

  function cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > totalPaginas || pagina === paginaSegura) return;
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtros: { id: Filtro; label: string; total: number }[] = [
    { id: "todos", label: "Todos", total: vehiculos.length },
    {
      id: "disponible",
      label: "Disponibles",
      total: vehiculos.filter((v) => v.estado === "disponible").length,
    },
    {
      id: "rentado",
      label: "Rentados",
      total: vehiculos.filter((v) => v.estado === "rentado").length,
    },
    {
      id: "reservado",
      label: "Reservados",
      total: vehiculos.filter((v) => v.estado === "reservado").length,
    },
    {
      id: "mantenimiento",
      label: "En mantenimiento",
      total: vehiculos.filter((v) => v.estado === "mantenimiento").length,
    },
    {
      id: "pintura",
      label: "Taller de pintura",
      total: vehiculos.filter((v) => v.estado === "pintura").length,
    },
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
                  onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                  placeholder="Buscar por marca, modelo o placa..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filtros.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setFiltro(f.id); setPaginaActual(1); }}
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
                  onChange={(e) => { setOrden(e.target.value as Orden); setPaginaActual(1); }}
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
                  onChange={(e) => { setMarcaFiltro(e.target.value); setPaginaActual(1); }}
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
                  onChange={(e) => { setPrecioMin(e.target.value); setPaginaActual(1); }}
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
                  onChange={(e) => { setPrecioMax(e.target.value); setPaginaActual(1); }}
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

        {/* SELECTOR DE VISTA */}
        {!cargando && vehiculos.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-600">Vista de vehículos</p>
            <div role="group" aria-label="Modo de visualización" className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <button type="button" onClick={() => setVista("lista")} aria-pressed={vista === "lista"}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${vista === "lista" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                <List size={17} /> Lista
              </button>
              <button type="button" onClick={() => setVista("tarjetas")} aria-pressed={vista === "tarjetas"}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${vista === "tarjetas" ? "bg-[#D4202C] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                <LayoutGrid size={17} /> Tarjetas
              </button>
            </div>
          </div>
        )}

        {/* LISTA O TARJETAS */}
        {!cargando && filtrados.length > 0 && (
          <div className={vista === "tarjetas" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
            {vehiculosPaginados.map((vehiculo) => (
              <article
                key={vehiculo.id}
                className={`min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md ${vista === "tarjetas" ? "flex flex-col" : ""}`}
              >
                <div className={vista === "tarjetas" ? "flex flex-1 flex-col gap-4 p-4" : "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"}>
                  {vehiculo.imagen ? (
                    <img
                      src={vehiculo.imagen}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className={vista === "tarjetas" ? "h-44 w-full rounded-xl object-cover" : "h-16 w-20 shrink-0 rounded-xl object-cover"}
                    />
                  ) : (
                    <div className={vista === "tarjetas" ? "flex h-44 w-full items-center justify-center rounded-xl bg-gray-100 text-5xl" : "flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl"}>
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
                          vehiculo.estado === "disponible"
                            ? "bg-emerald-50 text-emerald-700"
                            : vehiculo.estado === "mantenimiento"
                              ? "bg-amber-50 text-amber-700"
                              : vehiculo.estado === "pintura"
                                ? "bg-purple-50 text-purple-700"
                                : vehiculo.estado === "reservado"
                                  ? "bg-indigo-50 text-indigo-700"
                                : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {vehiculo.estado === "disponible"
                          ? "Disponible"
                          : vehiculo.estado === "mantenimiento"
                            ? "En mantenimiento"
                            : vehiculo.estado === "pintura"
                              ? "Taller de pintura"
                              : vehiculo.estado === "reservado"
                                ? "Reservado por contrato"
                              : "Rentado"}
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

                  <div className={vista === "tarjetas" ? "mt-auto flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3" : "flex flex-wrap items-center gap-2 sm:justify-end"}>
                    <label className="sr-only" htmlFor={`estado-${vehiculo.id}`}>
                      Estado de {vehiculo.marca} {vehiculo.modelo}
                    </label>
                    <select
                      id={`estado-${vehiculo.id}`}
                      value={vehiculo.estado}
                      disabled={
                        actualizandoVehiculoId === vehiculo.id ||
                        vehiculo.estado === "reservado"
                      }
                      onChange={(evento) =>
                        void actualizarVehiculo(vehiculo, {
                          estado: evento.target.value as EstadoVehiculo,
                        })
                      }
                      title={
                        vehiculo.estado === "reservado"
                          ? "La reserva se administra desde el contrato."
                          : undefined
                      }
                      className="max-w-48 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#D4202C] disabled:opacity-60"
                    >
                      <option value="disponible">Disponible</option>
                      {vehiculo.estado === "reservado" && (
                        <option value="reservado" disabled>
                          Reservado por contrato
                        </option>
                      )}
                      <option value="rentado">Rentado</option>
                      <option value="mantenimiento">En mantenimiento</option>
                      <option value="pintura">Taller de pintura</option>
                    </select>
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
                    className={vista === "tarjetas" ? "grid gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4" : "grid gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"}
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
                    <div className="text-sm text-gray-600">
                      <label
                        htmlFor={`kilometraje-${vehiculo.id}`}
                        className="block text-[10px] font-bold uppercase tracking-wide text-gray-400"
                      >
                        Último kilometraje (km)
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id={`kilometraje-${vehiculo.id}`}
                          type="number"
                          min={0}
                          step={1}
                          value={kilometrajesEditados[vehiculo.id] ?? ""}
                          onChange={(evento) =>
                            setKilometrajesEditados((actuales) => ({
                              ...actuales,
                              [vehiculo.id]: evento.target.value,
                            }))
                          }
                          placeholder="Sin registro"
                          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D4202C]"
                        />
                        <button
                          type="button"
                          disabled={
                            actualizandoVehiculoId === vehiculo.id ||
                            kilometrajesEditados[vehiculo.id] === ""
                          }
                          onClick={() => {
                            const kilometraje = Number(
                              kilometrajesEditados[vehiculo.id]
                            );
                            if (
                              !Number.isSafeInteger(kilometraje) ||
                              kilometraje < 0
                            ) {
                              setError(
                                "El kilometraje debe ser un entero igual o mayor que cero."
                              );
                              return;
                            }
                            void actualizarVehiculo(vehiculo, { kilometraje });
                          }}
                          className="rounded-lg bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 sm:col-span-2 lg:col-span-4">
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

        {!cargando && filtrados.length > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <p className="text-sm text-gray-600">
              Mostrando <strong>{(paginaSegura - 1) * VEHICULOS_POR_PAGINA + 1}</strong>–<strong>{Math.min(paginaSegura * VEHICULOS_POR_PAGINA, filtrados.length)}</strong> de <strong>{filtrados.length}</strong> vehículos
            </p>
            {totalPaginas > 1 && (
              <nav aria-label="Paginación de vehículos" className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => cambiarPagina(paginaSegura - 1)} disabled={paginaSegura === 1} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft size={16} /> Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
                  <button key={numero} type="button" onClick={() => cambiarPagina(numero)} aria-current={paginaSegura === numero ? "page" : undefined} className={`h-10 w-10 rounded-lg text-sm font-bold transition ${paginaSegura === numero ? "bg-[#D4202C] text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>
                    {numero}
                  </button>
                ))}
                <button type="button" onClick={() => cambiarPagina(paginaSegura + 1)} disabled={paginaSegura === totalPaginas} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40">
                  Siguiente <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        )}
      </section>

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