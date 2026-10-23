"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  Plus,
  Upload,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "../../AdminPageHeader";

type Pago = {
  id: number;
  tipo: "renta" | "deposito";
  monto: number;
  metodo: string;
  fecha: string;
  referencia: string | null;
  notas: string | null;
};

type Contrato = {
  id: number;
  clienteId: number;
  vehiculoId: number;
  moneda: "DOP" | "USD";
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  precioDia: number;
  deposito: number;
  tipoDescuento: string;
  valorDescuento: number;
  total: number;
  pagado: number;
  depositado: number;
  saldo: number;
  lugarEntrega: string | null;
  lugarDevolucion: string | null;
  notas: string | null;
  estado: "pendiente_firma" | "activo" | "completado" | "cancelado";
  firmadoEn: string | null;
  tieneFirma: boolean;
  nombreCliente: string;
  apellidoCliente: string;
  cedula: string;
  whatsapp: string | null;
  telefono: string | null;
  email: string | null;
  marca: string;
  modelo: string;
  anio: number;
  placa: string | null;
  pagos: Pago[];
};

const CAMPO =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D4202C]";
const FECHA_HOY = (() => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
})();

function moneda(valor: number, codigo: string) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: codigo,
    maximumFractionDigits: 2,
  }).format(valor);
}

export default function ContratoDetallePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [archivoFirma, setArchivoFirma] = useState<File | null>(null);
  const [tipoPago, setTipoPago] = useState<"renta" | "deposito">("renta");
  const [montoPago, setMontoPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [fechaPago, setFechaPago] = useState(FECHA_HOY);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [notasPago, setNotasPago] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const obtenerContrato = useCallback(async () => {
    const respuesta = await fetch(`/api/contratos/${id}`, {
      cache: "no-store",
    });
    const resultado = (await respuesta.json()) as Contrato | { error?: string };
    if (!respuesta.ok || !("id" in resultado)) {
      throw new Error(
        "error" in resultado
          ? resultado.error ?? "No se pudo cargar el contrato."
          : "No se pudo cargar el contrato."
      );
    }
    return resultado;
  }, [id]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const resultado = await obtenerContrato();
        if (!cancelado) {
          setContrato(resultado);
          setError("");
        }
      } catch (errorCarga) {
        console.error("Error al cargar contrato:", errorCarga);
        if (!cancelado) {
          setError(
            errorCarga instanceof Error
              ? errorCarga.message
              : "No se pudo cargar el contrato."
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
  }, [obtenerContrato]);

  async function recargarContrato() {
    const resultado = await obtenerContrato();
    setContrato(resultado);
    setError("");
  }

  async function registrarFirma(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivoFirma || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const formulario = new FormData();
      formulario.set("firma", archivoFirma);
      const respuesta = await fetch(`/api/contratos/${id}/firma`, {
        method: "POST",
        body: formulario,
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo registrar la firma.");
      }
      setArchivoFirma(null);
      setMensaje("Firma registrada. El contrato está activo y el vehículo rentado.");
      await recargarContrato();
    } catch (errorFirma) {
      console.error("Error al registrar firma del contrato:", errorFirma);
      setError(
        errorFirma instanceof Error
          ? errorFirma.message
          : "No se pudo registrar la firma."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function registrarPago(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!contrato || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/contratos/${id}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoPago,
          monto: montoPago,
          metodo: metodoPago,
          fecha: fechaPago,
          referencia: referenciaPago,
          notas: notasPago,
        }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo registrar el pago.");
      }
      setMontoPago("");
      setReferenciaPago("");
      setNotasPago("");
      setMensaje("Pago registrado correctamente.");
      await recargarContrato();
    } catch (errorPago) {
      console.error("Error al registrar pago del contrato:", errorPago);
      setError(
        errorPago instanceof Error
          ? errorPago.message
          : "No se pudo registrar el pago."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(estado: "completado" | "cancelado") {
    if (!contrato || guardando) return;
    const accion = estado === "cancelado" ? "cancelar" : "completar";
    if (
      !window.confirm(
        `¿Deseas ${accion} el contrato #${contrato.id}? ${
          estado === "cancelado"
            ? "El vehículo se liberará si todavía está reservado o rentado."
            : "El vehículo volverá a estar disponible."
        }`
      )
    ) {
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/contratos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo actualizar el contrato.");
      }
      setMensaje("El estado del contrato se actualizó y se liberó el vehículo.");
      await recargarContrato();
    } catch (errorEstado) {
      console.error("Error al actualizar el estado del contrato:", errorEstado);
      setError(
        errorEstado instanceof Error
          ? errorEstado.message
          : "No se pudo actualizar el contrato."
      );
    } finally {
      setGuardando(false);
    }
  }

  const saldoDeposito = contrato
    ? Math.max(0, contrato.deposito - contrato.depositado)
    : 0;

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title={contrato ? `Contrato #${contrato.id}` : "Contrato"}
          description={
            contrato
              ? `${contrato.nombreCliente} ${contrato.apellidoCliente} · ${contrato.marca} ${contrato.modelo}`
              : "Detalle, pagos y firma del contrato."
          }
        >
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/contratos"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              Contratos
            </Link>
            {contrato && (
              <a
                href={`/api/contratos/${id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <Download size={16} />
                Ver PDF
              </a>
            )}
          </div>
        </AdminPageHeader>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {mensaje && (
          <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            {mensaje}
          </p>
        )}
        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando contrato...
          </p>
        ) : contrato ? (
          <div className="space-y-5">
            <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Estado</p>
                <p className="mt-1 font-extrabold text-gray-950">
                  {contrato.estado.replaceAll("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Total renta</p>
                <p className="mt-1 font-extrabold text-gray-950">
                  {moneda(contrato.total, contrato.moneda)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Saldo renta</p>
                <p className="mt-1 font-extrabold text-[#D4202C]">
                  {moneda(contrato.saldo, contrato.moneda)}
                </p>
              </div>
              <div className="sm:col-span-3">
                <p className="text-sm font-semibold text-gray-800">
                  {contrato.fechaInicio} {contrato.horaEntrega} → {contrato.fechaFin}{" "}
                  {contrato.horaDevolucion}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {contrato.marca} {contrato.modelo} {contrato.anio}
                  {contrato.placa ? ` · ${contrato.placa}` : ""}
                  {" · "}Depósito {moneda(contrato.deposito, contrato.moneda)}
                  {" · "}Pendiente depósito {moneda(saldoDeposito, contrato.moneda)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Cliente:{" "}
                  <Link
                    href={`/admin/clientes/${contrato.clienteId}`}
                    className="font-semibold text-[#D4202C] hover:underline"
                  >
                    {contrato.nombreCliente} {contrato.apellidoCliente}
                  </Link>
                  {" · "}Cédula {contrato.cedula}
                  {contrato.whatsapp ? ` · WhatsApp ${contrato.whatsapp}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-3">
                {contrato.estado === "pendiente_firma" && (
                  <Link
                    href={`/admin/contratos/${id}/editar`}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Editar contrato
                  </Link>
                )}
                {contrato.estado === "activo" && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void cambiarEstado("completado")}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={16} />
                    Completar y liberar vehículo
                  </button>
                )}
                {(contrato.estado === "pendiente_firma" ||
                  contrato.estado === "activo") && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void cambiarEstado("cancelado")}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Cancelar contrato
                  </button>
                )}
              </div>
            </section>

            {contrato.estado === "pendiente_firma" && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <h2 className="font-extrabold text-amber-950">
                  Firma presencial pendiente
                </h2>
                <p className="mt-1 text-sm text-amber-900">
                  Después de firmar en papel, carga una foto o escaneo de la firma.
                  Al registrarla, el contrato se activa y el vehículo pasa a rentado.
                </p>
                <form
                  onSubmit={registrarFirma}
                  className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <label className="flex-1 text-sm font-semibold text-gray-700">
                    Firma del cliente (PNG o JPG, máximo 8 MB) *
                    <input
                      required
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(evento) =>
                        setArchivoFirma(evento.target.files?.[0] ?? null)
                      }
                      className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-bold`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!archivoFirma || guardando}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {guardando ? "Guardando..." : "Registrar firma"}
                  </button>
                </form>
              </section>
            )}

            {(contrato.estado === "pendiente_firma" ||
              contrato.estado === "activo") && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-extrabold text-gray-950">Registrar pago</h2>
                <form
                  onSubmit={registrarPago}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <label className="text-sm font-semibold text-gray-700">
                    Aplicar a
                    <select
                      value={tipoPago}
                      onChange={(evento) =>
                        setTipoPago(evento.target.value as "renta" | "deposito")
                      }
                      className={CAMPO}
                    >
                      <option value="renta">Renta · saldo {moneda(contrato.saldo, contrato.moneda)}</option>
                      <option value="deposito">
                        Depósito · saldo {moneda(saldoDeposito, contrato.moneda)}
                      </option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Monto ({contrato.moneda}) *
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={montoPago}
                      onChange={(evento) => setMontoPago(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Método *
                    <select
                      value={metodoPago}
                      onChange={(evento) => setMetodoPago(evento.target.value)}
                      className={CAMPO}
                    >
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Tarjeta</option>
                      <option>Depósito bancario</option>
                      <option>Otro</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Fecha *
                    <input
                      required
                      type="date"
                      value={fechaPago}
                      onChange={(evento) => setFechaPago(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Referencia
                    <input
                      maxLength={255}
                      value={referenciaPago}
                      onChange={(evento) => setReferenciaPago(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Notas
                    <input
                      maxLength={2000}
                      value={notasPago}
                      onChange={(evento) => setNotasPago(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <button
                      type="submit"
                      disabled={guardando}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-4 py-3 text-sm font-bold text-white hover:bg-[#b81b26] disabled:opacity-50"
                    >
                      <Plus size={16} />
                      {guardando ? "Guardando..." : "Guardar pago"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-extrabold text-gray-950">Historial de pagos</h2>
              {contrato.pagos.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">
                  Todavía no se han registrado pagos.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {contrato.pagos.map((pago) => (
                    <li
                      key={pago.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span className="text-gray-600">
                        {pago.fecha} · {pago.tipo} · {pago.metodo}
                        {pago.referencia ? ` · ${pago.referencia}` : ""}
                      </span>
                      <span className="font-bold text-gray-900">
                        {moneda(pago.monto, contrato.moneda)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
