import Image from "next/image";
import { ArrowRight, CalendarDays, Car } from "lucide-react";
import type { Vehiculo } from "../types/vehiculo";
import { traducirTipoSeguro, type Idioma } from "../lib/idioma";

type VehicleCardProps = {
  vehiculo: Vehiculo;
  idioma: Idioma;
};

export default function VehicleCard({ vehiculo, idioma }: VehicleCardProps) {
  const texto =
    idioma === "en"
      ? {
          available: "Available",
          unavailable: "Unavailable",
          from: "From",
          perDay: "/ day",
          insurance: "Insurance",
          color: "Color",
          details: "View details",
          reserve: "Book",
        }
      : {
          available: "Disponible",
          unavailable: "No disponible",
          from: "Desde",
          perDay: "/ día",
          insurance: "Seguro",
          color: "Color",
          details: "Ver detalles",
          reserve: "Reservar",
        };

  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-[#D4202C] hover:shadow-2xl">
      <div className="relative h-64 overflow-hidden">
        {vehiculo.imagen ? (
          <Image
            src={vehiculo.imagen}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <Car size={65} strokeWidth={1} className="text-gray-300" />
          </div>
        )}

        <div className="absolute left-4 top-4">
          <span
            className={
              vehiculo.disponible
                ? "flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-green-700 shadow-lg backdrop-blur"
                : "rounded-full bg-black/80 px-3 py-1.5 text-xs font-bold text-white"
            }
          >
            {vehiculo.disponible && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
            {vehiculo.disponible ? texto.available : texto.unavailable}
          </span>
        </div>

        <div className="absolute bottom-0 right-0 rounded-tl-2xl bg-[#D4202C] px-5 py-3 text-white">
          <p className="text-[10px] text-red-100">{texto.from}</p>
          <p className="font-extrabold">
            USD$ {Number(vehiculo.precioDia).toLocaleString(idioma === "es" ? "es-DO" : "en-US")}
            <span className="ml-1 text-xs font-normal text-red-100">
              {texto.perDay}
            </span>
          </p>
        </div>
      </div>

      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400">{vehiculo.anio}</p>
        <h3 className="mt-1 text-xl font-extrabold">
          {vehiculo.marca} {vehiculo.modelo}
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] text-gray-400">{texto.insurance}</p>
            <p className="mt-1 text-sm font-semibold">{traducirTipoSeguro(vehiculo.tipoSeguro, idioma)}</p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] text-gray-400">{texto.color}</p>
            <p className="mt-1 text-sm font-semibold">{vehiculo.color}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a
            href={`/vehiculos/${vehiculo.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-black px-2 py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white dark:border-gray-300 dark:text-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-900"
          >
            {texto.details}
            <ArrowRight size={17} />
          </a>

          {vehiculo.disponible ? (
            <a
              href={`/vehiculos/${vehiculo.id}#solicitar-reserva`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4202C] px-2 py-3.5 text-sm font-bold text-white transition hover:bg-black"
            >
              <CalendarDays size={18} />
              {texto.reserve}
            </a>
          ) : (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-gray-100 px-2 py-3.5 text-sm font-bold text-gray-400"
            >
              {texto.unavailable}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
