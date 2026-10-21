"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CarFront,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UsersRound,
  ArrowUpRight,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Panel general",
    href: "/admin",
    icon: LayoutDashboard,
    available: true,
  },
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
    available: false,
  },
  {
    label: "Rentas",
    href: "/admin/rentas",
    icon: ClipboardList,
    available: false,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="z-20 w-full shrink-0 border-b border-gray-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
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
            <p className="truncate text-sm font-extrabold text-gray-950">
              El Bien <span className="text-[#D4202C]">Amado</span>
            </p>
            <p className="mt-1 text-[10px] font-bold tracking-[0.22em] text-gray-400">
              ADMINISTRACIÓN
            </p>
          </div>
        </div>

        <div className="hidden px-6 pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 lg:block">
          Menú principal
        </div>

        <nav
          aria-label="Navegación administrativa"
          className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-4"
        >
          {NAV_ITEMS.map(({ label, href, icon: Icon, available }) => {
            const activo =
              available &&
              (href === "/admin"
                ? pathname === href
                : pathname.startsWith(href));
            const className = `flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
              activo
                ? "bg-red-50 text-[#C51D28] ring-1 ring-red-100"
                : available
                  ? "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                  : "cursor-not-allowed text-gray-400"
            }`;
            const contenido = (
              <>
                <Icon
                  size={19}
                  strokeWidth={activo ? 2.5 : 2}
                  className={activo ? "text-[#D4202C]" : ""}
                />
                <span>{label}</span>
                {!available && (
                  <span className="ml-auto hidden rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400 lg:inline">
                    Pronto
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
        </nav>

        <div className="hidden border-t border-gray-100 p-4 lg:block">
          <Link
            href="/"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
          >
            <ArrowUpRight size={19} />
            Ver sitio público
          </Link>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-500 transition hover:bg-red-50 hover:text-[#C51D28]"
            >
              <LogOut size={19} />
              Cerrar sesión
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 lg:hidden">
          <Link
            href="/"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900"
          >
            Ver sitio público
          </Link>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#C51D28]"
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
