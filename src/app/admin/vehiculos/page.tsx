"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    cargarVehiculos();
  }, []);

  async function cargarVehiculos() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch("/api/vehiculos");
      if (!respuesta.ok) throw new Error("No se pudieron cargar los vehículos");

      setVehiculos(await respuesta.json());
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al cargar los vehículos.");
    } finally {
      setCargando(false);
    }
  }

  async function eliminarVehiculo(id: number) {
    if (!window.confirm("¿Seguro que deseas eliminar este vehículo?")) return;

    try {
      const respuesta = await fetch(`/api/vehiculos/${id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error("No se pudo eliminar el vehículo");

      setVehiculos((actuales) => actuales.filter((v) => v.id !== id));
    } catch (error) {
      console.error(error);
      setError("No se pudo eliminar el vehículo.");
    }
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
      {/* ENCABEZADO */}
      <header className="border-b-4 border-[#D4202C] bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
              className="h-14 w-14 rounded-full ring-2 ring-[#D4202C]"
            />
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] text-gray-400">
                ADMINISTRACIÓN
              </p>
              <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                Vehículos
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
            >
              Ver sitio
            </Link>
            <Link
              href="/admin/vehiculos/nuevo"
              className="rounded-lg bg-[#D4202C] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#b81b26]"
            >
              + Nuevo vehículo
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[430px] animate-pulse rounded-2xl bg-gray-200" />
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((vehiculo) => (
              <article
                key={vehiculo.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#D4202C] hover:shadow-xl"
              >
                {/* IMAGEN */}
                <div className="relative overflow-hidden">
                  {vehiculo.imagen ? (
                    <img
                      src={vehiculo.imagen}
                      alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                      className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-gray-100 text-6xl">
                      🚘
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* ESTADO */}
                  <span
                    className={
                      vehiculo.disponible
                        ? "absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-green-700 shadow"
                        : "absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/85 px-3 py-1.5 text-xs font-bold text-white shadow"
                    }
                  >
                    <span
                      className={
                        vehiculo.disponible
                          ? "h-1.5 w-1.5 rounded-full bg-green-500"
                          : "h-1.5 w-1.5 rounded-full bg-[#D4202C]"
                      }
                    />
                    {vehiculo.disponible ? "Disponible" : "No disponible"}
                  </span>

                  {/* PRECIO */}
                  <div className="absolute bottom-0 right-0 rounded-tl-2xl bg-[#D4202C] px-4 py-2.5 text-white">
                    <p className="text-lg font-extrabold leading-none">
                      USD$ {Number(vehiculo.precioDia).toLocaleString("es-DO")}
                    </p>
                    <p className="mt-0.5 text-[10px] text-red-100">por día</p>
                  </div>
                </div>

                {/* INFORMACIÓN */}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-bold text-gray-400">{vehiculo.anio}</p>
                  <h3 className="mt-0.5 text-xl font-extrabold text-gray-900">
                    {vehiculo.marca} {vehiculo.modelo}
                  </h3>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-gray-50 p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Placa
                      </p>
                      <p className="mt-1 truncate font-mono text-xs font-bold">
                        {vehiculo.placa}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Color
                      </p>
                      <p className="mt-1 truncate text-xs font-bold">{vehiculo.color}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Seguro
                      </p>
                      <p className="mt-1 truncate text-xs font-bold">
                        {vehiculo.tipoSeguro}
                      </p>
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                    <Link
                      href={`/admin/vehiculos/${vehiculo.id}/editar`}
                      className="rounded-lg bg-black py-2.5 text-center text-sm font-bold text-white transition hover:bg-gray-800"
                    >
                      ✏️ Editar
                    </Link>
                    <button
                      onClick={() => eliminarVehiculo(vehiculo.id)}
                      className="rounded-lg border border-red-200 py-2.5 text-sm font-bold text-[#D4202C] transition hover:bg-[#D4202C] hover:text-white"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}