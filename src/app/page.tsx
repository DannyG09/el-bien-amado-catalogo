
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import VehicleCard from "./components/VehicleCard";
import type { EstadoVehiculo, Vehiculo } from "./types/vehiculo";
import {
  guardarIdioma,
  useIdioma,
  type Idioma,
} from "./lib/idioma";
import {
  Car,
  ShieldCheck,
  CalendarDays,
  Headphones,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Star,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";

/*
  EL BIEN AMADO RENT A CAR
  Colores: negro, rojo y blanco
  Logo: /public/logo.jpeg
*/

const WHATSAPP_NUMERO = "18299212615";

function linkWhatsApp(idioma: Idioma) {
  const mensaje =
    idioma === "en"
      ? "Hello, I'd like to book a vehicle. Please send me information about availability and prices."
      : "Hola, quiero agendar un vehículo. Me gustaría recibir información sobre disponibilidad y precios.";
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

type Orden =
  | "reciente"
  | "precio-asc"
  | "precio-desc"
  | "anio-desc"
  | "marca-asc";

type Caracteristica = {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
};

type Servicio = {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
};

const CARACTERISTICAS: Caracteristica[] = [
  {
    icono: ShieldCheck,
    titulo: "Alquiler seguro",
    descripcion: "Opciones de seguro",
  },
  {
    icono: CalendarDays,
    titulo: "Fechas flexibles",
    descripcion: "Opciones de extensión",
  },
  {
    icono: Headphones,
    titulo: "Atención personalizada",
    descripcion: "Estamos para ayudarte",
  },
];

const SERVICIOS: Servicio[] = [
  {
    icono: ShieldCheck,
    titulo: "Seguridad y confianza",
    descripcion:
      "Vehículos preparados para ofrecerte una experiencia de alquiler segura.",
  },
  {
    icono: CalendarDays,
    titulo: "Alquiler flexible",
    descripcion:
      "Elige tus fechas y consulta la posibilidad de extender tu alquiler.",
  },
  {
    icono: Headphones,
    titulo: "Atención personalizada",
    descripcion: "Te acompañamos durante todo el proceso de alquiler.",
  },
];

const OPCIONES_ORDEN: { id: Orden; label: string }[] = [
  { id: "reciente", label: "Más recientes" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "anio-desc", label: "Año: más nuevo primero" },
  { id: "marca-asc", label: "Marca: A-Z" },
];

const campoClase =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#D4202C] focus:ring-2 focus:ring-[#D4202C]/20";

const TEXTOS = {
  es: {
    languageLabel: "Idioma",
    nav: ["Inicio", "Vehículos", "Servicios"],
    reserveNow: "Reservar ahora",
    heroBadge: "Vehículos disponibles para reservar",
    heroTitle: <>Muévete con<br />libertad y confianza.</>,
    heroDescription:
      "Alquila el vehículo que necesitas para tus viajes, negocios y momentos especiales. Sencillo, seguro y sin complicaciones.",
    viewFleet: "Ver nuestra flota",
    whyChooseUs: "¿Por qué elegirnos?",
    features: [
      ["Alquiler seguro", "Opciones de seguro"],
      ["Fechas flexibles", "Opciones de extensión"],
      ["Atención personalizada", "Estamos para ayudarte"],
    ],
    services: [
      ["Seguridad y confianza", "Vehículos preparados para ofrecerte una experiencia de alquiler segura."],
      ["Alquiler flexible", "Elige tus fechas y consulta la posibilidad de extender tu alquiler."],
      ["Atención personalizada", "Te acompañamos durante todo el proceso de alquiler."],
    ],
    fleet: "Nuestra flota",
    catalogTitle: "Encuentra tu próximo vehículo",
    catalogDescription: "Explora nuestra selección y encuentra la opción ideal para tu próximo viaje.",
    vehiclesAvailable: "vehículos disponibles",
    search: "Buscar por marca, modelo, color o año...",
    onlyAvailable: "Solo disponibles",
    filters: "Filtros",
    sort: "Ordenar por",
    sortOptions: ["Más recientes", "Precio: menor a mayor", "Precio: mayor a menor", "Año: más nuevo primero", "Marca: A-Z"],
    brand: "Marca",
    allBrands: "Todas las marcas",
    insurance: "Seguro",
    all: "Todos",
    minPrice: "Precio mínimo (USD$)",
    maxPrice: "Precio máximo (USD$)",
    noLimit: "Sin límite",
    showing: "Mostrando",
    of: "de",
    vehicles: "vehículos",
    clearFilters: "Limpiar filtros",
    catalogLoadFailed: "No se pudo cargar el catálogo",
    loadError: "No pudimos cargar los vehículos. Verifica tu conexión e inténtalo de nuevo.",
    retry: "Intentar de nuevo",
    noVehicles: "No hay vehículos registrados",
    noVehiclesDescription: "Actualmente no hay vehículos disponibles en el catálogo.",
    noResults: "No encontramos vehículos",
    noResultsDescription: "Prueba con otra búsqueda o cambia los filtros.",
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    pagination: "Paginación de vehículos",
    finalTitle: <>Tu viaje.<br />Nuestro compromiso.</>,
    finalDescription: "Queremos que alquilar un vehículo sea una experiencia sencilla desde el primer momento hasta la devolución.",
    quality: "Calidad",
    selectedVehicles: "Vehículos seleccionados",
    address: "C/ FELICIDAD, Santo Domingo Este, Lucerna",
    viewMaps: "Ver en Google Maps",
    phones: "Teléfonos",
    office: "Oficina:",
    mobile: "Celular:",
    footerTagline: "Tu próximo viaje comienza aquí.",
    rights: "Todos los derechos reservados.",
    contactWhatsApp: "Contactar por WhatsApp",
    whatsappTitle: "Escríbenos por WhatsApp",
  },
  en: {
    languageLabel: "Language",
    nav: ["Home", "Vehicles", "Services"],
    reserveNow: "Book now",
    heroBadge: "Vehicles available for booking",
    heroTitle: <>Move with<br />freedom and confidence.</>,
    heroDescription:
      "Rent the vehicle you need for your travels, business, and special moments. Simple, safe, and hassle-free.",
    viewFleet: "Browse our fleet",
    whyChooseUs: "Why choose us?",
    features: [
      ["Safe rentals", "Insurance options"],
      ["Flexible dates", "Extension options"],
      ["Personalized service", "We're here to help"],
    ],
    services: [
      ["Safety and peace of mind", "Vehicles prepared to offer you a safe rental experience."],
      ["Flexible rentals", "Choose your dates and ask about extending your rental."],
      ["Personalized service", "We're with you throughout the rental process."],
    ],
    fleet: "Our fleet",
    catalogTitle: "Find your next vehicle",
    catalogDescription: "Explore our selection and find the perfect option for your next trip.",
    vehiclesAvailable: "vehicles available",
    search: "Search by make, model, color, or year...",
    onlyAvailable: "Available only",
    filters: "Filters",
    sort: "Sort by",
    sortOptions: ["Newest", "Price: low to high", "Price: high to low", "Year: newest first", "Make: A-Z"],
    brand: "Make",
    allBrands: "All makes",
    insurance: "Insurance",
    all: "All",
    minPrice: "Minimum price (USD$)",
    maxPrice: "Maximum price (USD$)",
    noLimit: "No limit",
    showing: "Showing",
    of: "of",
    vehicles: "vehicles",
    clearFilters: "Clear filters",
    catalogLoadFailed: "Couldn't load the catalog",
    loadError: "We couldn't load the vehicles. Check your connection and try again.",
    retry: "Try again",
    noVehicles: "No vehicles listed",
    noVehiclesDescription: "There are currently no vehicles available in the catalog.",
    noResults: "No vehicles found",
    noResultsDescription: "Try another search or adjust your filters.",
    previousPage: "Previous page",
    nextPage: "Next page",
    pagination: "Vehicle pagination",
    finalTitle: <>Your journey.<br />Our commitment.</>,
    finalDescription: "We want renting a vehicle to be a simple experience from the moment you start until you return it.",
    quality: "Quality",
    selectedVehicles: "Selected vehicles",
    address: "C/ FELICIDAD, Santo Domingo Este, Lucerna",
    viewMaps: "View on Google Maps",
    phones: "Phone numbers",
    office: "Office:",
    mobile: "Mobile:",
    footerTagline: "Your next trip starts here.",
    rights: "All rights reserved.",
    contactWhatsApp: "Contact us on WhatsApp",
    whatsappTitle: "Message us on WhatsApp",
  },
} as const;

function normalizarVehiculo(datos: unknown): Vehiculo {
  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    throw new Error("La respuesta contiene un vehículo con formato inválido.");
  }

  const vehiculo = datos as Record<string, unknown>;
  const id = Number(vehiculo.id);

  if (!Number.isFinite(id)) {
    throw new Error("La respuesta contiene un vehículo sin identificador válido.");
  }

  const tipoSeguro = vehiculo.tipoSeguro ?? vehiculo.tiposeguro;
  const precioDia = vehiculo.precioDia ?? vehiculo.preciodia;
  const estado: EstadoVehiculo =
    vehiculo.estado === "disponible" ||
    vehiculo.estado === "rentado" ||
    vehiculo.estado === "mantenimiento" ||
    vehiculo.estado === "pintura"
      ? vehiculo.estado
      : vehiculo.disponible === true ||
          vehiculo.disponible === 1 ||
          vehiculo.disponible === "true"
        ? "disponible"
        : "rentado";

  return {
    id,
    marca: typeof vehiculo.marca === "string" ? vehiculo.marca : "",
    modelo: typeof vehiculo.modelo === "string" ? vehiculo.modelo : "",
    anio: Number(vehiculo.anio),
    placa: typeof vehiculo.placa === "string" ? vehiculo.placa : "",
    color: typeof vehiculo.color === "string" ? vehiculo.color : "",
    tipoSeguro:
      typeof tipoSeguro === "string" ? tipoSeguro : "No especificado",
    precioDia: Number(precioDia ?? 0),
    imagen: typeof vehiculo.imagen === "string" ? vehiculo.imagen : null,
    descripcion:
      typeof vehiculo.descripcion === "string" ? vehiculo.descripcion : null,
    disponible: estado === "disponible",
    estado,
  };
}

async function obtenerVehiculos(signal?: AbortSignal): Promise<Vehiculo[]> {
  const response = await fetch("/api/vehiculos", { signal });

  if (!response.ok) {
    throw new Error("Error al obtener vehículos");
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("La respuesta de vehículos tiene un formato inválido.");
  }

  return data.map(normalizarVehiculo);
}

export default function Home() {
  const idioma = useIdioma();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const vehiculosListaRef = useRef<HTMLDivElement>(null);
  const vehiculosPorPagina = 9;

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [orden, setOrden] = useState<Orden>("reciente");
  const [marcaFiltro, setMarcaFiltro] = useState("todas");
  const [seguroFiltro, setSeguroFiltro] = useState("todos");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const texto = TEXTOS[idioma];

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  useEffect(() => {
    const controller = new AbortController();
    obtenerVehiculos(controller.signal)
      .then((lista) => setVehiculos(lista))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        console.error("Error al cargar vehículos:", error);
        setErrorCarga(
          "No pudimos cargar los vehículos. Verifica tu conexión e inténtalo de nuevo."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controller.abort();
  }, []);

  const marcas = useMemo(
    () => Array.from(new Set(vehiculos.map((v) => v.marca))).sort(),
    [vehiculos]
  );

  const seguros = useMemo(
    () => Array.from(new Set(vehiculos.map((v) => v.tipoSeguro))).sort(),
    [vehiculos]
  );

  const hayFiltrosActivos =
    busqueda !== "" ||
    soloDisponibles ||
    orden !== "reciente" ||
    marcaFiltro !== "todas" ||
    seguroFiltro !== "todos" ||
    precioMin !== "" ||
    precioMax !== "";

  function limpiarFiltros() {
    setPaginaActual(1);
    setBusqueda("");
    setSoloDisponibles(false);
    setOrden("reciente");
    setMarcaFiltro("todas");
    setSeguroFiltro("todos");
    setPrecioMin("");
    setPrecioMax("");
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const min = precioMin === "" ? null : Number(precioMin);
    const max = precioMax === "" ? null : Number(precioMax);

    const lista = vehiculos.filter((v) => {
      if (soloDisponibles && !v.disponible) return false;

      if (marcaFiltro !== "todas" && v.marca !== marcaFiltro) {
        return false;
      }

      if (seguroFiltro !== "todos" && v.tipoSeguro !== seguroFiltro) {
        return false;
      }

      if (min !== null && Number(v.precioDia) < min) return false;
      if (max !== null && Number(v.precioDia) > max) return false;

      if (!texto) return true;

      return `${v.marca} ${v.modelo} ${v.color} ${v.anio}`
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
        case "marca-asc":
          return `${a.marca} ${a.modelo}`.localeCompare(
            `${b.marca} ${b.modelo}`
          );
        default:
          return b.id - a.id;
      }
    });
  }, [
    vehiculos,
    busqueda,
    soloDisponibles,
    orden,
    marcaFiltro,
    seguroFiltro,
    precioMin,
    precioMax,
  ]);

  const totalPaginas = Math.ceil(filtrados.length / vehiculosPorPagina);
  const paginaSegura = Math.min(paginaActual, Math.max(totalPaginas, 1));
  const indiceInicial = (paginaSegura - 1) * vehiculosPorPagina;
  const vehiculosPaginados = filtrados.slice(
    indiceInicial,
    indiceInicial + vehiculosPorPagina
  );
  const primeraPaginaVisible = Math.max(
    1,
    Math.min(paginaSegura - 2, totalPaginas - 4)
  );
  const paginasVisibles = Array.from(
    { length: Math.min(totalPaginas, 5) },
    (_, indice) => primeraPaginaVisible + indice
  );

  function cambiarPagina(pagina: number) {
    setPaginaActual(pagina);
    vehiculosListaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* NAVBAR */}
      <nav className="absolute left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#inicio" className="flex items-center gap-3 text-white">
            <Image
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full ring-2 ring-[#D4202C]"
            />

            <div className="hidden sm:block">
              <p className="text-lg font-extrabold leading-none tracking-tight">
                El Bien <span className="text-[#D4202C]">Amado</span>
              </p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.3em] text-gray-400">
                RENT A CAR
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-9 text-sm font-semibold text-white md:flex">
            {[
              ["#inicio", texto.nav[0]],
              ["#vehiculos", texto.nav[1]],
              ["#servicios", texto.nav[2]],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="border-b-2 border-transparent pb-1 transition hover:border-[#D4202C]"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="language-selector"
              className="text-xs font-semibold text-white sm:text-sm"
            >
              {texto.languageLabel}
            </label>
            <select
              id="language-selector"
              value={idioma}
              onChange={(event) =>
                guardarIdioma(event.target.value === "en" ? "en" : "es")
              }
              className="rounded-lg border border-white/40 bg-black/60 px-2 py-2.5 text-xs font-bold text-white outline-none transition hover:border-[#D4202C] focus:border-[#D4202C] sm:px-3 sm:text-sm"
            >
              <option value="es" className="text-gray-900">Español</option>
              <option value="en" className="text-gray-900">English</option>
            </select>
            <a
              href={linkWhatsApp(idioma)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#D4202C] px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#b81b26] sm:px-5 sm:text-sm"
            >
              {texto.reserveNow}
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="inicio"
        className="relative flex min-h-[760px] items-center overflow-hidden bg-black"
      >
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=85"
            alt="Vehículo premium"
            fill
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10" />
          <div className="absolute -right-40 top-0 hidden h-full w-72 skew-x-[-14deg] bg-[#D4202C]/90 lg:block" />
          <div className="absolute -right-10 top-0 hidden h-full w-6 skew-x-[-14deg] bg-white/90 lg:block" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pt-28 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4202C]/60 bg-[#D4202C]/15 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <CheckCircle2 size={16} className="text-[#D4202C]" />
              {texto.heroBadge}
            </div>

            <h2 className="text-5xl font-extrabold leading-[1.03] tracking-tight text-white md:text-7xl">
              {texto.heroTitle}
            </h2>

            <div className="mt-6 h-1.5 w-24 rounded-full bg-[#D4202C]" />

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
              {texto.heroDescription}
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#vehiculos"
                className="group flex items-center gap-2 rounded-lg bg-[#D4202C] px-7 py-4 font-bold text-white shadow-xl shadow-red-900/40 transition hover:bg-[#b81b26]"
              >
                {texto.viewFleet}
                <ArrowRight
                  size={19}
                  className="transition group-hover:translate-x-1"
                />
              </a>

              <a
                href="#servicios"
                className="rounded-lg border border-white/40 px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-black"
              >
                {texto.whyChooseUs}
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 border-t border-white/15 pt-7">
              {CARACTERISTICAS.map(({ icono: Icon }, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Icon size={22} className="text-[#D4202C]" />
                  <div>
                    <p className="text-sm font-semibold text-white">{texto.features[index][0]}</p>
                    <p className="text-xs text-gray-400">{texto.features[index][1]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOGO GRANDE */}
          <div className="hidden justify-center lg:flex">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full border border-white/20" />
              <Image
                src="/logo.jpeg"
                alt="Logo El Bien Amado Rent A Car"
                width={320}
                height={320}
                className="relative h-80 w-80 rounded-full shadow-2xl shadow-black ring-4 ring-[#D4202C]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          {SERVICIOS.map(({ icono: Icon }, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                <Icon size={23} />
              </div>
              <div>
                <h3 className="font-bold">{texto.services[index][0]}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {texto.services[index][1]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-1 bg-[#D4202C]" />
      </section>

      {/* CATÁLOGO */}
      <section id="vehiculos" className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-[#D4202C]">{texto.fleet}</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                {texto.catalogTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-gray-500">
                {texto.catalogDescription}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <CheckCircle2 size={18} className="text-[#D4202C]" />
              {vehiculos.filter((v) => v.disponible).length} {texto.vehiclesAvailable}
            </div>
          </div>

          {/* FILTROS */}
          {!cargando && vehiculos.length > 0 && (
            <div className="mb-10 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => {
                      setPaginaActual(1);
                      setBusqueda(e.target.value);
                    }}
                    placeholder={texto.search}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#D4202C] focus:bg-white focus:ring-2 focus:ring-[#D4202C]/20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPaginaActual(1);
                      setSoloDisponibles(!soloDisponibles);
                    }}
                    className={
                      soloDisponibles
                        ? "flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white md:flex-none"
                        : "flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 md:flex-none"
                    }
                  >
                    <span
                      className={
                        soloDisponibles
                          ? "h-2 w-2 rounded-full bg-green-400"
                          : "h-2 w-2 rounded-full bg-green-500"
                      }
                    />
                    {texto.onlyAvailable}
                  </button>

                  <button
                    onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    className={
                      mostrarFiltros
                        ? "flex items-center justify-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white"
                        : "flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#D4202C] hover:text-[#D4202C]"
                    }
                  >
                    <SlidersHorizontal size={17} />
                    {texto.filters}
                  </button>
                </div>
              </div>

              {mostrarFiltros && (
                <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">
                      {texto.sort}
                    </span>
                    <select
                      value={orden}
                      onChange={(e) => {
                        setPaginaActual(1);
                        setOrden(e.target.value as Orden);
                      }}
                      className={campoClase}
                    >
                      {OPCIONES_ORDEN.map((o, index) => (
                        <option key={o.id} value={o.id}>
                          {texto.sortOptions[index]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">
                      {texto.brand}
                    </span>
                    <select
                      value={marcaFiltro}
                      onChange={(e) => {
                        setPaginaActual(1);
                        setMarcaFiltro(e.target.value);
                      }}
                      className={campoClase}
                    >
                      <option value="todas">{texto.allBrands}</option>
                      {marcas.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">
                      {texto.insurance}
                    </span>
                    <select
                      value={seguroFiltro}
                      onChange={(e) => {
                        setPaginaActual(1);
                        setSeguroFiltro(e.target.value);
                      }}
                      className={campoClase}
                    >
                      <option value="todos">{texto.all}</option>
                      {seguros.map((sg) => (
                        <option key={sg} value={sg}>
                          {sg}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">
                      {texto.minPrice}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={precioMin}
                      onChange={(e) => {
                        setPaginaActual(1);
                        setPrecioMin(e.target.value);
                      }}
                      placeholder="0"
                      className={campoClase}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-gray-500">
                      {texto.maxPrice}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={precioMax}
                      onChange={(e) => {
                        setPaginaActual(1);
                        setPrecioMax(e.target.value);
                      }}
                      placeholder={texto.noLimit}
                      className={campoClase}
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
                <p>
                  {texto.showing}{" "}
                  <strong className="text-gray-900">{filtrados.length}</strong>{" "}
                  {texto.of} {vehiculos.length} {texto.vehicles}
                </p>

                {hayFiltrosActivos && (
                  <button
                    onClick={limpiarFiltros}
                    className="flex items-center gap-1 font-bold text-[#D4202C] hover:underline"
                  >
                    <X size={15} />
                    {texto.clearFilters}
                  </button>
                )}
              </div>
            </div>
          )}

          {cargando ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[470px] animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
          ) : errorCarga ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-white p-10 text-center"
            >
              <h3 className="text-xl font-bold text-gray-900">
                {texto.catalogLoadFailed}
              </h3>
              <p className="mt-2 text-gray-600">
                {idioma === "en" ? texto.loadError : errorCarga}
              </p>
              <button
                type="button"
                onClick={() => {
                  setErrorCarga(null);
                  setCargando(true);
                  obtenerVehiculos()
                    .then((lista) => setVehiculos(lista))
                    .catch((error: unknown) => {
                      console.error("Error al cargar vehículos:", error);
                      setErrorCarga(
                        "No pudimos cargar los vehículos. Verifica tu conexión e inténtalo de nuevo."
                      );
                    })
                    .finally(() => setCargando(false));
                }}
                className="mt-6 rounded-lg bg-[#D4202C] px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
              >
                {texto.retry}
              </button>
            </div>
          ) : vehiculos.length === 0 ? (
            <div className="rounded-2xl border bg-white p-16 text-center">
              <Car size={45} className="mx-auto text-gray-300" />
              <h3 className="mt-5 text-xl font-bold">
                {texto.noVehicles}
              </h3>
              <p className="mt-2 text-gray-500">
                {texto.noVehiclesDescription}
              </p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rounded-2xl border bg-white p-16 text-center">
              <Search size={45} className="mx-auto text-gray-300" />
              <h3 className="mt-5 text-xl font-bold">
                {texto.noResults}
              </h3>
              <p className="mt-2 text-gray-500">
                {texto.noResultsDescription}
              </p>
              <button
                onClick={limpiarFiltros}
                className="mt-6 rounded-lg bg-[#D4202C] px-6 py-3 text-sm font-bold text-white transition hover:bg-black"
              >
                {texto.clearFilters}
              </button>
            </div>
          ) : (
            <div
              ref={vehiculosListaRef}
              className="scroll-mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-3"
            >
              {vehiculosPaginados.map((vehiculo) => (
                <VehicleCard
                  key={vehiculo.id}
                  vehiculo={vehiculo}
                  idioma={idioma}
                />
              ))}
            </div>
          )}

          {!cargando && filtrados.length > 0 && (
            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-sm text-gray-600">
                {texto.showing} {indiceInicial + 1}-
                {Math.min(indiceInicial + vehiculosPorPagina, filtrados.length)}{" "}
                {texto.of} {filtrados.length} {texto.vehicles}
              </div>

              {totalPaginas > 1 && (
                <nav
                  aria-label={texto.pagination}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => cambiarPagina(paginaSegura - 1)}
                    disabled={paginaSegura === 1}
                    aria-label={texto.previousPage}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-[#D4202C] hover:text-[#D4202C] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {paginasVisibles.map((pagina) => (
                    <button
                      key={pagina}
                      type="button"
                      onClick={() => cambiarPagina(pagina)}
                      aria-current={pagina === paginaSegura ? "page" : undefined}
                      aria-label={`${idioma === "es" ? "Página" : "Page"} ${pagina}`}
                      className={
                        pagina === paginaSegura
                          ? "h-10 min-w-10 rounded-lg bg-[#D4202C] px-3 text-sm font-bold text-white"
                          : "h-10 min-w-10 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:border-[#D4202C] hover:text-[#D4202C]"
                      }
                    >
                      {pagina}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => cambiarPagina(paginaSegura + 1)}
                    disabled={paginaSegura === totalPaginas}
                    aria-label={texto.nextPage}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-[#D4202C] hover:text-[#D4202C] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </section>

      {/* BANNER FINAL */}
      <section className="relative overflow-hidden bg-black">
        <div className="absolute -left-20 top-0 h-full w-40 skew-x-[-14deg] bg-[#D4202C]" />

        <div className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="md:pl-20">
              <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                {texto.finalTitle}
              </h2>

              <p className="mt-5 max-w-xl leading-7 text-gray-400">
                {texto.finalDescription}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Star size={24} className="text-[#D4202C]" />
                <p className="mt-4 text-2xl font-extrabold text-white">
                  {texto.quality}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {texto.selectedVehicles}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <MapPin size={24} className="text-[#D4202C]" />
                <p className="mt-4 text-base font-extrabold leading-6 text-white">
                  {texto.address}
                </p>
                <a
                  href="https://maps.app.goo.gl/BJDbfpozB3ga7jBAA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-gray-400 underline decoration-[#D4202C] underline-offset-4 transition hover:text-white"
                >
                  {texto.viewMaps}
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <PhoneCall size={24} className="text-[#D4202C]" />
                <p className="mt-4 text-xl font-extrabold text-white">
                  {texto.phones}
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-400">
                  <p>
                    {texto.office}{" "}
                    <a
                      href="tel:+18094140217"
                      className="font-semibold text-white transition hover:text-[#D4202C]"
                    >
                      809-414-0217
                    </a>
                  </p>
                  <p>
                    {texto.mobile}{" "}
                    <a
                      href="tel:+18299212615"
                      className="font-semibold text-white transition hover:text-[#D4202C]"
                    >
                      829-921-2615
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-4 border-[#D4202C] bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full"
            />

            <div>
              <p className="font-bold text-white">
                El Bien Amado Rent A Car
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {texto.footerTagline}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} El Bien Amado. {texto.rights}
          </p>
        </div>
      </footer>

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      <a
        href={linkWhatsApp(idioma)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={texto.contactWhatsApp}
        title={texto.whatsappTitle}
        className="fixed bottom-6 right-6 z-[100] flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/25 transition duration-300 hover:scale-110 hover:bg-[#1ebe5d] focus:outline-none focus:ring-4 focus:ring-green-300"
      >
        <MessageCircle size={32} strokeWidth={2.5} />
        <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-red-500" />
      </a>
    </main>
  );
}