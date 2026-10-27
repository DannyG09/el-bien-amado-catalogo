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

type Extension = {
  id: number;
  fechaFinAnterior: string;
  fechaFinNueva: string;
  horaDevolucion: string;
  montoAdicional: number;
  estado: "pendiente_aprobacion" | "aprobada" | "rechazada";
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

function sumarDia(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return `${siguiente.getUTCFullYear()}-${String(
    siguiente.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(siguiente.getUTCDate()).padStart(2, "0")}`;
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
  const [extensiones, setExtensiones] = useState<Extension[]>([]);
  const [fechaFinNueva, setFechaFinNueva] = useState("");
  const [horaDevolucionNueva, setHoraDevolucionNueva] = useState("09:00");
  const [notasExtension, setNotasExtension] = useState("");
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

  const obtenerExtensiones = useCallback(async () => {
    const respuesta = await fetch(`/api/contratos/${id}/extensiones`, {
      cache: "no-store",
    });
    const resultado = (await respuesta.json()) as
      | Extension[]
      | { error?: string };
    if (!respuesta.ok || !Array.isArray(resultado)) {
      throw new Error(
        !Array.isArray(resultado)
          ? resultado.error ?? "No se pudieron cargar las extensiones."
          : "No se pudieron cargar las extensiones."
      );
    }
    return resultado;
  }, [id]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const [resultado, resultadoExtensiones] = await Promise.all([
          obtenerContrato(),
          obtenerExtensiones(),
        ]);
        if (!cancelado) {
          setContrato(resultado);
          setExtensiones(resultadoExtensiones);
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
  }, [obtenerContrato, obtenerExtensiones]);

  async function recargarContrato() {
    const [resultado, resultadoExtensiones] = await Promise.all([
      obtenerContrato(),
      obtenerExtensiones(),
    ]);
    setContrato(resultado);
    setExtensiones(resultadoExtensiones);
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
      setMensaje(
        "Firma registrada. El contrato está activo y bloquea el vehículo durante las fechas de renta."
      );
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
            ? "El vehículo dejará de estar bloqueado durante este período."
            : "El contrato dejará de bloquear su rango de fechas."
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
      setMensaje("El estado del contrato se actualizó.");
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

  const fechaFinVigente =
    extensiones
      .filter((extension) => extension.estado === "aprobada")
      .reduce(
        (fecha, extension) =>
          extension.fechaFinNueva > fecha ? extension.fechaFinNueva : fecha,
        contrato?.fechaFin ?? ""
      ) || contrato?.fechaFin || "";
  const fechaMinimaExtension = fechaFinVigente
    ? sumarDia(fechaFinVigente)
    : "";
  const montoEstimadoExtension =
    contrato && fechaFinNueva && fechaFinNueva > fechaFinVigente
      ? Math.round(
          ((new Date(`${fechaFinNueva}T00:00:00Z`).getTime() -
            new Date(`${fechaFinVigente}T00:00:00Z`).getTime()) /
            86_400_000) *
            contrato.precioDia *
            100
        ) / 100
      : null;

  async function registrarExtension(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!contrato || guardando) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`/api/contratos/${id}/extensiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaFinNueva,
          horaDevolucion: horaDevolucionNueva,
          notas: notasExtension,
        }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo registrar la extensión.");
      }
      setFechaFinNueva("");
      setNotasExtension("");
      setMensaje("Extensión registrada y pendiente de aprobación del cliente.");
      await recargarContrato();
    } catch (errorExtension) {
      console.error("Error al registrar extensión:", errorExtension);
      setError(
        errorExtension instanceof Error
          ? errorExtension.message
          : "No se pudo registrar la extensión."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function responderExtension(
    extension: Extension,
    estado: "aprobada" | "rechazada"
  ) {
    if (guardando) return;
    if (
      estado === "aprobada" &&
      !window.confirm(
        "Confirma únicamente si el cliente ya aceptó esta extensión. ¿Deseas aprobarla?"
      )
    ) {
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/contratos/${id}/extensiones/${extension.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado,
            confirmacionCliente: estado === "aprobada",
          }),
        }
      );
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo responder la extensión.");
      }
      setMensaje(
        estado === "aprobada"
          ? "Extensión aprobada. La fecha de devolución se actualizó."
          : "Extensión rechazada."
      );
      await recargarContrato();
    } catch (errorExtension) {
      console.error("Error al responder extensión:", errorExtension);
      setError(
        errorExtension instanceof Error
          ? errorExtension.message
          : "No se pudo responder la extensión."
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
                  {contrato.fechaInicio} {contrato.horaEntrega} → {fechaFinVigente}{" "}
                  {extensiones.find(
                    (extension) =>
                      extension.estado === "aprobada" &&
                      extension.fechaFinNueva === fechaFinVigente
                  )?.horaDevolucion ?? contrato.horaDevolucion}
                  {fechaFinVigente !== contrato.fechaFin && (
                    <span className="ml-2 text-xs font-semibold text-emerald-700">
                      Fecha extendida; el contrato firmado original se conserva.
                    </span>
                  )}
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
                    Completar contrato
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
                  Al registrarla, el contrato se activa y bloquea el vehículo durante las fechas indicadas.
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

            {contrato.estado === "activo" && (
              <section className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-extrabold text-gray-950">Extender alquiler</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Registra una propuesta para prolongar el contrato. La extensión no cambia el documento firmado ni entra en vigor hasta confirmar que el cliente la aceptó.
                </p>
                <form
                  onSubmit={registrarExtension}
                  className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <label className="text-sm font-semibold text-gray-700">
                    Nueva fecha de devolución *
                    <input
                      required
                      type="date"
                      min={fechaMinimaExtension}
                      value={fechaFinNueva}
                      onChange={(evento) => setFechaFinNueva(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  {montoEstimadoExtension !== null && (
                    <p className="self-end pb-2 text-sm text-gray-600">
                      Cargo adicional estimado: {moneda(montoEstimadoExtension, contrato.moneda)}
                    </p>
                  )}
                  <label className="text-sm font-semibold text-gray-700">
                    Hora de devolución *
                    <input
                      required
                      type="time"
                      value={horaDevolucionNueva}
                      onChange={(evento) =>
                        setHoraDevolucionNueva(evento.target.value)
                      }
                      className={CAMPO}
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    Notas
                    <input
                      maxLength={2000}
                      value={notasExtension}
                      onChange={(evento) => setNotasExtension(evento.target.value)}
                      className={CAMPO}
                    />
                  </label>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <button
                      type="submit"
                      disabled={
                        guardando ||
                        extensiones.some(
                          (extension) =>
                            extension.estado === "pendiente_aprobacion"
                        )
                      }
                      className="rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-50"
                    >
                      {guardando ? "Guardando..." : "Registrar propuesta de extensión"}
                    </button>
                  </div>
                </form>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-bold text-gray-900">
                    Historial de extensiones
                  </h3>
                  {extensiones.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      Sin extensiones registradas.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-gray-100">
                      {extensiones.map((extension) => (
                        <li
                          key={extension.id}
                          className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {extension.fechaFinAnterior} → {extension.fechaFinNueva} · {extension.horaDevolucion}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Cargo adicional: {moneda(extension.montoAdicional, contrato.moneda)}
                              {extension.notas ? ` · ${extension.notas}` : ""}
                            </p>
                            <span
                              className={
                                extension.estado === "aprobada"
                                  ? "mt-1 inline-block text-xs font-bold text-emerald-700"
                                  : extension.estado === "rechazada"
                                    ? "mt-1 inline-block text-xs font-bold text-gray-500"
                                    : "mt-1 inline-block text-xs font-bold text-amber-700"
                              }
                            >
                              {extension.estado === "aprobada"
                                ? "Aprobada"
                                : extension.estado === "rechazada"
                                  ? "Rechazada"
                                  : "Pendiente de aprobación"}
                            </span>
                          </div>
                          {extension.estado === "pendiente_aprobacion" && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={guardando}
                                onClick={() =>
                                  void responderExtension(extension, "aprobada")
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Cliente aceptó
                              </button>
                              <button
                                type="button"
                                disabled={guardando}
                                onClick={() =>
                                  void responderExtension(extension, "rechazada")
                                }
                                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Rechazar
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
