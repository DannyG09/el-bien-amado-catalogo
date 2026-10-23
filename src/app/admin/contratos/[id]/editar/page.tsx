"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import AdminPageHeader from "../../../AdminPageHeader";

type ContratoEdit = {
  id: number;
  clienteId: number;
  vehiculoId: number;
  nombreCliente: string;
  apellidoCliente: string;
  marca: string;
  modelo: string;
  moneda: "DOP" | "USD";
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  precioDia: number;
  deposito: number;
  tipoDescuento: "fijo" | "porcentaje";
  valorDescuento: number;
  lugarEntrega: string | null;
  lugarDevolucion: string | null;
  notas: string | null;
  estado: string;
};

type FormularioContrato = {
  moneda: "DOP" | "USD";
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  precioDia: string;
  deposito: string;
  tipoDescuento: "fijo" | "porcentaje";
  valorDescuento: string;
  lugarEntrega: string;
  lugarDevolucion: string;
  notas: string;
};

const CAMPO =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D4202C]";

export default function EditarContratoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [contrato, setContrato] = useState<ContratoEdit | null>(null);
  const [formulario, setFormulario] = useState<FormularioContrato | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      try {
        const respuesta = await fetch(`/api/contratos/${id}`, {
          cache: "no-store",
        });
        const resultado = (await respuesta.json()) as
          | ContratoEdit
          | { error?: string };
        if (!respuesta.ok || !("id" in resultado)) {
          throw new Error(
            "error" in resultado
              ? resultado.error ?? "No se pudo cargar el contrato."
              : "No se pudo cargar el contrato."
          );
        }
        if (!cancelado) {
          setContrato(resultado);
          if (resultado.estado !== "pendiente_firma") {
            setError("Solo se pueden editar contratos pendientes de firma.");
          } else {
            setFormulario({
              moneda: resultado.moneda,
              fechaInicio: resultado.fechaInicio,
              fechaFin: resultado.fechaFin,
              horaEntrega: resultado.horaEntrega,
              horaDevolucion: resultado.horaDevolucion,
              precioDia: String(resultado.precioDia),
              deposito: String(resultado.deposito),
              tipoDescuento: resultado.tipoDescuento,
              valorDescuento: String(resultado.valorDescuento),
              lugarEntrega: resultado.lugarEntrega ?? "",
              lugarDevolucion: resultado.lugarDevolucion ?? "",
              notas: resultado.notas ?? "",
            });
          }
        }
      } catch (errorCarga) {
        console.error("Error al cargar contrato para edición:", errorCarga);
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
  }, [id]);

  function cambiar<K extends keyof FormularioContrato>(
    campo: K,
    valor: FormularioContrato[K]
  ) {
    setFormulario((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!contrato || !formulario || guardando) return;
    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch(`/api/contratos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulario),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo guardar el contrato.");
      }
      router.push(`/admin/contratos/${id}`);
    } catch (errorGuardado) {
      console.error("Error al editar contrato:", errorGuardado);
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se pudo guardar el contrato."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title={`Editar contrato #${id}`}
          description={
            contrato
              ? `${contrato.nombreCliente} ${contrato.apellidoCliente} · ${contrato.marca} ${contrato.modelo}`
              : "Edita los términos del contrato pendiente."
          }
        >
          <Link
            href={`/admin/contratos/${id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Contrato
          </Link>
        </AdminPageHeader>
        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {cargando ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Cargando contrato...
          </p>
        ) : formulario && contrato ? (
          <form
            onSubmit={guardar}
            className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7"
          >
            <label className="text-sm font-semibold text-gray-700">
              Moneda *
              <select
                value={formulario.moneda}
                onChange={(evento) =>
                  cambiar("moneda", evento.target.value as "DOP" | "USD")
                }
                className={CAMPO}
              >
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <span />
            <label className="text-sm font-semibold text-gray-700">
              Fecha de entrega *
              <input
                required
                type="date"
                value={formulario.fechaInicio}
                onChange={(evento) => cambiar("fechaInicio", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Fecha de devolución *
              <input
                required
                type="date"
                min={formulario.fechaInicio}
                value={formulario.fechaFin}
                onChange={(evento) => cambiar("fechaFin", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Hora de entrega *
              <input
                required
                type="time"
                value={formulario.horaEntrega}
                onChange={(evento) => cambiar("horaEntrega", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Hora de devolución *
              <input
                required
                type="time"
                value={formulario.horaDevolucion}
                onChange={(evento) =>
                  cambiar("horaDevolucion", evento.target.value)
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Precio por día *
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={formulario.precioDia}
                onChange={(evento) => cambiar("precioDia", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Depósito / garantía
              <input
                type="number"
                min="0"
                step="0.01"
                value={formulario.deposito}
                onChange={(evento) => cambiar("deposito", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Tipo de descuento
              <select
                value={formulario.tipoDescuento}
                onChange={(evento) =>
                  cambiar(
                    "tipoDescuento",
                    evento.target.value as "fijo" | "porcentaje"
                  )
                }
                className={CAMPO}
              >
                <option value="fijo">Monto fijo</option>
                <option value="porcentaje">Porcentaje</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Descuento
              <input
                type="number"
                min="0"
                max={formulario.tipoDescuento === "porcentaje" ? 100 : undefined}
                step="0.01"
                value={formulario.valorDescuento}
                onChange={(evento) =>
                  cambiar("valorDescuento", evento.target.value)
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Lugar de entrega
              <input
                maxLength={500}
                value={formulario.lugarEntrega}
                onChange={(evento) => cambiar("lugarEntrega", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Lugar de devolución
              <input
                maxLength={500}
                value={formulario.lugarDevolucion}
                onChange={(evento) =>
                  cambiar("lugarDevolucion", evento.target.value)
                }
                className={CAMPO}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Notas
              <textarea
                maxLength={5000}
                rows={4}
                value={formulario.notas}
                onChange={(evento) => cambiar("notas", evento.target.value)}
                className={CAMPO}
              />
            </label>
            <div className="flex justify-end sm:col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4202C] px-5 py-3 text-sm font-bold text-white hover:bg-[#b81b26] disabled:opacity-50"
              >
                <Save size={16} />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
