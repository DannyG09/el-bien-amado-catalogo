"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  Sparkles,
  X,
} from "lucide-react";
import type { Vehiculo as VehiculoCompleto } from "../../types/vehiculo";
import {
  traducirTipoSeguro,
  useIdioma,
  type Idioma,
} from "../../lib/idioma";

type Vehiculo = Omit<VehiculoCompleto, "placa">;

type Foto = {
  id: number;
  url: string;
  public_id: string;
  orden: number;
};

const WHATSAPP_NUMERO = "18299212615";
const FECHA_MINIMA = (() => {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
})();
const CLASE_CAMPO =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20";

type ErrorKey =
  | "vehiclesLoadFailed"
  | "invalidVehicleList"
  | "vehicleNotFound"
  | "unexpected";

const TEXTOS = {
  es: {
    loading: "Cargando información del vehículo...",
    vehicleNotFound: "Vehículo no encontrado",
    errors: {
      vehiclesLoadFailed: "No se pudieron cargar los vehículos.",
      invalidVehicleList: "La respuesta de vehículos tiene un formato inválido.",
      vehicleNotFound: "No encontramos este vehículo.",
      unexpected: "Ocurrió un error al cargar el vehículo.",
    },
    noRequestedInfo: "No pudimos encontrar la información solicitada.",
    backToCatalog: "Volver al catálogo",
    back: "Volver",
    fleet: "Nuestra flota",
    year: "Año",
    enlargePhoto: "Ampliar fotografía",
    noPhotos: "No hay fotografías disponibles",
    previousPhoto: "Fotografía anterior",
    nextPhoto: "Fotografía siguiente",
    viewPhoto: (index: number) => `Ver fotografía ${index}`,
    thumbnail: (index: number) => `Miniatura ${index}`,
    photo: "fotografía",
    photos: "fotografías",
    available: "Disponible",
    unavailable: "No disponible",
    rentalPrice: "Precio de alquiler",
    perDay: "por día",
    features: "Características",
    vehicle: "Vehículo",
    color: "Color",
    notSpecified: "No especificado",
    insurance: "Tipo de seguro",
    rental: "Alquiler",
    checkDates: "Consulta las fechas disponibles",
    additionalFeatures: "Características adicionales",
    enterDates: "Ingresar fechas de recogida y devolución",
    dateInstructions: "Indica las fechas y envía la consulta por WhatsApp.",
    pickupDate: "Fecha de recogida",
    returnDate: "Fecha de devolución",
    invalidDates: "La devolución debe ser el mismo día de la recogida o después.",
    askOnWhatsApp: "Consultar por WhatsApp",
    unavailableForBooking:
      "Este vehículo no está disponible para reservar actualmente.",
    priceAvailabilityNotice:
      "El precio y la disponibilidad deben confirmarse al momento de la reserva.",
    backToAllVehicles: "Volver a todos los vehículos",
    enlargedVehiclePhoto: "Fotografía ampliada del vehículo",
    closeEnlargedPhoto: "Cerrar fotografía ampliada",
    allRightsReserved: "Todos los derechos reservados.",
    whatsappGreeting: (vehicle: string) =>
      `Hola, quiero solicitar disponibilidad para el ${vehicle}.`,
    whatsappPickup: (date: string) => `Fecha de recogida: ${date}.`,
    whatsappReturn: (date: string) => `Fecha de devolución: ${date}.`,
    whatsappPrice: (price: string) => `Precio publicado: USD$ ${price} por día.`,
    whatsappDisclaimer:
      "Por favor, confirmen disponibilidad y requisitos. Entiendo que esta solicitud no confirma la reserva.",
  },
  en: {
    loading: "Loading vehicle information...",
    vehicleNotFound: "Vehicle not found",
    errors: {
      vehiclesLoadFailed: "Could not load the vehicles.",
      invalidVehicleList: "The vehicle list response has an invalid format.",
      vehicleNotFound: "We couldn't find this vehicle.",
      unexpected: "An error occurred while loading the vehicle.",
    },
    noRequestedInfo: "We couldn't find the requested information.",
    backToCatalog: "Back to catalog",
    back: "Back",
    fleet: "Our fleet",
    year: "Year",
    enlargePhoto: "Enlarge photo",
    noPhotos: "No photos available",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    viewPhoto: (index: number) => `View photo ${index}`,
    thumbnail: (index: number) => `Thumbnail ${index}`,
    photo: "photo",
    photos: "photos",
    available: "Available",
    unavailable: "Unavailable",
    rentalPrice: "Rental price",
    perDay: "per day",
    features: "Features",
    vehicle: "Vehicle",
    color: "Color",
    notSpecified: "Not specified",
    insurance: "Insurance type",
    rental: "Rental",
    checkDates: "Check available dates",
    additionalFeatures: "Additional features",
    enterDates: "Enter pickup and return dates",
    dateInstructions: "Choose your dates and send your inquiry via WhatsApp.",
    pickupDate: "Pickup date",
    returnDate: "Return date",
    invalidDates: "The return date must be the same day as pickup or later.",
    askOnWhatsApp: "Inquire on WhatsApp",
    unavailableForBooking:
      "This vehicle is currently unavailable for booking.",
    priceAvailabilityNotice:
      "Price and availability must be confirmed when booking.",
    backToAllVehicles: "Back to all vehicles",
    enlargedVehiclePhoto: "Enlarged vehicle photo",
    closeEnlargedPhoto: "Close enlarged photo",
    allRightsReserved: "All rights reserved.",
    whatsappGreeting: (vehicle: string) =>
      `Hello, I'd like to check availability for the ${vehicle}.`,
    whatsappPickup: (date: string) => `Pickup date: ${date}.`,
    whatsappReturn: (date: string) => `Return date: ${date}.`,
    whatsappPrice: (price: string) => `Listed price: USD$ ${price} per day.`,
    whatsappDisclaimer:
      "Please confirm availability and requirements. I understand this inquiry does not confirm a reservation.",
  },
} as const;

function esErrorKey(value: string): value is ErrorKey {
  return (
    value === "vehiclesLoadFailed" ||
    value === "invalidVehicleList" ||
    value === "vehicleNotFound" ||
    value === "unexpected"
  );
}

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
  const estado =
    datos.estado === "disponible" ||
    datos.estado === "rentado" ||
    datos.estado === "mantenimiento" ||
    datos.estado === "pintura"
      ? datos.estado
      : datos.disponible === true ||
          datos.disponible === 1 ||
          datos.disponible === "true"
        ? "disponible"
        : "rentado";

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
    disponible: estado === "disponible",
    estado,
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
  const [error, setError] = useState<ErrorKey | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [errorFechas, setErrorFechas] = useState(false);
  const idioma = useIdioma();
  const texto = TEXTOS[idioma];

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  useEffect(() => {
    if (!id) return;

    let cancelado = false;

    async function cargarDetalle() {
      try {
        setCargando(true);
        setError(null);

        const parametros = new URLSearchParams(window.location.search);
        const fechaInicioUrl = parametros.get("fechaInicio") ?? "";
        const fechaFinUrl = parametros.get("fechaFin") ?? "";
        if (fechaInicioUrl && fechaFinUrl && fechaFinUrl >= fechaInicioUrl) {
          setFechaInicio(fechaInicioUrl);
          setFechaFin(fechaFinUrl);
        }
        const consultaFechas =
          fechaInicioUrl && fechaFinUrl && fechaFinUrl >= fechaInicioUrl
            ? `?${new URLSearchParams({
                fechaInicio: fechaInicioUrl,
                fechaFin: fechaFinUrl,
              })}`
            : "";
        const respuestaVehiculos = await fetch(
          `/api/vehiculos${consultaFechas}`
        );

        if (!respuestaVehiculos.ok) {
          throw new Error("vehiclesLoadFailed");
        }

        const respuestaLista: unknown = await respuestaVehiculos.json();

        if (!Array.isArray(respuestaLista)) {
          throw new Error("invalidVehicleList");
        }

        const encontrado = respuestaLista.find(
          (item: unknown) =>
            esRegistro(item) && String(item.id) === String(id)
        );

        if (!encontrado) {
          throw new Error("vehicleNotFound");
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
            e instanceof Error && esErrorKey(e.message)
              ? e.message
              : "unexpected"
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

  function solicitarPorWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehiculo || !vehiculo.disponible) return;

    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
      setErrorFechas(true);
      return;
    }

    const formatoFecha = (fecha: string) =>
      new Date(`${fecha}T12:00:00`).toLocaleDateString(
        idioma === "es" ? "es-DO" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );

    const mensaje = [
      texto.whatsappGreeting(
        `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`
      ),
      texto.whatsappPickup(formatoFecha(fechaInicio)),
      texto.whatsappReturn(formatoFecha(fechaFin)),
      texto.whatsappPrice(
        vehiculo.precioDia.toLocaleString(idioma === "es" ? "es-DO" : "en-US")
      ),
      texto.whatsappDisclaimer,
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
            {texto.loading}
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
            {texto.vehicleNotFound}
          </h1>

          <p className="mt-3 text-gray-500">
            {error ? texto.errors[error] : texto.noRequestedInfo}
          </p>

          <a
            href="/#vehiculos"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#D4202C] px-5 py-3 font-bold text-white transition hover:bg-black"
          >
            <ArrowLeft size={18} />
            {texto.backToCatalog}
          </a>
        </div>
      </main>
    );
  }

  const fotoActual = fotos[fotoSeleccionada];

  const caracteristicas = obtenerCaracteristicas(
    vehiculo.descripcion
  );
  const tipoSeguro = traducirTipoSeguro(vehiculo.tipoSeguro, idioma);

  return (
    <main className="min-h-screen bg-[#f5f5f6] text-gray-900">
      {/* ENCABEZADO */}
      <header className="relative overflow-hidden border-b border-white/10 bg-black text-white shadow-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <a href="/" className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-gray-50 motion-reduce:transform-none">
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
              {texto.backToCatalog}
            </span>

            <span className="sm:hidden">{texto.back}</span>
          </a>

        </div>
      </header>

      {/* DETALLE DEL VEHÍCULO */}
      <section className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 animate-[showroomRise_650ms_ease-out_both]">
          <p className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#D4202C]">
            <Sparkles size={14} /> {texto.fleet}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            {vehiculo.marca} {vehiculo.modelo}
          </h1>

          <p className="mt-2 text-gray-500">
            {texto.year} {vehiculo.anio} · {vehiculo.color}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          {/* GALERÍA */}
          <div className="group/gallery min-w-0 overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_20px_65px_rgba(0,0,0,0.09)] transition-all duration-500 hover:shadow-[0_25px_80px_rgba(0,0,0,0.15)] animate-[showroomRise_700ms_ease-out_both] motion-reduce:animate-none">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 via-white to-gray-200 sm:aspect-[16/10]">
              {fotoActual ? (
                <button
                  type="button"
                  onClick={() => setVisorAbierto(true)}
                  aria-label={texto.enlargePhoto}
                  className="h-full w-full cursor-zoom-in overflow-hidden"
                >
                  <img
                    src={fotoActual.url}
                    alt={`${vehiculo.marca} ${vehiculo.modelo} - ${texto.photo} ${fotoSeleccionada + 1}`}
                    className="h-full w-full object-contain transition-transform duration-700 ease-out hover:scale-[1.055] motion-reduce:transform-none"
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
                    {texto.noPhotos}
                  </p>
                </div>
              )}

              {fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => cambiarFoto(-1)}
                    aria-label={texto.previousPhoto}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-[#D4202C] active:scale-95 motion-reduce:transform-none"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarFoto(1)}
                    aria-label={texto.nextPhoto}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-[#D4202C] active:scale-95 motion-reduce:transform-none"
                  >
                    <ChevronRight size={24} />
                  </button>

                  <span className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-black/75 px-4 py-2 text-xs font-bold tracking-wider text-white backdrop-blur-lg">
                    {fotoSeleccionada + 1} / {fotos.length}
                  </span>
                </>
              )}
            </div>

            {/* MINIATURAS */}
            {fotos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto border-t border-gray-100 bg-white p-3 sm:p-4">
                {fotos.map((foto, indice) => (
                  <button
                    type="button"
                    key={`${foto.id}-${foto.url}`}
                    onClick={() => setFotoSeleccionada(indice)}
                    aria-label={texto.viewPhoto(indice + 1)}
                    aria-pressed={fotoSeleccionada === indice}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none sm:h-24 sm:w-28 ${
                      fotoSeleccionada === indice
                        ? "border-[#D4202C]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={foto.url}
                      alt={texto.thumbnail(indice + 1)}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-110 motion-reduce:transform-none"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-gray-500">
              <Images size={17} />

              {fotos.length}{" "}
              {fotos.length === 1 ? texto.photo : texto.photos}
            </div>
          </div>

          {/* INFORMACIÓN Y RESERVA */}
          <aside className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white p-6 shadow-[0_20px_65px_rgba(0,0,0,0.09)] transition-shadow duration-500 hover:shadow-[0_25px_75px_rgba(212,32,44,0.10)] sm:p-8 lg:sticky lg:top-6 animate-[showroomRise_800ms_ease-out_both] motion-reduce:animate-none">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-black via-[#D4202C] to-black" />
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
                  ? texto.available
                  : texto.unavailable}
              </span>

              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                {vehiculo.anio}
              </span>
            </div>

            <p className="mt-7 text-sm font-semibold text-gray-500">
              {texto.rentalPrice}
            </p>

            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-4xl font-black tracking-tight text-[#D4202C] sm:text-5xl">
                USD$ {vehiculo.precioDia.toLocaleString(idioma === "es" ? "es-DO" : "en-US")}
              </span>

              <span className="text-sm text-gray-500">
                {texto.perDay}
              </span>
            </div>

            <div className="my-7 h-px bg-gray-200" />

            <h2 className="text-lg font-extrabold">
              {texto.features}
            </h2>

            <div className="mt-4 space-y-4">
              {/* VEHÍCULO */}
              <div className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-gray-50 motion-reduce:transform-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-800 transition-all duration-300 group-hover:bg-red-50 group-hover:text-[#D4202C]">
                  <Car size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    {texto.vehicle}
                  </p>

                  <p className="font-semibold">
                    {vehiculo.marca} {vehiculo.modelo}
                  </p>
                </div>
              </div>

              {/* COLOR */}
              <div className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-gray-50 motion-reduce:transform-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-800 transition-all duration-300 group-hover:bg-red-50 group-hover:text-[#D4202C]">
                  <Palette size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    {texto.color}
                  </p>

                  <p className="font-semibold">
                    {vehiculo.color || texto.notSpecified}
                  </p>
                </div>
              </div>

              {/* SEGURO */}
              <div className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-gray-50 motion-reduce:transform-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-800 transition-all duration-300 group-hover:bg-red-50 group-hover:text-[#D4202C]">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    {texto.insurance}
                  </p>

                  <p className="font-semibold">
                    {tipoSeguro}
                  </p>
                </div>
              </div>

              {/* ALQUILER */}
              <div className="group flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:translate-x-1 hover:bg-gray-50 motion-reduce:transform-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-800 transition-all duration-300 group-hover:bg-red-50 group-hover:text-[#D4202C]">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    {texto.rental}
                  </p>

                  <p className="font-semibold">
                    {texto.checkDates}
                  </p>
                </div>
              </div>
            </div>

            {/* CARACTERÍSTICAS ADICIONALES */}
            {caracteristicas.length > 0 && (
              <>
                <div className="my-7 h-px bg-gray-200" />

                <h2 className="text-lg font-extrabold">
                  {texto.additionalFeatures}
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
                  {texto.enterDates}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {texto.dateInstructions}
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      {texto.pickupDate}
                    </span>
                    <input
                      type="date"
                      required
                      min={FECHA_MINIMA}
                      value={fechaInicio}
                      onChange={(event) => {
                        setFechaInicio(event.target.value);
                        setErrorFechas(false);
                      }}
                      className={CLASE_CAMPO}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      {texto.returnDate}
                    </span>
                    <input
                      type="date"
                      required
                      min={fechaInicio || FECHA_MINIMA}
                      value={fechaFin}
                      onChange={(event) => {
                        setFechaFin(event.target.value);
                        setErrorFechas(false);
                      }}
                      className={CLASE_CAMPO}
                    />
                  </label>
                </div>

                {errorFechas && (
                  <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                    {texto.invalidDates}
                  </p>
                )}

                <button
                  type="submit"
                  className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#D4202C] px-5 py-4 font-bold text-white shadow-[0_12px_30px_rgba(212,32,44,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-black hover:shadow-[0_16px_35px_rgba(0,0,0,0.25)] active:scale-[0.98] motion-reduce:transform-none"
                >
                  <MessageCircle size={21} className="transition-transform duration-300 group-hover:rotate-[-10deg] group-hover:scale-110 motion-reduce:transform-none" />
                  {texto.askOnWhatsApp}
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-xl bg-gray-100 px-4 py-4 text-center text-sm font-semibold text-gray-500">
                {texto.unavailableForBooking}
              </div>
            )}

            <p className="mt-4 text-center text-xs leading-5 text-gray-400">
              {texto.priceAvailabilityNotice}
            </p>
          </aside>
        </div>

        {/* VOLVER AL CATÁLOGO */}
        <div className="mt-8">
          <a
            href="/#vehiculos"
            className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold shadow-sm transition-all duration-300 hover:-translate-x-1 hover:border-[#D4202C] hover:text-[#D4202C] hover:shadow-lg motion-reduce:transform-none"
          >
            <ArrowLeft size={17} />
            {texto.backToAllVehicles}
          </a>
        </div>
      </section>

      {/* VISOR DE FOTOGRAFÍAS A PANTALLA COMPLETA */}
      {visorAbierto && fotoActual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={texto.enlargedVehiclePhoto}
          onClick={() => setVisorAbierto(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl animate-[showroomFade_200ms_ease-out_both] motion-reduce:animate-none sm:p-8"
        >
          {/* CERRAR */}
          <button
            type="button"
            onClick={() => setVisorAbierto(false)}
            aria-label={texto.closeEnlargedPhoto}
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
                aria-label={texto.previousPhoto}
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
                aria-label={texto.nextPhoto}
                className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#D4202C] sm:right-6 sm:h-14 sm:w-14"
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}

          {/* IMAGEN AMPLIADA */}
          <img
            src={fotoActual.url}
            alt={`${vehiculo.marca} ${vehiculo.modelo} ${texto.enlargedVehiclePhoto}`}
            onClick={(evento) => evento.stopPropagation()}
            className="max-h-[88vh] max-w-[90vw] select-none object-contain drop-shadow-2xl"
          />

          {/* CONTADOR */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            {fotoSeleccionada + 1} / {fotos.length}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes showroomRise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes showroomFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { scroll-behavior: auto !important; }
        }
      `}</style>

      {/* PIE DE PÁGINA */}
      <footer className="border-t-4 border-[#D4202C] bg-black px-5 py-7 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} El Bien Amado Rent A Car. {texto.allRightsReserved}
      </footer>
    </main>
  );
}