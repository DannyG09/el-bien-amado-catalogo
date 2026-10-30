
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Car,
  Calculator,
  Palette,
} from "lucide-react";
import type { Vehiculo } from "../types/vehiculo";
import type { Idioma } from "../lib/idioma";

type VehicleCardProps = {
  vehiculo: Vehiculo;
  idioma: Idioma;
  fechaInicio?: string;
  fechaFin?: string;
};

export default function VehicleCard({
  vehiculo,
  idioma,
  fechaInicio,
  fechaFin,
}: VehicleCardProps) {
  const parametros = new URLSearchParams();

  if (fechaInicio && fechaFin) {
    parametros.set("fechaInicio", fechaInicio);
    parametros.set("fechaFin", fechaFin);
  }

  const consultaFechas =
    parametros.size > 0 ? `?${parametros.toString()}` : "";

  const urlDetalle = `/vehiculos/${vehiculo.id}${consultaFechas}`;
  const urlReserva = `/vehiculos/${vehiculo.id}${consultaFechas}#solicitar-reserva`;

  const texto =
    idioma === "en"
      ? {
          available: "Available",
          unavailable: "Unavailable",
          from: "From",
          perDay: "/ day",
          threeDays: "3-day estimate",
          color: "Color",
          details: "View details",
          reserve: "Book",
        }
      : {
          available: "Disponible",
          unavailable: "No disponible",
          from: "Desde",
          perDay: "/ día",
          threeDays: "Estimado 3 días",
          color: "Color",
          details: "Ver detalles",
          reserve: "Reservar",
        };

  return (
    <article
      className="
        group relative flex h-full flex-col
        overflow-hidden rounded-2xl
        border border-gray-200
        bg-white text-gray-900
        shadow-[0_4px_20px_rgba(0,0,0,0.05)]
        transition-all duration-500 ease-out
        hover:-translate-y-2
        hover:border-[#D4202C]
        hover:shadow-[0_20px_50px_rgba(212,32,44,0.16)]
        motion-reduce:transform-none
        motion-reduce:transition-none
        dark:border-gray-700
        dark:bg-gray-900
        dark:text-white
        dark:hover:border-[#D4202C]
      "
    >
      {/* BARRA SUPERIOR ANIMADA */}
      <div
        className="
          absolute left-0 top-0 z-20
          h-1 w-0 bg-[#D4202C]
          transition-all duration-500
          group-hover:w-full
          motion-reduce:transition-none
        "
      />

      {/* IMAGEN */}
      <div className="relative h-64 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {vehiculo.imagen ? (
          <Image
            src={vehiculo.imagen}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="
              object-cover
              transition-transform duration-700 ease-out
              group-hover:scale-110
              motion-reduce:transform-none
              motion-reduce:transition-none
            "
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Car
              size={65}
              strokeWidth={1}
              className="
                text-gray-300
                transition-all duration-500
                group-hover:scale-110
                group-hover:text-[#D4202C]
                motion-reduce:transform-none
              "
            />
          </div>
        )}

        {/* DEGRADADO SOBRE LA FOTO */}
        <div
          className="
            pointer-events-none absolute inset-0
            bg-gradient-to-t
            from-black/30 via-transparent to-black/10
            opacity-60 transition-opacity duration-500
            group-hover:opacity-100
          "
        />

        {/* DISPONIBILIDAD */}
        <div className="absolute left-4 top-4 z-10">
          <span
            className={
              vehiculo.disponible
                ? "inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-green-700 shadow-lg backdrop-blur-md"
                : "inline-flex items-center gap-2 rounded-full bg-black/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md"
            }
          >
            {vehiculo.disponible && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-50 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}

            {vehiculo.disponible
              ? texto.available
              : texto.unavailable}
          </span>
        </div>

        {/* PRECIO */}
        <div
          className="
            absolute bottom-0 right-0 z-10
            rounded-tl-2xl bg-[#D4202C]
            px-5 py-3 text-white
            shadow-xl
            transition-all duration-300
            group-hover:bg-[#b81b26]
            group-hover:shadow-[0_0_25px_rgba(212,32,44,0.35)]
          "
        >
          <p className="text-[10px] font-medium text-red-100">
            {texto.from}
          </p>

          <p className="text-lg font-extrabold">
            USD${" "}
            {Number(vehiculo.precioDia).toLocaleString(
              idioma === "es" ? "es-DO" : "en-US"
            )}

            <span className="ml-1 text-xs font-normal text-red-100">
              {texto.perDay}
            </span>
          </p>
        </div>
      </div>

      {/* INFORMACIÓN */}
      <div className="flex flex-1 flex-col p-6">
        {/* AÑO */}
        <div className="flex items-center gap-2">
          <span
            className="
              rounded-lg bg-gray-100 px-3 py-1
              text-xs font-bold text-gray-600
              transition-colors duration-300
              group-hover:bg-red-50
              group-hover:text-[#D4202C]
              dark:bg-gray-800 dark:text-gray-300
            "
          >
            {vehiculo.anio}
          </span>
        </div>

        {/* MARCA Y MODELO */}
        <h3
          className="
            mt-3 text-xl font-extrabold tracking-tight
            transition-colors duration-300
            group-hover:text-[#D4202C]
          "
        >
          {vehiculo.marca} {vehiculo.modelo}
        </h3>

        {/* SEPARADOR */}
        <div
          className="
            mt-4 h-px w-full bg-gray-100
            transition-colors duration-300
            group-hover:bg-red-100
            dark:bg-gray-700
          "
        />

        {/* CARACTERÍSTICAS */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* ESTIMADO DE ALQUILER: tarifa diaria x 3, sin cargos adicionales */}
          <div className="rounded-xl border border-transparent bg-gray-50 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-red-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-gray-700 motion-reduce:transform-none">
            <div className="mb-2 flex items-center gap-2">
              <Calculator size={16} className="text-[#D4202C]" />
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {texto.threeDays}
              </p>
            </div>
            <p className="text-sm font-bold">
              USD$ {(Number(vehiculo.precioDia) * 3).toLocaleString(
                idioma === "es" ? "es-DO" : "en-US"
              )}
            </p>
          </div>

          {/* COLOR */}
          <div
            className="
              rounded-xl border border-transparent
              bg-gray-50 p-3
              transition-all duration-300
              hover:-translate-y-1
              hover:border-red-100
              hover:bg-red-50
              dark:bg-gray-800
              dark:hover:bg-gray-700
              motion-reduce:transform-none
            "
          >
            <div className="mb-2 flex items-center gap-2">
              <Palette
                size={16}
                className="text-[#D4202C]"
              />
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {texto.color}
              </p>
            </div>

            <p className="text-sm font-bold">
              {vehiculo.color}
            </p>
          </div>
        </div>

        {/* BOTONES */}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
          {/* VER DETALLES */}
          <Link
            href={urlDetalle}
            className="
              flex w-full items-center justify-center
              gap-2 rounded-xl
              border-2 border-black
              px-2 py-3.5
              text-sm font-bold text-black
              transition-all duration-300
              hover:-translate-y-0.5
              hover:bg-black hover:text-white
              hover:shadow-lg
              active:scale-95
              dark:border-gray-300
              dark:text-gray-100
              dark:hover:bg-gray-100
              dark:hover:text-gray-900
              motion-reduce:transform-none
            "
          >
            {texto.details}

            <ArrowRight
              size={17}
              className="
                transition-transform duration-300
                group-hover:translate-x-1
                motion-reduce:transform-none
              "
            />
          </Link>

          {/* RESERVAR */}
          {vehiculo.disponible ? (
            <Link
              href={urlReserva}
              className="
                flex w-full items-center justify-center
                gap-2 rounded-xl
                bg-[#D4202C]
                px-2 py-3.5
                text-sm font-bold text-white
                shadow-md shadow-red-900/10
                transition-all duration-300
                hover:-translate-y-0.5
                hover:bg-[#b81b26]
                hover:shadow-[0_8px_25px_rgba(212,32,44,0.3)]
                active:scale-95
                motion-reduce:transform-none
              "
            >
              <CalendarDays
                size={18}
                className="
                  transition-transform duration-300
                  group-hover:rotate-[-8deg]
                  motion-reduce:transform-none
                "
              />

              {texto.reserve}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="
                w-full cursor-not-allowed
                rounded-xl bg-gray-100
                px-2 py-3.5
                text-sm font-bold text-gray-400
                dark:bg-gray-800
                dark:text-gray-500
              "
            >
              {texto.unavailable}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
