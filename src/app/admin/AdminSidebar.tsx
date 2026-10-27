"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CarFront,
  LayoutDashboard,
  LogOut,
  UsersRound,
  ArrowUpRight,
  Wrench,
  WalletCards,
  FileSignature,
  CalendarDays,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        available: true,
      },
    ],
  },
  {
    label: "Procesos",
    items: [
      {
        label: "Vehículos",
        href: "/admin/vehiculos",
        icon: CarFront,
        available: true,
      },
      {
        label: "Clientes",
        href: "/admin/clientes",
        icon: UsersRound,
        available: true,
      },
      {
        label: "Contratos",
        href: "/admin/contratos",
        icon: FileSignature,
        available: true,
      },
      {
        label: "Reservas",
        href: "/admin/reservas",
        icon: CalendarDays,
        available: true,
      },
      {
        label: "Pagos",
        href: "/admin/gastos-recurrentes",
        icon: WalletCards,
        available: true,
      },
    ],
  },
  {
    label: "Operaciones",
    items: [
      {
        label: "Mantenimiento",
        href: "/admin/mantenimiento",
        icon: Wrench,
        available: true,
      },
      {
        label: "Multas y daño",
        href: "/admin/multas-danos",
        icon: AlertTriangle,
        available: true,
      },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="z-20 w-full shrink-0 border-b border-gray-800 bg-[#111214] text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <Image
            src="/logo.jpeg"
            alt="El Bien Amado Rent A Car"
            width={48}
            height={48}
            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-[#D4202C]/20"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">
              El Bien <span className="text-red-400">Amado</span>
            </p>
            <p className="mt-1 text-[10px] font-bold tracking-[0.22em] text-gray-400">
              PANEL DE ADMINISTRACIÓN
            </p>
          </div>
        </div>

        <div className="hidden px-6 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 lg:block">
          Espacio de trabajo
        </div>

        <nav
          aria-label="Navegación administrativa"
          className="flex gap-5 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:px-4"
        >
          {NAV_GROUPS.map(({ label: grupo, items }) => (
            <section key={grupo} className="shrink-0 lg:w-full">
              <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {grupo}
              </h2>
              <div className="flex gap-1 lg:flex-col">
                {items.map(({ label, href, icon: Icon, available }) => {
                  const activo =
                    available &&
                    (href === "/admin"
                      ? pathname === href
                      : pathname.startsWith(href));
                  const className = `flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activo
                      ? "bg-[#D4202C] text-white shadow-lg shadow-red-950/30"
                      : available
                        ? "text-gray-300 hover:bg-white/10 hover:text-white"
                        : "cursor-not-allowed text-gray-600"
                  }`;
                  const contenido = (
                    <>
                      <Icon
                        size={19}
                        strokeWidth={activo ? 2.5 : 2}
                        className={activo ? "text-white" : ""}
                      />
                      <span>{label}</span>
                      {!available && (
                        <span className="ml-auto hidden rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400 lg:inline">
                          Próximamente
                        </span>
                      )}
                    </>
                  );

                  return available ? (
                    <Link
                      key={href}
                      href={href}
                      aria-current={activo ? "page" : undefined}
                      className={className}
                    >
                      {contenido}
                    </Link>
                  ) : (
                    <span key={href} aria-disabled="true" className={className}>
                      {contenido}
                    </span>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-4 lg:block">
          <Link
            href="/"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowUpRight size={19} />
            Ver sitio público
          </Link>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-400 transition hover:bg-white/10 hover:text-red-300"
            >
              <LogOut size={19} />
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 lg:hidden">
          <Link
            href="/"
            className="text-xs font-semibold text-gray-300 hover:text-white"
          >
            Ver sitio público
          </Link>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-red-300"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
