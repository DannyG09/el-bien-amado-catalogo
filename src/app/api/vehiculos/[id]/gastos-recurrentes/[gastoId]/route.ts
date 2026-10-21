import { NextResponse } from "next/server";
import { getConnection } from "../../../../../lib/db";
import { isAdminAuthenticated } from "../../../../../lib/auth";
import {
  calcularFechaProxima,
  validarGastoRecurrente,
} from "../../../../../lib/gastos-recurrentes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string; gastoId: string }>;
};

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { id, gastoId } = await params;
    const vehiculoId = leerId(id);
    const gastoRecurrenteId = leerId(gastoId);
    if (vehiculoId === null || gastoRecurrenteId === null) {
      return NextResponse.json(
        { error: "El identificador no es válido." },
        { status: 400 }
      );
    }

    let cuerpo: unknown;
    try {
      cuerpo = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no contiene JSON válido." },
        { status: 400 }
      );
    }

    const validacion = validarGastoRecurrente(cuerpo);
    if (!validacion.valido) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `UPDATE public.vehiculo_gastos_recurrentes
       SET
         nombre = $3,
         frecuencia = $4,
         fecha_inicio = $5,
         monto = $6
       WHERE id = $1 AND vehiculo_id = $2
       RETURNING
         id,
         vehiculo_id AS "vehiculoId",
         nombre,
         frecuencia,
         fecha_inicio::text AS "fechaInicio",
         monto`,
      [
        gastoRecurrenteId,
        vehiculoId,
        validacion.datos.nombre,
        validacion.datos.frecuencia,
        validacion.datos.fechaInicio,
        validacion.datos.monto,
      ]
    );

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró el gasto recurrente de este vehículo." },
        { status: 404 }
      );
    }

    const fila = resultado.rows[0] as Record<string, unknown>;
    const frecuencia = fila.frecuencia === "anual" ? "anual" : "mensual";
    const fechaInicio = String(fila.fechaInicio);
    return NextResponse.json({
      id: Number(fila.id),
      vehiculoId: Number(fila.vehiculoId),
      nombre: String(fila.nombre),
      frecuencia,
      fechaInicio,
      fechaProxima: calcularFechaProxima(fechaInicio, frecuencia),
      monto: Number(fila.monto),
    });
  } catch (error) {
    console.error("Error al actualizar gasto recurrente:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el gasto recurrente." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { id, gastoId } = await params;
    const vehiculoId = leerId(id);
    const gastoRecurrenteId = leerId(gastoId);
    if (vehiculoId === null || gastoRecurrenteId === null) {
      return NextResponse.json(
        { error: "El identificador no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `DELETE FROM public.vehiculo_gastos_recurrentes
       WHERE id = $1 AND vehiculo_id = $2
       RETURNING id`,
      [gastoRecurrenteId, vehiculoId]
    );

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "No se encontró el gasto recurrente de este vehículo." },
        { status: 404 }
      );
    }

    return NextResponse.json({ mensaje: "Gasto recurrente eliminado." });
  } catch (error) {
    console.error("Error al eliminar gasto recurrente:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el gasto recurrente." },
      { status: 500 }
    );
  }
}
