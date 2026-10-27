import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { isAdminAuthenticated } from "../../../../lib/auth";
import {
  condicionDisponibilidadFechas,
  validarRangoFechas,
} from "../../../../lib/disponibilidad-vehiculos";
import { getConnection } from "../../../../lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

function enteroPositivo(valor: string) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function validarHora(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function sumarDia(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaSiguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return `${fechaSiguiente.getUTCFullYear()}-${String(
    fechaSiguiente.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(fechaSiguiente.getUTCDate()).padStart(2, "0")}`;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = enteroPositivo((await params).id);
    if (!id) {
      return NextResponse.json({ error: "El contrato indicado no es válido." }, { status: 400 });
    }
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT id, fecha_fin_anterior::text AS "fechaFinAnterior",
              fecha_fin_nueva::text AS "fechaFinNueva",
              TO_CHAR(hora_devolucion, 'HH24:MI') AS "horaDevolucion",
              monto_adicional AS "montoAdicional", estado, notas,
              aprobada_en AS "aprobadaEn", creada_en AS "creadaEn"
       FROM public.contrato_extensiones
       WHERE contrato_id = $1
       ORDER BY creada_en DESC, id DESC`,
      [id]
    );
    return NextResponse.json(
      resultado.rows.map((extension: Record<string, unknown>) => ({
        ...extension,
        id: Number(extension.id),
        montoAdicional: Number(extension.montoAdicional),
      }))
    );
  } catch (error) {
    console.error("Error al cargar extensiones del contrato:", error);
    return NextResponse.json({ error: "No se pudieron cargar las extensiones." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  let client: PoolClient | undefined;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = enteroPositivo((await params).id);
    if (!id) {
      return NextResponse.json({ error: "El contrato indicado no es válido." }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      const datos: unknown = await request.json();
      if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
        return NextResponse.json({ error: "Los datos no son válidos." }, { status: 400 });
      }
      body = datos as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
    }
    const fechaFinNueva = body.fechaFinNueva;
    const horaDevolucion = body.horaDevolucion;
    const notas = typeof body.notas === "string" ? body.notas.trim() : "";
    if (
      typeof fechaFinNueva !== "string" ||
      !validarHora(horaDevolucion) ||
      notas.length > 2000
    ) {
      return NextResponse.json({ error: "Completa una fecha y hora de devolución válidas." }, { status: 400 });
    }

    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const contratoInicial = await client.query(
      "SELECT vehiculo_id AS \"vehiculoId\" FROM public.contratos WHERE id = $1",
      [id]
    );
    if (contratoInicial.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    const vehiculoId = Number(contratoInicial.rows[0].vehiculoId);
    await client.query(
      "SELECT id FROM public.vehiculos WHERE id = $1 FOR UPDATE",
      [vehiculoId]
    );
    const contrato = await client.query(
      `SELECT estado, fecha_fin::text AS "fechaFin",
              precio_dia AS "precioDia"
       FROM public.contratos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (contrato.rows[0].estado !== "activo") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Solo se puede extender un contrato activo." },
        { status: 409 }
      );
    }
    const extensiones = await client.query(
      `SELECT
         COALESCE(MAX(fecha_fin_nueva) FILTER (WHERE estado = 'aprobada'),
                  $1::date)::text AS "fechaFinActual",
         BOOL_OR(estado = 'pendiente_aprobacion') AS "tienePendiente"
       FROM public.contrato_extensiones
       WHERE contrato_id = $2`,
      [contrato.rows[0].fechaFin, id]
    );
    const fechaFinActual = extensiones.rows[0].fechaFinActual as string;
    if (extensiones.rows[0].tienePendiente) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Resuelve la extensión pendiente antes de registrar otra." },
        { status: 409 }
      );
    }
    if (
      !validarRangoFechas(fechaFinActual, fechaFinNueva) ||
      fechaFinNueva === fechaFinActual
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "La nueva fecha debe ser posterior a la devolución vigente." },
        { status: 400 }
      );
    }

    const inicioExtension = sumarDia(fechaFinActual);
    const disponible = await client.query(
      `SELECT v.id
       FROM public.vehiculos AS v
       WHERE v.id = $1
         AND ${condicionDisponibilidadFechas("v", "$2", "$3", "$4")}`,
      [vehiculoId, inicioExtension, fechaFinNueva, id]
    );
    if (disponible.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El vehículo tiene otra reserva o contrato durante esas fechas." },
        { status: 409 }
      );
    }

    const dias = await client.query(
      "SELECT ($2::date - $1::date)::integer AS dias",
      [fechaFinActual, fechaFinNueva]
    );
    const montoAdicional =
      Math.round(
        (Number(dias.rows[0].dias) *
          Number(contrato.rows[0].precioDia) +
          Number.EPSILON) *
          100
      ) / 100;
    if (!Number.isFinite(montoAdicional) || montoAdicional <= 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No se pudo calcular el monto adicional." }, { status: 400 });
    }

    const creada = await client.query(
      `INSERT INTO public.contrato_extensiones (
         contrato_id, fecha_fin_anterior, fecha_fin_nueva,
         hora_devolucion, monto_adicional, notas
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [id, fechaFinActual, fechaFinNueva, horaDevolucion, montoAdicional, notas || null]
    );
    await client.query("COMMIT");
    return NextResponse.json(
      {
        id: Number(creada.rows[0].id),
        montoAdicional,
        mensaje: "Extensión pendiente de aprobación del cliente.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al registrar extensión:", error);
    return NextResponse.json({ error: "No se pudo registrar la extensión." }, { status: 500 });
  } finally {
    client?.release();
  }
}
