import { NextResponse } from "next/server";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import {
  calcularFechaProxima,
  CATEGORIAS_GASTO,
  validarGastoRecurrente,
  type GastoRecurrente,
} from "../../../../lib/gastos-recurrentes";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function leerVehiculoId(id: string) {
  const vehiculoId = Number(id);
  return Number.isSafeInteger(vehiculoId) && vehiculoId > 0
    ? vehiculoId
    : null;
}

function normalizarGasto(fila: Record<string, unknown>): GastoRecurrente {
  const frecuencia = fila.frecuencia === "anual" ? "anual" : "mensual";
  const fechaInicio = String(fila.fechaInicio);
  return {
    id: Number(fila.id),
    vehiculoId: Number(fila.vehiculoId),
    nombre: String(fila.nombre),
    categoria:
      typeof fila.categoria === "string" &&
      CATEGORIAS_GASTO.includes(
        fila.categoria as (typeof CATEGORIAS_GASTO)[number]
      )
        ? (fila.categoria as GastoRecurrente["categoria"])
        : "otro",
    frecuencia,
    fechaInicio,
    fechaProxima: calcularFechaProxima(fechaInicio, frecuencia),
    monto: Number(fila.monto),
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehiculoId = leerVehiculoId(id);
    if (vehiculoId === null) {
      return NextResponse.json(
        { error: "El identificador del vehículo no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         id,
         vehiculo_id AS "vehiculoId",
         nombre,
         categoria,
         frecuencia,
         fecha_inicio::text AS "fechaInicio",
         monto
       FROM public.vehiculo_gastos_recurrentes
       WHERE vehiculo_id = $1
       ORDER BY fecha_inicio DESC, id DESC`,
      [vehiculoId]
    );

    return NextResponse.json(
      resultado.rows.map((fila: Record<string, unknown>) =>
        normalizarGasto(fila)
      ),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al consultar gastos recurrentes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los gastos recurrentes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const vehiculoId = leerVehiculoId(id);
    if (vehiculoId === null) {
      return NextResponse.json(
        { error: "El identificador del vehículo no es válido." },
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
      `INSERT INTO public.vehiculo_gastos_recurrentes
         (vehiculo_id, nombre, categoria, frecuencia, fecha_inicio, monto)
       SELECT id, $2, $3, $4, $5, $6
       FROM public.vehiculos
       WHERE id = $1
       RETURNING
         id,
         vehiculo_id AS "vehiculoId",
         nombre,
         categoria,
         frecuencia,
         fecha_inicio::text AS "fechaInicio",
         monto`,
      [
        vehiculoId,
        validacion.datos.nombre,
        validacion.datos.categoria,
        validacion.datos.frecuencia,
        validacion.datos.fechaInicio,
        validacion.datos.monto,
      ]
    );

    if (resultado.rows.length === 0) {
      return NextResponse.json(
        { error: "El vehículo no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      normalizarGasto(resultado.rows[0]),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al guardar gasto recurrente:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el gasto recurrente." },
      { status: 500 }
    );
  }
}
