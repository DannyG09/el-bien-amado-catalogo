
"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CarFront,
  CheckCircle2,
  Eye,
  FileImage,
  Pencil,
  Search,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { subirMatriculaCloudinary } from "../../lib/uploadCloudinary";

const VEHICULOS_POR_PAGINA = 6;

type VehiculoMatricula = {
  vehiculoId: number;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  placa: string | null;
  imagen: string | null;
  matriculaId: number | null;
  tieneMatricula: boolean;
  fechaRegistro: string | null;
  fechaActualizacion: string | null;
};

type DocumentoVisualizado = {
  url: string;
  tipo: "imagen" | "pdf";
};

export default function MatriculasPage() {
  const [vehiculos, setVehiculos] = useState<
    VehiculoMatricula[]
  >([]);

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [seleccionado, setSeleccionado] =
    useState<VehiculoMatricula | null>(null);

  const [visualizando, setVisualizando] =
    useState<VehiculoMatricula | null>(null);

  const [documento, setDocumento] =
    useState<DocumentoVisualizado | null>(null);

  const [cargandoDocumento, setCargandoDocumento] =
    useState(false);

  const inputArchivo = useRef<HTMLInputElement>(null);

  // Obtener vehículos.
  const cargarVehiculos = useCallback(async () => {
    const respuesta = await fetch("/api/matriculas", {
      cache: "no-store",
    });

    if (!respuesta.ok) {
      throw new Error(
        "No se pudo consultar la lista de matrículas."
      );
    }

    const datos =
      (await respuesta.json()) as VehiculoMatricula[];

    setVehiculos(datos);
  }, []);

  useEffect(() => {
    async function iniciar() {
      try {
        await cargarVehiculos();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error."
        );
      } finally {
        setCargando(false);
      }
    }

    void iniciar();
  }, [cargarVehiculos]);

  // Buscar por marca, modelo, año, color o placa.
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return vehiculos.filter((vehiculo) =>
      [
        vehiculo.marca,
        vehiculo.modelo,
        vehiculo.anio,
        vehiculo.color,
        vehiculo.placa,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto)
    );
  }, [vehiculos, busqueda]);

  // Paginación.
  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / VEHICULOS_POR_PAGINA)
  );

  const paginaSegura = Math.min(
    paginaActual,
    totalPaginas
  );

  const vehiculosPaginados = filtrados.slice(
    (paginaSegura - 1) * VEHICULOS_POR_PAGINA,
    paginaSegura * VEHICULOS_POR_PAGINA
  );

  // Cambiar página y subir automáticamente.
  function cambiarPagina(nuevaPagina: number) {
    if (
      nuevaPagina < 1 ||
      nuevaPagina > totalPaginas ||
      nuevaPagina === paginaSegura
    ) {
      return;
    }

    setPaginaActual(nuevaPagina);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const registradas = vehiculos.filter(
    (vehiculo) => vehiculo.tieneMatricula
  ).length;

  function seleccionarArchivo(vehiculo: VehiculoMatricula) {
    if (guardando) return;

    setSeleccionado(vehiculo);
    setError("");
    setMensaje("");

    inputArchivo.current?.click();
  }

  // Subir imagen o PDF.
  async function procesarArchivo(
    evento: ChangeEvent<HTMLInputElement>
  ) {
    const archivo = evento.target.files?.[0];

    evento.target.value = "";

    if (!archivo || !seleccionado) return;

    const vehiculo = seleccionado;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await subirMatriculaCloudinary(
        archivo,
        vehiculo.vehiculoId
      );

      await cargarVehiculos();

      setMensaje(
        `Matrícula de ${vehiculo.marca} ${vehiculo.modelo} guardada correctamente.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la matrícula."
      );
    } finally {
      setGuardando(false);
      setSeleccionado(null);
    }
  }

  // Obtener documento privado.
  useEffect(() => {
    if (!visualizando) {
      setDocumento(null);
      setCargandoDocumento(false);
      return;
    }

    const controlador = new AbortController();
    let urlTemporal: string | null = null;

    async function obtenerDocumento() {
      setCargandoDocumento(true);
      setDocumento(null);
      setError("");

      try {
        const respuesta = await fetch(
          `/api/matriculas/${visualizando!.vehiculoId}/imagen`,
          {
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudo cargar el documento de matrícula."
          );
        }

        const archivo = await respuesta.blob();

        if (controlador.signal.aborted) return;

        const tipoMime = archivo.type
          .split(";")[0]
          .trim()
          .toLowerCase();

        const tipo =
          tipoMime === "application/pdf"
            ? "pdf"
            : tipoMime.startsWith("image/")
              ? "imagen"
              : null;

        if (!tipo) {
          throw new Error(
            "El formato del documento no es compatible."
          );
        }

        urlTemporal = URL.createObjectURL(archivo);

        setDocumento({
          url: urlTemporal,
          tipo,
        });
      } catch (err) {
        if (!controlador.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo visualizar la matrícula."
          );
        }
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoDocumento(false);
        }
      }
    }

    void obtenerDocumento();

    return () => {
      controlador.abort();

      if (urlTemporal) {
        URL.revokeObjectURL(urlTemporal);
      }
    };
  }, [visualizando]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#D4202C]"
        >
          <ArrowLeft size={18} />
          Volver al dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-950">
            Matrículas de vehículos
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Consulta y administra los documentos de la flota.
          </p>
        </div>

        {/* Contadores */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Resumen
            titulo="Total de vehículos"
            valor={vehiculos.length}
          />

          <Resumen
            titulo="Con matrícula"
            valor={registradas}
          />

          <Resumen
            titulo="Sin matrícula"
            valor={vehiculos.length - registradas}
          />
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
          >
            {mensaje}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* Selector de imágenes y PDF */}
        <input
          ref={inputArchivo}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          className="hidden"
          onChange={procesarArchivo}
          disabled={guardando}
          aria-label="Seleccionar matrícula en imagen o PDF"
        />

        {/* Listado */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-950">
              Lista de vehículos
            </h2>

            <div className="relative mt-4">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPaginaActual(1);
                }}
                placeholder="Buscar por marca, modelo, año, color o placa..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-[#D4202C]"
              />
            </div>
          </div>

          {cargando ? (
            <p className="p-6 text-sm text-gray-500">
              Cargando vehículos...
            </p>
          ) : filtrados.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              No se encontraron vehículos.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {vehiculosPaginados.map((vehiculo) => (
                <div
                  key={vehiculo.vehiculoId}
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  {/* Fotografía e información */}
                  <div className="flex min-w-0 items-center gap-4">
                    <FotoVehiculo vehiculo={vehiculo} />

                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-950">
                        {vehiculo.marca}{" "}
                        {vehiculo.modelo}{" "}
                        {vehiculo.anio}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Color: {vehiculo.color}
                      </p>

                      <p className="text-xs text-gray-400">
                        Placa: {vehiculo.placa || "Sin placa"}
                      </p>
                    </div>
                  </div>

                  {/* Estado y botones */}
                  <div className="flex flex-wrap items-center gap-3">
                    {vehiculo.tieneMatricula ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                        <CheckCircle2 size={14} />
                        Con matrícula
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                        Sin matrícula
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={
                        !vehiculo.tieneMatricula ||
                        guardando
                      }
                      onClick={() => {
                        setError("");
                        setVisualizando(vehiculo);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye size={17} />
                      Visualizar
                    </button>

                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() =>
                        seleccionarArchivo(vehiculo)
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {vehiculo.tieneMatricula ? (
                        <Pencil size={17} />
                      ) : (
                        <Upload size={17} />
                      )}

                      {guardando &&
                      seleccionado?.vehiculoId ===
                        vehiculo.vehiculoId
                        ? "Guardando..."
                        : vehiculo.tieneMatricula
                          ? "Modificar"
                          : "Agregar matrícula"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {!cargando && filtrados.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                Mostrando{" "}
                <span className="font-bold text-gray-900">
                  {(paginaSegura - 1) *
                    VEHICULOS_POR_PAGINA +
                    1}
                </span>
                {" - "}
                <span className="font-bold text-gray-900">
                  {Math.min(
                    paginaSegura * VEHICULOS_POR_PAGINA,
                    filtrados.length
                  )}
                </span>
                {" de "}
                <span className="font-bold text-gray-900">
                  {filtrados.length}
                </span>
                {" vehículos"}
              </p>

              {totalPaginas > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      cambiarPagina(paginaSegura - 1)
                    }
                    disabled={paginaSegura === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>

                  {Array.from(
                    { length: totalPaginas },
                    (_, index) => index + 1
                  ).map((numero) => (
                    <button
                      key={numero}
                      type="button"
                      onClick={() =>
                        cambiarPagina(numero)
                      }
                      aria-current={
                        paginaSegura === numero
                          ? "page"
                          : undefined
                      }
                      className={`h-9 w-9 rounded-lg text-sm font-bold transition ${
                        paginaSegura === numero
                          ? "bg-[#D4202C] text-white"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {numero}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      cambiarPagina(paginaSegura + 1)
                    }
                    disabled={
                      paginaSegura === totalPaginas
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Ventana de visualización */}
      {visualizando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setVisualizando(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-documento"
            className="flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="titulo-documento"
                  className="text-xl font-extrabold text-gray-950"
                >
                  Matrícula del vehículo
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {visualizando.marca}{" "}
                  {visualizando.modelo}{" "}
                  {visualizando.anio} ·{" "}
                  {visualizando.color}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVisualizando(null)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-xl bg-gray-100 p-3">
              {cargandoDocumento ? (
                <p className="text-sm text-gray-500">
                  Cargando matrícula...
                </p>
              ) : documento?.tipo === "pdf" ? (
                <iframe
                  src={documento.url}
                  title={`Matrícula PDF de ${visualizando.marca} ${visualizando.modelo}`}
                  className="h-[70vh] min-h-80 w-full rounded-lg border-0 bg-white"
                />
              ) : documento?.tipo === "imagen" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={documento.url}
                  alt={`Matrícula de ${visualizando.marca} ${visualizando.modelo}`}
                  className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <FileImage
                    size={40}
                    className="mx-auto mb-3"
                  />

                  <p className="text-sm">
                    No se pudo mostrar el documento.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

// Fotografía principal del vehículo.
function FotoVehiculo({
  vehiculo,
}: {
  vehiculo: VehiculoMatricula;
}) {
  const [falloImagen, setFalloImagen] = useState(false);

  useEffect(() => {
    setFalloImagen(false);
  }, [vehiculo.imagen]);

  return (
    <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 sm:h-24 sm:w-36">
      {vehiculo.imagen && !falloImagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={vehiculo.imagen}
          alt={`${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFalloImagen(true)}
        />
      ) : (
        <CarFront
          size={32}
          className="text-gray-400"
        />
      )}
    </div>
  );
}

// Tarjetas de resumen.
function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">
        {titulo}
      </p>

      <p className="mt-3 text-3xl font-extrabold text-gray-950">
        {valor}
      </p>
    </div>
  );
}
