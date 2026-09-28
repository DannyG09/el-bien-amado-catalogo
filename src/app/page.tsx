"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

/*
  PALETA DEL LOGO
  Negro   -> bg-black
  Rojo    -> #D4202C  (usado como bg-[#D4202C], text-[#D4202C])
  Blanco  -> bg-white

  LOGO: guarda tu imagen en  /public/logo.jpeg
*/

const WHATSAPP_NUMERO = "18299212615";
const MENSAJE_BASE =
  "Hola, quiero agendar un vehículo. Me gustaría recibir información sobre disponibilidad y precios.";

function linkWhatsApp(vehiculo?: { marca: string; modelo: string; anio: number }) {
  const mensaje = vehiculo
    ? `${MENSAJE_BASE} Me interesa el ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}.`
    : MENSAJE_BASE;
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

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

export default function Home() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerVehiculos();
  }, []);

  async function obtenerVehiculos() {
    try {
      const response = await fetch("/api/vehiculos");
      if (!response.ok) throw new Error("Error al obtener vehículos");
      const data = await response.json();
      setVehiculos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* NAVBAR */}
      <nav className="absolute left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#inicio" className="flex items-center gap-3 text-white">
            <img
              src="/logo.jpeg"
              alt="El Bien Amado Rent A Car"
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
              ["#inicio", "Inicio"],
              ["#vehiculos", "Vehículos"],
              ["#servicios", "Servicios"],
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

          <a
            href={linkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#D4202C] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#b81b26]"
          >
            Reservar ahora
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="inicio"
        className="relative flex min-h-[760px] items-center overflow-hidden bg-black"
      >
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2000&q=85"
            alt="Vehículo premium"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/10" />
          {/* Franja roja diagonal, eco del escudo del logo */}
          <div className="absolute -right-40 top-0 h-full w-72 skew-x-[-14deg] bg-[#D4202C]/90 hidden lg:block" />
          <div className="absolute -right-10 top-0 h-full w-6 skew-x-[-14deg] bg-white/90 hidden lg:block" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pt-28 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4202C]/60 bg-[#D4202C]/15 px-4 py-2 text-sm font-medium text-white backdrop-blur">
              <CheckCircle2 size={16} className="text-[#D4202C]" />
              Vehículos disponibles para reservar
            </div>

            <h2 className="text-5xl font-extrabold leading-[1.03] tracking-tight text-white md:text-7xl">
              Muévete con
              <br />
              libertad y confianza.
            </h2>

            <div className="mt-6 h-1.5 w-24 rounded-full bg-[#D4202C]" />

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Alquila el vehículo que necesitas para tus viajes, negocios y
              momentos especiales. Sencillo, seguro y sin complicaciones.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#vehiculos"
                className="group flex items-center gap-2 rounded-lg bg-[#D4202C] px-7 py-4 font-bold text-white shadow-xl shadow-red-900/40 transition hover:bg-[#b81b26]"
              >
                Ver nuestra flota
                <ArrowRight
                  size={19}
                  className="transition group-hover:translate-x-1"
                />
              </a>

              <a
                href="#servicios"
                className="rounded-lg border border-white/40 px-7 py-4 font-semibold text-white transition hover:bg-white hover:text-black"
              >
                ¿Por qué elegirnos?
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 border-t border-white/15 pt-7">
              {[
                [ShieldCheck, "Alquiler seguro", "Opciones de seguro"],
                [CalendarDays, "Fechas flexibles", "Opciones de extensión"],
                [Headphones, "Atención personalizada", "Estamos para ayudarte"],
              ].map(([Icon, titulo, sub]: any) => (
                <div key={titulo} className="flex items-center gap-3">
                  <Icon size={22} className="text-[#D4202C]" />
                  <div>
                    <p className="text-sm font-semibold text-white">{titulo}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LOGO GRANDE */}
          <div className="hidden justify-center lg:flex">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full border border-white/20" />
              <img
                src="/logo.jpeg"
                alt="Logo El Bien Amado Rent A Car"
                className="relative h-80 w-80 rounded-full shadow-2xl shadow-black ring-4 ring-[#D4202C]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            [ShieldCheck, "Seguridad y confianza", "Vehículos preparados para ofrecerte una experiencia de alquiler segura."],
            [CalendarDays, "Alquiler flexible", "Elige tus fechas y consulta la posibilidad de extender tu alquiler."],
            [Headphones, "Atención personalizada", "Te acompañamos durante todo el proceso de alquiler."],
          ].map(([Icon, titulo, texto]: any) => (
            <div key={titulo} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                <Icon size={23} />
              </div>
              <div>
                <h3 className="font-bold">{titulo}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">{texto}</p>
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
              <p className="text-sm font-bold text-[#D4202C]">Nuestra flota</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
                Encuentra tu próximo vehículo
              </h2>
              <p className="mt-4 max-w-2xl text-gray-500">
                Explora nuestra selección y encuentra la opción ideal para tu
                próximo viaje.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <CheckCircle2 size={18} className="text-[#D4202C]" />
              {vehiculos.filter((v) => v.disponible).length} vehículos disponibles
            </div>
          </div>

          {cargando ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[470px] animate-pulse rounded-2xl bg-gray-200"
                />
              ))}
            </div>
          ) : vehiculos.length === 0 ? (
            <div className="rounded-2xl border bg-white p-16 text-center">
              <Car size={45} className="mx-auto text-gray-300" />
              <h3 className="mt-5 text-xl font-bold">No hay vehículos registrados</h3>
              <p className="mt-2 text-gray-500">
                Actualmente no hay vehículos disponibles en el catálogo.
              </p>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {vehiculos.map((vehiculo) => (
                <article
                  key={vehiculo.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-[#D4202C] hover:shadow-2xl"
                >
                  <div className="relative overflow-hidden">
                    {vehiculo.imagen ? (
                      <img
                        src={vehiculo.imagen}
                        alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                        className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center bg-gray-100">
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
                        {vehiculo.disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>

                    <div className="absolute bottom-0 right-0 rounded-tl-2xl bg-[#D4202C] px-5 py-3 text-white">
                      <p className="text-[10px] text-red-100">Desde</p>
                      <p className="font-extrabold">
                        RD$ {Number(vehiculo.precioDia).toLocaleString("es-DO")}
                        <span className="ml-1 text-xs font-normal text-red-100">
                          / día
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-xs font-semibold text-gray-400">
                      {vehiculo.anio}
                    </p>
                    <h3 className="mt-1 text-xl font-extrabold">
                      {vehiculo.marca} {vehiculo.modelo}
                    </h3>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-[11px] text-gray-400">Seguro</p>
                        <p className="mt-1 text-sm font-semibold">
                          {vehiculo.tipoSeguro}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-[11px] text-gray-400">Color</p>
                        <p className="mt-1 text-sm font-semibold">
                          {vehiculo.color}
                        </p>
                      </div>
                    </div>

                    {vehiculo.disponible ? (
                      <a
                        href={linkWhatsApp(vehiculo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4202C] py-3.5 text-sm font-bold text-white transition hover:bg-black"
                      >
                        <MessageCircle size={18} />
                        Reservar por WhatsApp
                      </a>
                    ) : (
                      <button
                        disabled
                        className="mt-6 w-full cursor-not-allowed rounded-lg bg-gray-100 py-3.5 text-sm font-bold text-gray-400"
                      >
                        No disponible
                      </button>
                    )}
                  </div>
                </article>
              ))}
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
                Tu viaje.
                <br />
                Nuestro compromiso.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-gray-400">
                Queremos que alquilar un vehículo sea una experiencia sencilla
                desde el primer momento hasta la devolución.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <Star size={24} className="text-[#D4202C]" />
                <p className="mt-4 text-2xl font-extrabold text-white">Calidad</p>
                <p className="mt-1 text-sm text-gray-500">Vehículos seleccionados</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <MapPin size={24} className="text-[#D4202C]" />
                <p className="mt-4 text-2xl font-extrabold text-white">RD</p>
                <p className="mt-1 text-sm text-gray-500">Servicio local</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-4 border-[#D4202C] bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="" className="h-12 w-12 rounded-full" />
            <div>
              <p className="font-bold text-white">El Bien Amado Rent A Car</p>
              <p className="mt-1 text-sm text-gray-500">
                Tu próximo viaje comienza aquí.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} El Bien Amado. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}