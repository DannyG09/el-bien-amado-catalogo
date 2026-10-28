import { NextResponse } from "next/server";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";
import {
  calcularFechaProxima,
  validarGastoRecurrente,
  type GastoRecurrente,
} from "../../lib/gastos-recurrentes";
import { crearUrlPrivadaFotoGasto } from "../../lib/fotos-gastos-recurrentes";

export const runtime = "nodejs";

function leerId(valor: unknown) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizarGasto(fila: Record<string, unknown>): GastoRecurrente & {
  vehiculo: string;
  color: string;
  placa: string;
  fotoUrl: string | null;
  fotoNombre: string | null;
} {
  const frecuencia = fila.frecuencia === "anual" ? "anual" : "mensual";
  const fechaInicio = String(fila.fechaInicio);
  const fotoPublicId =
    typeof fila.fotoPublicId === "string" ? fila.fotoPublicId : "";
  const fotoVersion = Number(fila.fotoVersion);
  return {
    id: Number(fila.id),
    vehiculoId: Number(fila.vehiculoId),
    vehiculo: String(fila.vehiculo),
    color: String(fila.color ?? ""),
    placa: String(fila.placa ?? ""),
    fotoUrl:
      fotoPublicId && Number.isSafeInteger(fotoVersion)
        ? crearUrlPrivadaFotoGasto(fotoPublicId, fotoVersion)
        : null,
    fotoNombre:
      typeof fila.fotoNombre === "string" ? fila.fotoNombre : null,
    nombre: String(fila.nombre),
    categoria: String(fila.categoria) as GastoRecurrente["categoria"],
    frecuencia,
    fechaInicio,
    fechaProxima: calcularFechaProxima(fechaInicio, frecuencia),
    monto: Number(fila.monto),
  };
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const pool = await getConnection();
    const [vehiculosResultado, gastosResultado] = await Promise.all([
      pool.query(
        `SELECT
           id,
           marca,
           modelo,
           anio,
           COALESCE(color, '') AS color,
           COALESCE(placa, '') AS placa
         FROM public.vehiculos
         ORDER BY marca ASC, modelo ASC, id ASC`
      ),
      pool.query(
        `SELECT
           g.id,
           g.vehiculo_id AS "vehiculoId",
           CONCAT_WS(' ', v.marca, v.modelo, v.anio) AS vehiculo,
           COALESCE(v.color, '') AS color,
           COALESCE(v.placa, '') AS placa,
           g.foto_public_id AS "fotoPublicId",
           g.foto_version AS "fotoVersion",
           g.foto_nombre AS "fotoNombre",
           g.nombre,
           g.categoria,
           g.frecuencia,
           g.fecha_inicio::text AS "fechaInicio",
           g.monto
         FROM public.vehiculo_gastos_recurrentes AS g
         INNER JOIN public.vehiculos AS v ON v.id = g.vehiculo_id
         ORDER BY g.fecha_inicio ASC, g.id ASC`
      ),
    ]);

    return NextResponse.json(
      {
        vehiculos: vehiculosResultado.rows.map(
          (fila: Record<string, unknown>) => ({
            id: Number(fila.id),
            marca: String(fila.marca),
            modelo: String(fila.modelo),
            anio: Number(fila.anio),
            color: String(fila.color),
            placa: String(fila.placa),
          })
        ),
        gastos: gastosResultado.rows.map(
          (fila: Record<string, unknown>) => normalizarGasto(fila)
        ),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error al consultar gastos recurrentes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los gastos recurrentes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
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

    if (
      typeof cuerpo !== "object" ||
      cuerpo === null ||
      Array.isArray(cuerpo)
    ) {
      return NextResponse.json(
        { error: "Los datos del gasto no son válidos." },
        { status: 400 }
      );
    }
    const entrada = cuerpo as Record<string, unknown>;
    const vehiculoId = leerId(entrada.vehiculoId);
    if (vehiculoId === null) {
      return NextResponse.json(
        { error: "Selecciona un vehículo válido." },
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
        { error: "El vehículo seleccionado no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json(resultado.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error al guardar gasto recurrente:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el gasto recurrente." },
      { status: 500 }
    );
  }
}
