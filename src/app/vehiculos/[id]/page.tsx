"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  CalendarDays,
  Palette,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { Vehiculo as VehiculoCompleto } from "../../types/vehiculo";

type Vehiculo = Omit<VehiculoCompleto, "placa">;

type Foto = {
  id: number;
  url: string;
  public_id: string;
  orden: number;
};

const WHATSAPP_NUMERO = "18299212615";
const CLASE_CAMPO =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20";

function esRegistro(datos: unknown): datos is Record<string, unknown> {
  return typeof datos === "object" && datos !== null && !Array.isArray(datos);
}

function normalizarVehiculo(datos: unknown): Vehiculo {
  if (!esRegistro(datos)) {
    throw new Error("La respuesta contiene un vehículo con formato inválido.");
  }

  const id = Number(datos.id);
  if (!Number.isFinite(id)) {
    throw new Error("La respuesta contiene un vehículo sin identificador válido.");
  }

  const tipoSeguro = datos.tipoSeguro ?? datos.tiposeguro;
  const precioDia = datos.precioDia ?? datos.preciodia;

  return {
    id,
    marca: typeof datos.marca === "string" ? datos.marca : "",
    modelo: typeof datos.modelo === "string" ? datos.modelo : "",
    anio: Number(datos.anio),
    color: typeof datos.color === "string" ? datos.color : "",
    tipoSeguro:
      typeof tipoSeguro === "string" ? tipoSeguro : "No especificado",
    precioDia: Number(precioDia ?? 0),
    imagen: typeof datos.imagen === "string" ? datos.imagen : null,
    descripcion:
      typeof datos.descripcion === "string" ? datos.descripcion : null,
    disponible:
      datos.disponible === true ||
      datos.disponible === 1 ||
      datos.disponible === "true",
  };
}

function normalizarFoto(datos: unknown): Foto | null {
  if (!esRegistro(datos) || typeof datos.url !== "string" || !datos.url) {
    return null;
  }

  return {
    id: Number(datos.id),
    url: datos.url,
    public_id: typeof datos.public_id === "string" ? datos.public_id : "",
    orden: Number(datos.orden ?? 0),
  };
}

function obtenerCaracteristicas(
  descripcion: string | null
): string[] {
  if (!descripcion) return [];

  return descripcion
    .split(/[,;\n]+/)
    .map((caracteristica) => caracteristica.trim())
    .filter((caracteristica) => caracteristica.length > 0);
}

export default function DetalleVehiculoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotoSeleccionada, setFotoSeleccionada] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [errorFechas, setErrorFechas] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelado = false;

    async function cargarDetalle() {
      try {
        setCargando(true);
        setError("");

        const respuestaVehiculos = await fetch("/api/vehiculos");

        if (!respuestaVehiculos.ok) {
          throw new Error("No se pudieron cargar los vehículos.");
        }

        const respuestaLista: unknown = await respuestaVehiculos.json();

        if (!Array.isArray(respuestaLista)) {
          throw new Error("La respuesta de vehículos tiene un formato inválido.");
        }

        const encontrado = respuestaLista.find(
          (item: unknown) =>
            esRegistro(item) && String(item.id) === String(id)
        );

        if (!encontrado) {
          throw new Error("No encontramos este vehículo.");
        }

        const normalizado = normalizarVehiculo(encontrado);

        if (cancelado) return;

        setVehiculo(normalizado);

        const respuestaFotos = await fetch(
          `/api/vehiculo-fotos?vehiculoId=${encodeURIComponent(id)}`
        );

        let fotosAdicionales: Foto[] = [];

        if (respuestaFotos.ok) {
          const resultadoFotos: unknown = await respuestaFotos.json();

          if (Array.isArray(resultadoFotos)) {
            fotosAdicionales = resultadoFotos
              .map(normalizarFoto)
              .filter((foto): foto is Foto => foto !== null);
          }
        }

        const todasLasFotos = [...fotosAdicionales];

        if (
          normalizado.imagen &&
          !todasLasFotos.some(
            (foto) => foto.url === normalizado.imagen
          )
        ) {
          todasLasFotos.unshift({
            id: -normalizado.id,
            url: normalizado.imagen,
            public_id: "",
            orden: -1,
          });
        }

        if (cancelado) return;

        setFotos(todasLasFotos);
        setFotoSeleccionada(0);
      } catch (e) {
        if (!cancelado) {
          setError(
            e instanceof Error
              ? e.message
              : "Ocurrió un error al cargar el vehículo."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarDetalle();

    return () => {
      cancelado = true;
    };
  }, [id]);

  function cambiarFoto(direccion: number) {
    if (fotos.length < 2) return;

    setFotoSeleccionada((actual) => {
      return (actual + direccion + fotos.length) % fotos.length;
    });
  }

  // Teclado: Escape cierra y las flechas cambian de foto.
  useEffect(() => {
    if (!visorAbierto) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setVisorAbierto(false);
      }

      if (evento.key === "ArrowRight") {
        cambiarFoto(1);
      }

      if (evento.key === "ArrowLeft") {
        cambiarFoto(-1);
      }
    }

    document.addEventListener("keydown", manejarTeclado);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", manejarTeclado);
      document.body.style.overflow = "";
    };
  }, [visorAbierto, fotos.length]);

  const fechaMinima = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 10);

  function solicitarPorWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehiculo || !vehiculo.disponible) return;

    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
      setErrorFechas("La fecha de devolución debe ser posterior a la recogida.");
      return;
    }

    const formatoFecha = (fecha: string) =>
      new Date(`${fecha}T12:00:00`).toLocaleDateString("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const mensaje = [
      `Hola, quiero solicitar disponibilidad para el ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}.`,
      `Fecha de recogida: ${formatoFecha(fechaInicio)}.`,
      `Fecha de devolución: ${formatoFecha(fechaFin)}.`,
      `Precio publicado: USD$ ${vehiculo.precioDia.toLocaleString("es-DO")} por día.`,
      "Por favor, confirmen disponibilidad y requisitos. Entiendo que esta solicitud no confirma la reserva.",
    ].join(" ");

    window.open(
      `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <Car
            size={42}
            className="mx-auto animate-pulse text-[#D4202C]"
          />

          <p className="mt-4 font-semibold text-gray-600">
            Cargando información del vehículo...
          </p>
        </div>
      </main>
    );
  }

  if (error || !vehiculo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <Car size={45} className="mx-auto text-gray-300" />

          <h1 className="mt-4 text-2xl font-extrabold">
            Vehículo no encontrado
          </h1>

          <p className="mt-3 text-gray-500">
            {error || "No pudimos encontrar la información solicitada."}
          </p>

          <a
            href="/#vehiculos"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#D4202C] px-5 py-3 font-bold text-white transition hover:bg-black"
          >
            <ArrowLeft size={18} />
            Volver al catálogo
          </a>
        </div>
      </main>
    );
  }

  const fotoActual = fotos[fotoSeleccionada];

  const caracteristicas = obtenerCaracteristicas(
    vehiculo.descripcion
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* ENCABEZADO */}
      <header className="border-b bg-black text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
              className="h-12 w-12 rounded-full ring-2 ring-[#D4202C]"
            />

            <div>
              <p className="font-extrabold">
                El Bien <span className="text-[#D4202C]">Amado</span>
              </p>

              <p className="text-[10px] tracking-[0.25em] text-gray-400">
                RENT A CAR
              </p>
            </div>
          </a>

          <a
            href="/#vehiculos"
            className="flex items-center gap-2 text-sm font-semibold text-gray-300 transition hover:text-white"
          >
            <ArrowLeft size={17} />

            <span className="hidden sm:inline">
              Volver al catálogo
            </span>

            <span className="sm:hidden">Volver</span>
          </a>
        </div>
      </header>

      {/* DETALLE DEL VEHÍCULO */}
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-wider text-[#D4202C]">
            Nuestra flota
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {vehiculo.marca} {vehiculo.modelo}
          </h1>

          <p className="mt-2 text-gray-500">
            Año {vehiculo.anio} · {vehiculo.color}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          {/* GALERÍA */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gray-100 sm:aspect-[16/10]">
              {fotoActual ? (
                <button
                  type="button"
                  onClick={() => setVisorAbierto(true)}
                  aria-label="Ampliar fotografía"
                  className="h-full w-full cursor-zoom-in"
                >
                  <img
                    src={fotoActual.url}
                    alt={`${vehiculo.marca} ${vehiculo.modelo} - fotografía ${fotoSeleccionada + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ) : (
                <div className="text-center text-gray-400">
                  <Car
                    size={75}
                    strokeWidth={1}
                    className="mx-auto"
                  />

                  <p className="mt-3">
                    No hay fotografías disponibles
                  </p>
                </div>
              )}

              {fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => cambiarFoto(-1)}
                    aria-label="Fotografía anterior"
                    className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-[#D4202C]"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarFoto(1)}
                    aria-label="Fotografía siguiente"
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-[#D4202C]"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">
                    {fotoSeleccionada + 1} / {fotos.length}
                  </span>
                </>
              )}
            </div>

            {/* MINIATURAS */}
            {fotos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto border-t p-3 sm:p-4">
                {fotos.map((foto, indice) => (
                  <button
                    type="button"
                    key={`${foto.id}-${foto.url}`}
                    onClick={() => setFotoSeleccionada(indice)}
                    aria-label={`Ver fotografía ${indice + 1}`}
                    aria-pressed={fotoSeleccionada === indice}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-24 sm:w-28 ${
                      fotoSeleccionada === indice
                        ? "border-[#D4202C]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={foto.url}
                      alt={`Miniatura ${indice + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-gray-500">
              <Images size={17} />

              {fotos.length}{" "}
              {fotos.length === 1
                ? "fotografía"
                : "fotografías"}
            </div>
          </div>

          {/* INFORMACIÓN Y RESERVA */}
          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                  vehiculo.disponible
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <CheckCircle2 size={15} />

                {vehiculo.disponible
                  ? "Disponible"
                  : "No disponible"}
              </span>

              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                {vehiculo.anio}
              </span>
            </div>

            <p className="mt-7 text-sm font-semibold text-gray-500">
              Precio de alquiler
            </p>

            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#D4202C]">
                USD$ {vehiculo.precioDia.toLocaleString("es-DO")}
              </span>

              <span className="text-sm text-gray-500">
                por día
              </span>
            </div>

            <div className="my-7 h-px bg-gray-200" />

            <h2 className="text-lg font-extrabold">
              Características
            </h2>

            <div className="mt-4 space-y-4">
              {/* VEHÍCULO */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Car size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Vehículo
                  </p>

                  <p className="font-semibold">
                    {vehiculo.marca} {vehiculo.modelo}
                  </p>
                </div>
              </div>

              {/* COLOR */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Palette size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Color
                  </p>

                  <p className="font-semibold">
                    {vehiculo.color || "No especificado"}
                  </p>
                </div>
              </div>

              {/* SEGURO */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Tipo de seguro
                  </p>

                  <p className="font-semibold">
                    {vehiculo.tipoSeguro}
                  </p>
                </div>
              </div>

              {/* ALQUILER */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Alquiler
                  </p>

                  <p className="font-semibold">
                    Consulta las fechas disponibles
                  </p>
                </div>
              </div>
            </div>

            {/* CARACTERÍSTICAS ADICIONALES */}
            {caracteristicas.length > 0 && (
              <>
                <div className="my-7 h-px bg-gray-200" />

                <h2 className="text-lg font-extrabold">
                  Características adicionales
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {caracteristicas.map(
                    (caracteristica, indice) => (
                      <span
                        key={`${indice}-${caracteristica}`}
                        className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-[#B91C1C]"
                      >
                        <CheckCircle2
                          size={15}
                          className="shrink-0"
                        />

                        {caracteristica}
                      </span>
                    )
                  )}
                </div>
              </>
            )}

            {/* SOLICITUD DE FECHAS */}
            {vehiculo.disponible ? (
              <form
                id="solicitar-reserva"
                onSubmit={solicitarPorWhatsApp}
                className="mt-8 scroll-mt-6"
              >
                <h2 className="text-lg font-extrabold">
                   Ingresar fechas de recogida y devolución
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Indica las fechas y envía la consulta por WhatsApp.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Fecha de recogida
                    </span>
                    <input
                      type="date"
                      required
                      min={fechaMinima}
                      value={fechaInicio}
                      onChange={(event) => {
                        setFechaInicio(event.target.value);
                        setErrorFechas("");
                      }}
                      className={CLASE_CAMPO}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Fecha de devolución
                    </span>
                    <input
                      type="date"
                      required
                      min={fechaInicio || fechaMinima}
                      value={fechaFin}
                      onChange={(event) => {
                        setFechaFin(event.target.value);
                        setErrorFechas("");
                      }}
                      className={CLASE_CAMPO}
                    />
                  </label>
                </div>

                {errorFechas && (
                  <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                    {errorFechas}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-5 py-4 font-bold text-white transition hover:bg-black"
                >
                  <MessageCircle size={21} />
                  Consultar por WhatsApp
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-xl bg-gray-100 px-4 py-4 text-center text-sm font-semibold text-gray-500">
                Este vehículo no está disponible para reservar actualmente.
              </div>
            )}

            <p className="mt-4 text-center text-xs leading-5 text-gray-400">
              El precio y la disponibilidad deben confirmarse al momento de la reserva.
            </p>
          </aside>
        </div>

        {/* VOLVER AL CATÁLOGO */}
        <div className="mt-8">
          <a
            href="/#vehiculos"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-bold transition hover:border-[#D4202C] hover:text-[#D4202C]"
          >
            <ArrowLeft size={17} />
            Volver a todos los vehículos
          </a>
        </div>
      </section>

      {/* VISOR DE FOTOGRAFÍAS A PANTALLA COMPLETA */}
      {visorAbierto && fotoActual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fotografía ampliada del vehículo"
          onClick={() => setVisorAbierto(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8"
        >
          {/* CERRAR */}
          <button
            type="button"
            onClick={() => setVisorAbierto(false)}
            aria-label="Cerrar fotografía ampliada"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#D4202C] sm:right-6 sm:top-6"
          >
            <X size={26} />
          </button>

          {/* FOTO ANTERIOR Y SIGUIENTE */}
          {fotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  cambiarFoto(-1);
                }}
                aria-label="Fotografía anterior"
                className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#D4202C] sm:left-6 sm:h-14 sm:w-14"
              >
                <ChevronLeft size={30} />
              </button>

              <button
                type="button"
                onClick={(evento) => {
                  evento.stopPropagation();
                  cambiarFoto(1);
                }}
                aria-label="Fotografía siguiente"
                className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#D4202C] sm:right-6 sm:h-14 sm:w-14"
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}

          {/* IMAGEN AMPLIADA */}
          <img
            src={fotoActual.url}
            alt={`${vehiculo.marca} ${vehiculo.modelo} ampliado`}
            onClick={(evento) => evento.stopPropagation()}
            className="max-h-[88vh] max-w-[90vw] select-none object-contain"
          />

          {/* CONTADOR */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            {fotoSeleccionada + 1} / {fotos.length}
          </div>
        </div>
      )}

      {/* PIE DE PÁGINA */}
      <footer className="border-t-4 border-[#D4202C] bg-black px-5 py-7 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} El Bien Amado Rent A Car. Todos los derechos reservados.
      </footer>
    </main>
  );
}