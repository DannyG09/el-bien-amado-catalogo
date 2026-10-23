"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileSignature,
  Download,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import AdminPageHeader from "../AdminPageHeader";

type EstadoContrato =
  | "pendiente_firma"
  | "activo"
  | "completado"
  | "cancelado";

type Contrato = {
  id: number;
  moneda: "DOP" | "USD";
  fechaInicio: string;
  fechaFin: string;
  precioDia: number;
  deposito: number;
  total: number;
  pagado: number;
  depositado: number;
  estado: EstadoContrato;
  firmado: boolean;
  nombreCliente: string;
  apellidoCliente: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
};

const ETIQUETA_ESTADO: Record<EstadoContrato, string> = {
  pendiente_firma: "Pendiente de firma",
  activo: "Activo",
  completado: "Completado",
  cancelado: "Cancelado",
};

function formatoMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(monto);
}

export default function ContratosAdminPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroMoneda, setFiltroMoneda] = useState("todas");
  const [filtroFirma, setFiltroFirma] = useState("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const respuesta = await fetch("/api/contratos", { cache: "no-store" });
        const resultado = (await respuesta.json()) as
          | Contrato[]
          | { error?: string };
        if (!respuesta.ok || !Array.isArray(resultado)) {
          throw new Error(
            !Array.isArray(resultado)
              ? resultado.error ?? "No se pudieron cargar los contratos."
              : "No se pudieron cargar los contratos."
          );
        }
        if (!cancelado) setContratos(resultado);
      } catch (errorCarga) {
        console.error("Error al cargar contratos:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudieron cargar los contratos."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");
    return contratos.filter((contrato) => {
      if (filtroEstado !== "todos" && contrato.estado !== filtroEstado) {
        return false;
      }
      if (filtroMoneda !== "todas" && contrato.moneda !== filtroMoneda) {
        return false;
      }
      if (
        (filtroFirma === "firmados" && !contrato.firmado) ||
        (filtroFirma === "pendientes" && contrato.firmado)
      ) {
        return false;
      }
      if (desde && contrato.fechaInicio < desde) return false;
      if (hasta && contrato.fechaInicio > hasta) return false;
      return (
        !texto ||
        `${contrato.nombreCliente} ${contrato.apellidoCliente} ${contrato.marca} ${contrato.modelo} ${contrato.placa ?? ""} ${contrato.id}`
          .toLocaleLowerCase("es")
          .includes(texto)
      );
    });
  }, [
    busqueda,
    contratos,
    desde,
    hasta,
    filtroEstado,
    filtroFirma,
    filtroMoneda,
  ]);

  const activos = contratos.filter(
    (contrato) =>
      contrato.estado === "activo" || contrato.estado === "pendiente_firma"
  );
  const saldoPorMoneda = (["DOP", "USD"] as const).map((codigo) => ({
    moneda: codigo,
    monto: contratos
      .filter(
        (contrato) =>
          contrato.moneda === codigo && contrato.estado !== "cancelado"
      )
      .reduce(
        (suma, contrato) =>
          suma + Math.max(0, contrato.total - contrato.pagado),
        0
      ),
  }));
  const resumenPorMoneda = (["DOP", "USD"] as const).map((codigo) => {
    const contratosMoneda = contratos.filter((item) => item.moneda === codigo);
    return {
      moneda: codigo,
      total: contratosMoneda.reduce((suma, item) => suma + item.total, 0),
      pagado: contratosMoneda.reduce((suma, item) => suma + item.pagado, 0),
    };
  });

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Contratos de renta"
          description={`${activos.length} activos o pendientes · ${contratos.length} contratos en total`}
        >
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/contratos/configuracion"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <Settings2 size={17} />
              Configuración
            </Link>
            <Link
              href="/admin/contratos/nuevo"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/15 hover:bg-[#b81b26]"
            >
              <Plus size={18} />
              Nuevo contrato
            </Link>
          </div>
        </AdminPageHeader>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold text-gray-500">Contratos</p>
            <p className="mt-2 text-xl font-extrabold text-gray-950">{contratos.length}</p>
            <p className="mt-1 text-xs text-gray-500">{activos.length} activos o por firmar</p>
          </div>
          {resumenPorMoneda.map((resumen) => (
            <div
              key={resumen.moneda}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-xs font-bold text-gray-500">
                Total y cobrado · {resumen.moneda}
              </p>
              <p className="mt-2 text-sm font-extrabold text-[#D4202C]">
                Total {formatoMonto(resumen.total, resumen.moneda)}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Cobrado {formatoMonto(resumen.pagado, resumen.moneda)}
              </p>
            </div>
          ))}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold text-gray-500">Saldo de renta pendiente</p>
            <p className="mt-2 text-sm font-extrabold text-[#D4202C]">
              {saldoPorMoneda
                .filter(({ monto }) => monto > 0)
                .map(({ moneda, monto }) => formatoMonto(monto, moneda))
                .join(" · ") || formatoMonto(0, "DOP")}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-gray-100 p-4 sm:grid-cols-2 xl:grid-cols-7">
            <label className="relative block">
              <span className="sr-only">Buscar contratos</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por cliente, vehículo o contrato"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#D4202C] focus:bg-white xl:col-span-2"
              />
            </label>
            <select
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
              aria-label="Filtrar por estado"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-[#D4202C]"
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
            <select
              value={filtroMoneda}
              onChange={(evento) => setFiltroMoneda(evento.target.value)}
              aria-label="Filtrar por moneda"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-[#D4202C]"
            >
              <option value="todas">Todas las monedas</option>
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
            <select
              value={filtroFirma}
              onChange={(evento) => setFiltroFirma(evento.target.value)}
              aria-label="Filtrar por firma"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-[#D4202C]"
            >
              <option value="todas">Todas las firmas</option>
              <option value="firmados">Firmados</option>
              <option value="pendientes">Pendiente de firma</option>
            </select>
            <label className="text-xs font-semibold text-gray-500">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(evento) => setDesde(evento.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
              />
            </label>
            <label className="text-xs font-semibold text-gray-500">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(evento) => setHasta(evento.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
              />
            </label>
          </div>

          {cargando ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Cargando contratos...
            </p>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <FileSignature className="mx-auto text-gray-300" size={34} />
              <p className="mt-3 font-bold text-gray-800">
                {contratos.length
                  ? "No hay contratos para esos filtros."
                  : "Aún no hay contratos registrados."}
              </p>
              {!contratos.length && (
                <Link
                  href="/admin/contratos/nuevo"
                  className="mt-4 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
                >
                  Crear primer contrato
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtrados.map((contrato) => (
                <li
                  key={contrato.id}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-gray-950">
                        {contrato.nombreCliente} {contrato.apellidoCliente}
                      </h2>
                      <span className="text-xs text-gray-400">
                        Contrato #{contrato.id}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {contrato.marca} {contrato.modelo} {contrato.anio}
                      {contrato.placa ? ` · ${contrato.placa}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {contrato.fechaInicio} → {contrato.fechaFin}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-extrabold text-gray-900">
                      {formatoMonto(contrato.total, contrato.moneda)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Pagado: {formatoMonto(contrato.pagado, contrato.moneda)}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      contrato.estado === "activo"
                        ? "bg-emerald-50 text-emerald-700"
                        : contrato.estado === "pendiente_firma"
                          ? "bg-amber-50 text-amber-700"
                          : contrato.estado === "completado"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-50 text-red-700"
                    }`}
                  >
                    {contrato.firmado
                      ? `✓ Firmado · ${ETIQUETA_ESTADO[contrato.estado]}`
                      : `Firma pendiente · ${ETIQUETA_ESTADO[contrato.estado]}`}
                  </span>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/contratos/${contrato.id}`}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      Ver contrato
                    </Link>
                    <a
                      href={`/api/contratos/${contrato.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver PDF del contrato ${contrato.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2.5 text-gray-600 hover:bg-gray-50"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
