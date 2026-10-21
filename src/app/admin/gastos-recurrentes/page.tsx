"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CarFront,
  CircleDollarSign,
  Download,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";
import {
  calcularDiasVigencia,
  CATEGORIAS_GASTO,
  ETIQUETAS_CATEGORIA_GASTO,
  FRECUENCIAS_GASTO,
  type GastoRecurrente,
} from "../../lib/gastos-recurrentes";

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  placa: string;
};

type GastoConVehiculo = GastoRecurrente & {
  vehiculo: string;
  placa: string;
};

type DatosFormulario = {
  vehiculoId: string;
  nombre: string;
  categoria: (typeof CATEGORIAS_GASTO)[number];
  frecuencia: (typeof FRECUENCIAS_GASTO)[number];
  fechaInicio: string;
  monto: string;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

function fechaLocalHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function fechaLegible(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function calcularProyeccionAnual(gasto: GastoRecurrente) {
  return gasto.monto * (gasto.frecuencia === "mensual" ? 12 : 1);
}

function etiquetaVigencia(dias: number) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

function formularioVacio(vehiculoId = ""): DatosFormulario {
  return {
    vehiculoId,
    nombre: "",
    categoria: "otro",
    frecuencia: "anual",
    fechaInicio: fechaLocalHoy(),
    monto: "",
  };
}

export default function GastosRecurrentesPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [gastos, setGastos] = useState<GastoConVehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [gastoEditando, setGastoEditando] = useState<number | null>(null);
  const [datos, setDatos] = useState<DatosFormulario>(() => formularioVacio());
  const [busqueda, setBusqueda] = useState("");
  const [filtroVehiculo, setFiltroVehiculo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroVencimiento, setFiltroVencimiento] = useState("todos");
  const [anioReporte, setAnioReporte] = useState(() =>
    String(new Date().getFullYear())
  );
  const [actualizacion, setActualizacion] = useState(0);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      try {
        const respuesta = await fetch("/api/gastos-recurrentes", {
          cache: "no-store",
        });
        const resultado = (await respuesta.json()) as {
          error?: string;
          vehiculos?: Vehiculo[];
          gastos?: GastoConVehiculo[];
        };
        if (!respuesta.ok) {
          throw new Error(
            resultado.error ?? "No se pudieron cargar los gastos recurrentes."
          );
        }
        if (cancelado) return;
        const listaVehiculos = resultado.vehiculos ?? [];
        setVehiculos(listaVehiculos);
        setGastos(resultado.gastos ?? []);
        setDatos((actual) =>
          actual.vehiculoId || listaVehiculos.length === 0
            ? actual
            : { ...actual, vehiculoId: String(listaVehiculos[0].id) }
        );
        setError("");
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los gastos recurrentes."
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
  }, [actualizacion]);

  const proyeccionTotal = useMemo(
    () => gastos.reduce((total, gasto) => total + calcularProyeccionAnual(gasto), 0),
    [gastos]
  );
  const gastosProximos = useMemo(
    () =>
      gastos.filter((gasto) => {
        const dias = calcularDiasVigencia(gasto.fechaProxima);
        return dias >= 0 && dias <= 30;
      }).length,
    [gastos]
  );
  const vehiculosConGastos = useMemo(
    () => new Set(gastos.map((gasto) => gasto.vehiculoId)).size,
    [gastos]
  );

  const gastosFiltrados = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    return gastos
      .filter((gasto) => {
        const coincideBusqueda =
          !consulta ||
          `${gasto.nombre} ${gasto.vehiculo} ${gasto.placa}`
            .toLocaleLowerCase("es")
            .includes(consulta);
        const coincideVehiculo =
          filtroVehiculo === "todos" ||
          String(gasto.vehiculoId) === filtroVehiculo;
        const coincideCategoria =
          filtroCategoria === "todas" || gasto.categoria === filtroCategoria;
        const dias = calcularDiasVigencia(gasto.fechaProxima);
        const coincideVencimiento =
          filtroVencimiento === "todos" ||
          (filtroVencimiento === "proximos" && dias >= 0 && dias <= 30) ||
          (filtroVencimiento === "vigentes" && dias > 30);
        return (
          coincideBusqueda &&
          coincideVehiculo &&
          coincideCategoria &&
          coincideVencimiento
        );
      })
      .sort((a, b) => a.fechaProxima.localeCompare(b.fechaProxima));
  }, [busqueda, filtroCategoria, filtroVehiculo, filtroVencimiento, gastos]);

  function abrirNuevoFormulario() {
    setGastoEditando(null);
    const vehiculoSeleccionado =
      filtroVehiculo !== "todos" &&
      vehiculos.some((vehiculo) => String(vehiculo.id) === filtroVehiculo)
        ? filtroVehiculo
        : vehiculos[0]
          ? String(vehiculos[0].id)
          : "";
    setDatos(formularioVacio(vehiculoSeleccionado));
    setFormularioAbierto(true);
    setError("");
    setMensaje("");
  }

  function editarGasto(gasto: GastoConVehiculo) {
    setGastoEditando(gasto.id);
    setDatos({
      vehiculoId: String(gasto.vehiculoId),
      nombre: gasto.nombre,
      categoria: gasto.categoria,
      frecuencia: gasto.frecuencia,
      fechaInicio: gasto.fechaInicio,
      monto: String(gasto.monto),
    });
    setFormularioAbierto(true);
    setError("");
    setMensaje("");
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setGastoEditando(null);
    setDatos(formularioVacio(vehiculos[0] ? String(vehiculos[0].id) : ""));
  }

  async function guardarGasto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const editando = gastoEditando !== null;
      const gastoActual = gastos.find((gasto) => gasto.id === gastoEditando);
      const ruta = editando && gastoActual
        ? `/api/vehiculos/${gastoActual.vehiculoId}/gastos-recurrentes/${gastoActual.id}`
        : "/api/gastos-recurrentes";
      const respuesta = await fetch(ruta, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiculoId: Number(datos.vehiculoId),
          nombre: datos.nombre,
          categoria: datos.categoria,
          frecuencia: datos.frecuencia,
          fechaInicio: datos.fechaInicio,
          monto: Number(datos.monto),
        }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo guardar el gasto.");
      }
      cerrarFormulario();
      setMensaje(editando ? "Gasto recurrente actualizado." : "Gasto recurrente registrado.");
      setActualizacion((valor) => valor + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarGasto(gasto: GastoConVehiculo) {
    if (
      !window.confirm(
        `¿Eliminar "${gasto.nombre}" de ${gasto.vehiculo}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/vehiculos/${gasto.vehiculoId}/gastos-recurrentes/${gasto.id}`,
        { method: "DELETE" }
      );
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo eliminar el gasto.");
      }
      setMensaje("Gasto recurrente eliminado.");
      setActualizacion((valor) => valor + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el gasto.");
    }
  }

  async function descargarReporte() {
    if (descargando) return;
    setDescargando(true);
    setError("");
    try {
      const respuesta = await fetch(
        `/api/gastos-recurrentes/reporte?anio=${encodeURIComponent(anioReporte)}`,
        { cache: "no-store" }
      );
      if (!respuesta.ok) {
        const resultado = (await respuesta.json()) as { error?: string };
        throw new Error(resultado.error ?? "No se pudo generar el PDF.");
      }
      const archivo = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = archivo;
      enlace.download = `gastos-recurrentes-${anioReporte}.pdf`;
      enlace.click();
      window.setTimeout(() => URL.revokeObjectURL(archivo), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el PDF.");
    } finally {
      setDescargando(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#D4202C] focus:ring-4 focus:ring-red-100 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white dark:focus:ring-red-950";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <AdminPageHeader
        eyebrow="Control de flota · Costos planificados"
        title="Gastos recurrentes"
        description="Organiza seguros, marbetes, GPS y otros costos por vehículo. Consulta su vigencia y la proyección anual de la flota."
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-300">
            Año del reporte
            <input
              type="number"
              min="1900"
              max="9999"
              value={anioReporte}
              onChange={(evento) => setAnioReporte(evento.target.value)}
              className="mt-1 block w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => void descargarReporte()}
            disabled={descargando || !anioReporte}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white dark:hover:bg-gray-800"
          >
            {descargando ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Download size={17} />
            )}
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={abrirNuevoFormulario}
            disabled={vehiculos.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Nuevo gasto
          </button>
        </div>
      </AdminPageHeader>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}
      {mensaje && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {mensaje}
        </div>
      )}

      <section
        aria-label="Resumen de gastos recurrentes"
        className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Proyección anual</p>
            <span className="rounded-xl bg-red-50 p-2.5 text-[#D4202C] dark:bg-red-950/40">
              <CircleDollarSign size={20} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">
            {FORMATO_DOP.format(proyeccionTotal)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Importe programado, no necesariamente pagado</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gastos registrados</p>
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <WalletCards size={20} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">{gastos.length}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">En toda la flota</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehículos vinculados</p>
            <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
              <CarFront size={20} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">{vehiculosConGastos}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Con al menos un gasto programado</p>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-[#202629]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Próximos a vencer</p>
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <CalendarClock size={20} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">{gastosProximos}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dentro de los próximos 30 días</p>
        </article>
      </section>

      {formularioAbierto && (
        <section className="mb-6 rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-red-950 dark:bg-[#202629] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D4202C]">
                {gastoEditando === null ? "Nuevo registro" : "Editar registro"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                {gastoEditando === null ? "Programar un gasto" : "Actualizar gasto recurrente"}
              </h2>
            </div>
            <button
              type="button"
              onClick={cerrarFormulario}
              aria-label="Cerrar formulario"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={guardarGasto} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Vehículo
              <select
                required
                value={datos.vehiculoId}
                disabled={gastoEditando !== null}
                onChange={(evento) => setDatos({ ...datos, vehiculoId: evento.target.value })}
                className={inputClass}
              >
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.marca} {vehiculo.modelo}
                    {vehiculo.placa ? ` · ${vehiculo.placa}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Nombre del gasto
              <input
                required
                maxLength={120}
                value={datos.nombre}
                onChange={(evento) => setDatos({ ...datos, nombre: evento.target.value })}
                placeholder="Ej. Seguro anual"
                className={inputClass}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Tipo
              <select
                value={datos.categoria}
                onChange={(evento) =>
                  setDatos({
                    ...datos,
                    categoria: evento.target.value as DatosFormulario["categoria"],
                  })
                }
                className={inputClass}
              >
                {CATEGORIAS_GASTO.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {ETIQUETAS_CATEGORIA_GASTO[categoria]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Frecuencia
              <select
                value={datos.frecuencia}
                onChange={(evento) =>
                  setDatos({
                    ...datos,
                    frecuencia: evento.target.value as DatosFormulario["frecuencia"],
                  })
                }
                className={inputClass}
              >
                <option value="anual">Cada año</option>
                <option value="mensual">Cada mes</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Fecha de inicio / instalación
              <input
                required
                type="date"
                value={datos.fechaInicio}
                onChange={(evento) => setDatos({ ...datos, fechaInicio: evento.target.value })}
                className={inputClass}
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Monto (DOP)
              <input
                required
                min="0.01"
                max="9999999999.99"
                step="0.01"
                type="number"
                inputMode="decimal"
                value={datos.monto}
                onChange={(evento) => setDatos({ ...datos, monto: evento.target.value })}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={guardando || vehiculos.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:opacity-60"
              >
                {guardando && <LoaderCircle size={16} className="animate-spin" />}
                {guardando ? "Guardando..." : gastoEditando === null ? "Guardar gasto" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1b2023] dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-[#202629]">
        <div className="border-b border-gray-100 p-5 dark:border-gray-700 sm:p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">Gastos de la flota</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Los importes mensuales se anualizan para la proyección. Los gastos previstos no representan pagos realizados.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {gastosFiltrados.length} de {gastos.length} registros
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <span className="sr-only">Buscar gastos</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar gasto o vehículo"
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-[#D4202C] dark:border-gray-700 dark:bg-[#1b2023] dark:text-white"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por vehículo</span>
              <select
                value={filtroVehiculo}
                onChange={(evento) => setFiltroVehiculo(evento.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white"
              >
                <option value="todos">Todos los vehículos</option>
                {vehiculos.map((vehiculo) => (
                  <option key={vehiculo.id} value={vehiculo.id}>
                    {vehiculo.marca} {vehiculo.modelo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por tipo de gasto</span>
              <select
                value={filtroCategoria}
                onChange={(evento) => setFiltroCategoria(evento.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white"
              >
                <option value="todas">Todos los tipos</option>
                {CATEGORIAS_GASTO.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {ETIQUETAS_CATEGORIA_GASTO[categoria]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar por vigencia</span>
              <select
                value={filtroVencimiento}
                onChange={(evento) => setFiltroVencimiento(evento.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-[#1b2023] dark:text-white"
              >
                <option value="todos">Todas las vigencias</option>
                <option value="proximos">Vencen en 30 días</option>
                <option value="vigentes">Más de 30 días</option>
              </select>
            </label>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-3 p-14 text-sm font-medium text-gray-500 dark:text-gray-400">
            <LoaderCircle size={19} className="animate-spin text-[#D4202C]" />
            Cargando gastos recurrentes...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
              <FileText size={24} />
            </span>
            <h3 className="mt-4 font-bold text-gray-900 dark:text-white">
              {gastos.length === 0 ? "Aún no hay gastos recurrentes" : "No hay resultados"}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {gastos.length === 0
                ? "Registra el seguro, marbete, GPS u otro gasto para comenzar a organizar la proyección de tu flota."
                : "Prueba con otros filtros o términos de búsqueda."}
            </p>
            {gastos.length === 0 && vehiculos.length > 0 && (
              <button
                type="button"
                onClick={abrirNuevoFormulario}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#b81b26]"
              >
                <Plus size={17} />
                Registrar primer gasto
              </button>
            )}
            {vehiculos.length === 0 && (
              <p className="mt-5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                Primero registra al menos un vehículo en el catálogo.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {gastosFiltrados.map((gasto) => {
              const dias = calcularDiasVigencia(gasto.fechaProxima);
              const urgente = dias <= 30;
              return (
                <article
                  key={gasto.id}
                  className="grid gap-4 p-5 transition hover:bg-gray-50/70 dark:hover:bg-white/[0.025] sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(130px,0.7fr)_minmax(150px,0.8fr)_minmax(145px,0.8fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-gray-950 dark:text-white">{gasto.nombre}</h3>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {ETIQUETAS_CATEGORIA_GASTO[gasto.categoria]}
                      </span>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <CarFront size={15} className="shrink-0" />
                      <span className="truncate">
                        {gasto.vehiculo}{gasto.placa ? ` · ${gasto.placa}` : ""}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Frecuencia</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {gasto.frecuencia === "mensual" ? "Mensual" : "Anual"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Desde {fechaLegible(gasto.fechaInicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Monto</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{FORMATO_DOP.format(gasto.monto)}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {FORMATO_DOP.format(calcularProyeccionAnual(gasto))} / año
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Próxima vigencia</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{fechaLegible(gasto.fechaProxima)}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        urgente
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                      }`}
                    >
                      {etiquetaVigencia(dias)}
                    </span>
                  </div>
                  <div className="flex gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => editarGasto(gasto)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void eliminarGasto(gasto)}
                      aria-label={`Eliminar ${gasto.nombre}`}
                      className="inline-flex items-center justify-center rounded-lg border border-red-100 px-3 py-2 text-red-700 transition hover:bg-red-50 dark:border-red-950 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
        La proyección anual multiplica los cargos mensuales por 12. La fecha de vigencia se calcula desde la fecha de inicio y la periodicidad registrada.
      </p>
    </main>
  );
}
