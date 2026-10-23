"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ClipboardList,
  Download,
  Edit2,
  FileText,
  Gauge,
  LoaderCircle,
  Paperclip,
  Receipt,
  Wrench,
  X,
} from "lucide-react";
import { CATEGORIAS_MANTENIMIENTO } from "../../lib/mantenimientos";
import AdminPageHeader from "../AdminPageHeader";

type Vehiculo = {
  id: number;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
};

type Mantenimiento = {
  id: number;
  vehiculoId: number;
  vehiculo: string;
  placa: string;
  fecha: string;
  categoria: string;
  monto: number;
  kilometraje: number;
  descripcion: string | null;
  tieneFactura: boolean;
};

type Resumen = {
  gastoTotal: number;
  mantenimientoHistorico: number;
  proyeccionRecurrenteAnual: number;
  vehiculoMayorGasto: {
    vehiculo: string;
    placa: string;
    gastoTotal: number;
    mantenimientoHistorico: number;
    proyeccionRecurrenteAnual: number;
  } | null;
  vehiculoMayorKilometraje: {
    vehiculo: string;
    placa: string;
    kilometraje: number;
  } | null;
};

type RespuestaMantenimientos = {
  registros: Mantenimiento[];
  total: number;
  paginas: number;
  resumen: Resumen;
};

const FORMATO_DOP = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
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

function fechaLocalHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

async function obtenerVehiculos() {
  const respuesta = await fetch("/api/vehiculos?administracion=true", {
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new Error("No se pudieron cargar los vehículos.");
  }
  return (await respuesta.json()) as Vehiculo[];
}

async function obtenerDatosMantenimiento(
  pagina: number,
  vehiculoId: string,
  categoria: string
): Promise<RespuestaMantenimientos> {
  const parametros = new URLSearchParams({
    pagina: String(pagina),
    limite: "25",
    vehiculoId,
    categoria,
  });
  const respuesta = await fetch(`/api/mantenimientos?${parametros}`, {
    cache: "no-store",
  });

  if (!respuesta.ok) {
    const detalle = (await respuesta.json()) as {
      error?: string;
    };
    throw new Error(
      detalle.error ?? "No se pudieron cargar los mantenimientos."
    );
  }

  return (await respuesta.json()) as RespuestaMantenimientos;
}

export default function MantenimientoAdminPage() {
  const facturaInputRef = useRef<HTMLInputElement>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [registros, setRegistros] = useState<Mantenimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen>({
    gastoTotal: 0,
    mantenimientoHistorico: 0,
    proyeccionRecurrenteAnual: 0,
    vehiculoMayorGasto: null,
    vehiculoMayorKilometraje: null,
  });
  const [vehiculoId, setVehiculoId] = useState("");
  const [fecha, setFecha] = useState(fechaLocalHoy);
  const [categoria, setCategoria] = useState<string>(
    CATEGORIAS_MANTENIMIENTO[0]
  );
  const [monto, setMonto] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [factura, setFactura] = useState<File | null>(null);
  const [mesReporte, setMesReporte] = useState(() =>
    fechaLocalHoy().slice(0, 7)
  );
  const [descargandoReporte, setDescargandoReporte] = useState(false);
  const [filtroVehiculo, setFiltroVehiculo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mantenimientoEditando, setMantenimientoEditando] =
    useState<Mantenimiento | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos() {
    try {
      const datosMantenimiento = await obtenerDatosMantenimiento(
        pagina,
        filtroVehiculo,
        filtroCategoria
      );
      setRegistros(datosMantenimiento.registros);
      setResumen(datosMantenimiento.resumen);
      setTotalRegistros(datosMantenimiento.total);
      setTotalPaginas(datosMantenimiento.paginas);
    } catch (errorCarga) {
      console.error("Error al cargar el panel de mantenimiento:", errorCarga);
      setError(
        errorCarga instanceof Error
          ? errorCarga.message
          : "Ocurrió un error al cargar los mantenimientos."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let cancelado = false;

    obtenerVehiculos()
      .then((listaVehiculos) => {
        if (cancelado) return;
        setVehiculos(listaVehiculos);
      })
      .catch((errorCarga: unknown) => {
        if (cancelado) return;
        console.error("Error al cargar los vehículos:", errorCarga);
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "Ocurrió un error al cargar los vehículos."
        );
      });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    obtenerDatosMantenimiento(pagina, filtroVehiculo, filtroCategoria)
      .then((datos) => {
        if (cancelado) return;
        setRegistros(datos.registros);
        setResumen(datos.resumen);
        setTotalRegistros(datos.total);
        setTotalPaginas(datos.paginas);
      })
      .catch((errorCarga: unknown) => {
        if (cancelado) return;
        console.error("Error al cargar el historial de mantenimiento:", errorCarga);
        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "Ocurrió un error al cargar los mantenimientos."
        );
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [pagina, filtroVehiculo, filtroCategoria]);

  function cambiarFiltroVehiculo(valor: string) {
    setFiltroVehiculo(valor);
    setPagina(1);
    setCargando(true);
    setError("");
  }

  function cambiarFiltroCategoria(valor: string) {
    setFiltroCategoria(valor);
    setPagina(1);
    setCargando(true);
    setError("");
  }

  async function guardarMantenimiento(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    try {
      const formulario = new FormData();
      formulario.append(
        "datos",
        JSON.stringify({
          vehiculoId: Number(vehiculoId),
          fecha,
          categoria,
          monto: Number(monto),
          kilometraje: Number(kilometraje),
          descripcion,
        })
      );
      if (factura) formulario.append("factura", factura);

      const respuesta = await fetch("/api/mantenimientos", {
        method: "POST",
        body: formulario,
      });

      if (!respuesta.ok) {
        const detalle = (await respuesta.json()) as { error?: string };
        throw new Error(detalle.error ?? "No se pudo guardar el mantenimiento.");
      }

      setMonto("");
      setKilometraje("");
      setDescripcion("");
      setFactura(null);
      if (facturaInputRef.current) facturaInputRef.current.value = "";
      setMensaje("El mantenimiento se guardó correctamente.");
      setCargando(true);
      await cargarDatos();
    } catch (errorGuardado) {
      console.error("Error al registrar mantenimiento:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "Ocurrió un error al guardar el mantenimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function descargarReporteMensual() {
    if (!/^\d{4}-\d{2}$/.test(mesReporte)) {
      setError("Selecciona un mes válido para descargar el reporte.");
      return;
    }

    setError("");
    setDescargandoReporte(true);
    try {
      const respuesta = await fetch(
        `/api/mantenimientos/reporte?mes=${encodeURIComponent(mesReporte)}`,
        { cache: "no-store" }
      );
      if (!respuesta.ok) {
        const detalle = (await respuesta.json()) as { error?: string };
        throw new Error(
          detalle.error ?? "No se pudo generar el reporte mensual."
        );
      }

      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `gastos-${mesReporte}.pdf`;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (errorReporte) {
      console.error("Error al descargar el reporte mensual:", errorReporte);
      setError(
        errorReporte instanceof Error
          ? errorReporte.message
          : "No se pudo descargar el reporte mensual."
      );
    } finally {
      setDescargandoReporte(false);
    }
  }

  async function actualizarMantenimiento(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    if (!mantenimientoEditando) return;

    setError("");
    setMensaje("");
    setGuardandoEdicion(true);

    try {
      const respuesta = await fetch(
        `/api/mantenimientos/${mantenimientoEditando.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehiculoId: mantenimientoEditando.vehiculoId,
            fecha: mantenimientoEditando.fecha,
            categoria: mantenimientoEditando.categoria,
            monto: Number(mantenimientoEditando.monto),
            kilometraje: Number(mantenimientoEditando.kilometraje),
            descripcion: mantenimientoEditando.descripcion,
          }),
        }
      );

      if (!respuesta.ok) {
        const detalle = (await respuesta.json()) as { error?: string };
        throw new Error(
          detalle.error ?? "No se pudo actualizar el mantenimiento."
        );
      }

      setMantenimientoEditando(null);
      setMensaje("El mantenimiento se actualizó correctamente.");
      setCargando(true);
      await cargarDatos();
    } catch (errorActualizacion) {
      console.error("Error al actualizar mantenimiento:", errorActualizacion);
      setError(
        errorActualizacion instanceof Error
          ? errorActualizacion.message
          : "Ocurrió un error al actualizar el mantenimiento."
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }

  return (
    <main className="admin-page min-h-screen bg-gray-100">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Mantenimiento"
          description="Registra gastos, revisa el historial y da seguimiento al kilometraje de tu flota."
        />

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        )}
        {mensaje && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
          >
            {mensaje}
          </div>
        )}

        <section
          aria-label="Resumen de gastos y mantenimiento"
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#D4202C]">
                <Receipt size={20} />
              </span>
              <span className="text-sm font-semibold">
                Total con proyección anual
              </span>
            </div>
            <p className="mt-5 text-2xl font-extrabold text-gray-950">
              {FORMATO_DOP.format(resumen.gastoTotal)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Mantenimiento acumulado + recurrentes anualizados
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <Receipt size={20} />
              </span>
              <span className="text-sm font-semibold">
                Mantenimiento acumulado
              </span>
            </div>
            <p className="mt-5 text-2xl font-extrabold text-gray-950">
              {FORMATO_DOP.format(resumen.mantenimientoHistorico)}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Receipt size={20} />
              </span>
              <span className="text-sm font-semibold">
                Proyección recurrente anual
              </span>
            </div>
            <p className="mt-5 text-2xl font-extrabold text-gray-950">
              {FORMATO_DOP.format(resumen.proyeccionRecurrenteAnual)}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Wrench size={20} />
              </span>
              <span className="text-sm font-semibold">
                Mayor costo combinado
              </span>
            </div>
            {resumen.vehiculoMayorGasto ? (
              <>
                <p className="mt-5 font-bold text-gray-950">
                  {resumen.vehiculoMayorGasto.vehiculo}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {resumen.vehiculoMayorGasto.placa} ·{" "}
                  {FORMATO_DOP.format(resumen.vehiculoMayorGasto.gastoTotal)}
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm text-gray-400">
                Aún no hay gastos registrados.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Gauge size={20} />
              </span>
              <span className="text-sm font-semibold">Mayor última lectura</span>
            </div>
            {resumen.vehiculoMayorKilometraje ? (
              <>
                <p className="mt-5 font-bold text-gray-950">
                  {resumen.vehiculoMayorKilometraje.vehiculo}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {resumen.vehiculoMayorKilometraje.placa} ·{" "}
                  {FORMATO_NUMERO.format(
                    resumen.vehiculoMayorKilometraje.kilometraje
                  )}{" "}
                  km
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm text-gray-400">
                Aún no hay kilometrajes registrados.
              </p>
            )}
          </article>
        </section>

        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#D4202C]">
              <ClipboardList size={21} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-950">
                Registrar mantenimiento
              </h2>
              <p className="text-sm text-gray-500">
                Todos los montos se guardan en pesos dominicanos (DOP).
              </p>
            </div>
          </div>

          {vehiculos.length === 0 && !cargando ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              No hay vehículos disponibles para registrar un mantenimiento.
            </p>
          ) : (
            <form
              onSubmit={guardarMantenimiento}
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <label className="text-sm font-semibold text-gray-700">
                Vehículo
                <select
                  required
                  value={vehiculoId}
                  onChange={(evento) => setVehiculoId(evento.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                >
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) ·{" "}
                      {vehiculo.placa}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-gray-700">
                Categoría
                <select
                  value={categoria}
                  onChange={(evento) => setCategoria(evento.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                >
                  {CATEGORIAS_MANTENIMIENTO.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-gray-700">
                Fecha
                <input
                  required
                  type="date"
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </label>

              <label className="text-sm font-semibold text-gray-700">
                Monto (DOP)
                <input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  inputMode="decimal"
                  value={monto}
                  onChange={(evento) => setMonto(evento.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </label>

              <label className="text-sm font-semibold text-gray-700">
                Kilometraje actual
                <input
                  required
                  min="0"
                  step="1"
                  type="number"
                  inputMode="numeric"
                  value={kilometraje}
                  onChange={(evento) => setKilometraje(evento.target.value)}
                  placeholder="Ej. 45200"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </label>

              <label className="text-sm font-semibold text-gray-700 sm:col-span-2 xl:col-span-1">
                Descripción (opcional)
                <input
                  maxLength={500}
                  value={descripcion}
                  onChange={(evento) => setDescripcion(evento.target.value)}
                  placeholder="Detalles del servicio o gasto"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                />
              </label>

              <label className="text-sm font-semibold text-gray-700 sm:col-span-2 xl:col-span-2">
                Factura (opcional)
                <span className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
                  <Paperclip size={17} className="text-gray-500" />
                  <input
                    id="factura-mantenimiento"
                    ref={facturaInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(evento) => {
                      const archivo = evento.target.files?.[0] ?? null;
                      if (
                        archivo &&
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          archivo.type
                        )
                      ) {
                        setError("La factura debe ser JPG, PNG o WEBP.");
                        evento.target.value = "";
                        setFactura(null);
                        return;
                      }
                      if (archivo && archivo.size > 5 * 1024 * 1024) {
                        setError("La factura no puede superar los 5 MB.");
                        evento.target.value = "";
                        setFactura(null);
                        return;
                      }
                      setError("");
                      setFactura(archivo);
                    }}
                    className="min-w-0 flex-1 text-xs font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#D4202C]"
                  />
                  <span className="w-full text-xs font-normal text-gray-500">
                    Imagen JPG, PNG o WEBP, máximo 5 MB. Puedes dejarlo vacío.
                    {factura ? ` Seleccionada: ${factura.name}` : ""}
                  </span>
                </span>
              </label>

              <div className="flex items-end sm:col-span-2 xl:col-span-1">
                <button
                  type="submit"
                  disabled={guardando || cargando || vehiculos.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando && <LoaderCircle size={17} className="animate-spin" />}
                  {guardando ? "Guardando..." : "Guardar mantenimiento"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-gray-950">
                Historial de gastos
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                El resumen superior muestra los totales de toda la flota.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-xs font-semibold text-gray-500">
                Vehículo
                <select
                  value={filtroVehiculo}
                  onChange={(evento) =>
                    cambiarFiltroVehiculo(evento.target.value)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800"
                >
                  <option value="todos">Todos</option>
                  {vehiculos.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.marca} {vehiculo.modelo} · {vehiculo.placa}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Categoría
                <select
                  value={filtroCategoria}
                  onChange={(evento) =>
                    cambiarFiltroCategoria(evento.target.value)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800"
                >
                  <option value="todas">Todas</option>
                  {CATEGORIAS_MANTENIMIENTO.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
                <label
                  htmlFor="mes-reporte-gastos"
                  className="min-w-0 flex-1 text-xs font-semibold text-gray-500"
                >
                  Descargar PDF del mes
                  <input
                    id="mes-reporte-gastos"
                    type="month"
                    required
                    value={mesReporte}
                    onChange={(evento) => setMesReporte(evento.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-800"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void descargarReporteMensual()}
                  disabled={descargandoReporte || !mesReporte}
                  aria-label="Descargar reporte mensual en PDF"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#D4202C] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-wait disabled:opacity-60"
                >
                  {descargandoReporte ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  PDF
                </button>
              </div>
            </div>
          </div>

          {cargando ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Cargando mantenimientos...
            </p>
          ) : registros.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No hay registros que coincidan con los filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold">Vehículo</th>
                    <th className="px-5 py-3 font-semibold">Categoría</th>
                    <th className="px-5 py-3 font-semibold">Kilometraje</th>
                    <th className="px-5 py-3 font-semibold">Monto</th>
                    <th className="px-5 py-3 font-semibold">Descripción</th>
                    <th className="px-5 py-3 font-semibold">Factura</th>
                    <th className="px-5 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registros.map((registro) => (
                    <tr key={registro.id} className="text-gray-700">
                      <td className="whitespace-nowrap px-5 py-4">
                        {formatFecha(registro.fecha)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {registro.vehiculo}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {registro.placa}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {registro.categoria}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {FORMATO_NUMERO.format(registro.kilometraje)} km
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                        {FORMATO_DOP.format(registro.monto)}
                      </td>
                      <td className="max-w-xs px-5 py-4">
                        {registro.descripcion || "—"}
                      </td>
                      <td className="px-5 py-4">
                        {registro.tieneFactura ? (
                          <a
                            href={`/api/mantenimientos/${registro.id}/factura`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#D4202C]/30 hover:bg-red-50 hover:text-[#D4202C]"
                          >
                            <FileText size={14} />
                            Ver factura
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Sin factura</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setMantenimientoEditando(registro)}
                          aria-label={`Editar mantenimiento de ${registro.vehiculo}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#D4202C]/30 hover:bg-red-50 hover:text-[#D4202C]"
                        >
                          <Edit2 size={15} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!cargando && totalRegistros > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-gray-500">
                Mostrando{" "}
                <span className="font-semibold text-gray-800">
                  {(pagina - 1) * 25 + 1}–
                  {Math.min(pagina * 25, totalRegistros)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-800">
                  {totalRegistros}
                </span>{" "}
                registros
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => {
                    setCargando(true);
                    setPagina((actual) => actual - 1);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 text-gray-600">
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => {
                    setCargando(true);
                    setPagina((actual) => actual + 1);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

        {mantenimientoEditando && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
            onMouseDown={(evento) => {
              if (evento.target === evento.currentTarget && !guardandoEdicion) {
                setMantenimientoEditando(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="editar-mantenimiento-titulo"
              className="my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#D4202C]">
                    Historial de la flota
                  </p>
                  <h2
                    id="editar-mantenimiento-titulo"
                    className="mt-1 text-2xl font-extrabold text-gray-950"
                  >
                    Editar mantenimiento
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar edición"
                  disabled={guardandoEdicion}
                  onClick={() => setMantenimientoEditando(null)}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={actualizarMantenimiento}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label className="text-sm font-semibold text-gray-700">
                  Vehículo
                  <select
                    required
                    value={mantenimientoEditando.vehiculoId}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        vehiculoId: Number(evento.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  >
                    {vehiculos.map((vehiculo) => (
                      <option key={vehiculo.id} value={vehiculo.id}>
                        {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio}) ·{" "}
                        {vehiculo.placa}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Categoría
                  <select
                    value={mantenimientoEditando.categoria}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        categoria: evento.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  >
                    {CATEGORIAS_MANTENIMIENTO.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Fecha
                  <input
                    required
                    type="date"
                    value={mantenimientoEditando.fecha}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        fecha: evento.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  />
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Monto (DOP)
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    inputMode="decimal"
                    value={mantenimientoEditando.monto}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        monto: Number(evento.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  />
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Kilometraje actual
                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    inputMode="numeric"
                    value={mantenimientoEditando.kilometraje}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        kilometraje: Number(evento.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  />
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Descripción (opcional)
                  <input
                    maxLength={500}
                    value={mantenimientoEditando.descripcion ?? ""}
                    onChange={(evento) =>
                      setMantenimientoEditando({
                        ...mantenimientoEditando,
                        descripcion: evento.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20"
                  />
                </label>

                <div className="mt-2 flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={guardandoEdicion}
                    onClick={() => setMantenimientoEditando(null)}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoEdicion}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b81b26] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardandoEdicion && (
                      <LoaderCircle size={17} className="animate-spin" />
                    )}
                    {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
