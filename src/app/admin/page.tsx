import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  ClipboardList,
  UsersRound,
} from "lucide-react";

const RESUMEN = [
  {
    titulo: "Vehículos",
    descripcion: "Administra el inventario de tu flota.",
    icono: CarFront,
    href: "/admin/vehiculos",
    disponible: true,
    acento: "bg-red-50 text-[#D4202C]",
  },
  {
    titulo: "Clientes",
    descripcion: "La gestión de clientes estará disponible próximamente.",
    icono: UsersRound,
    href: "#",
    disponible: false,
    acento: "bg-blue-50 text-blue-600",
  },
  {
    titulo: "Rentas",
    descripcion: "La gestión de rentas estará disponible próximamente.",
    icono: ClipboardList,
    href: "#",
    disponible: false,
    acento: "bg-amber-50 text-amber-600",
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-9">
          <p className="text-sm font-semibold text-[#D4202C]">
            El Bien Amado Rent A Car
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">
            Panel general
          </h1>
          <p className="mt-2 text-gray-500">
            Administra tu negocio desde un solo lugar.
          </p>
        </div>

        <section
          aria-label="Opciones de administración"
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {RESUMEN.map(
            ({ titulo, descripcion, icono: Icon, href, disponible, acento }) => {
              const contenido = (
                <>
                  <div className="flex items-start justify-between">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${acento}`}>
                      <Icon size={23} />
                    </span>
                    {disponible ? (
                      <ArrowRight
                        size={19}
                        className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#D4202C]"
                      />
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-400">
                        Próximamente
                      </span>
                    )}
                  </div>
                  <h2 className="mt-6 text-lg font-bold text-gray-900">
                    {titulo}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {descripcion}
                  </p>
                </>
              );

              return disponible ? (
                <Link
                  key={titulo}
                  href={href}
                  className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-100 hover:shadow-lg"
                >
                  {contenido}
                </Link>
              ) : (
                <div
                  key={titulo}
                  aria-disabled="true"
                  className="rounded-2xl border border-gray-200 bg-white p-6 opacity-75"
                >
                  {contenido}
                </div>
              );
            }
          )}
        </section>
      </div>
    </main>
  );
}
