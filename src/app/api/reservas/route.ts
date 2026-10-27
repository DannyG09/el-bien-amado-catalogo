import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { isAdminAuthenticated } from "../../lib/auth";
import {
  condicionDisponibilidadFechas,
  validarRangoFechas,
} from "../../lib/disponibilidad-vehiculos";
import { getConnection } from "../../lib/db";

export const runtime = "nodejs";

function validarHora(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function enteroPositivo(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT rv.id, rv.vehiculo_id AS "vehiculoId",
              rv.cliente_id AS "clienteId",
              COALESCE(
                NULLIF(rv.cliente_nombre_manual, ''),
                NULLIF(CONCAT_WS(' ', cl.nombre, cl.apellido), '')
              ) AS "nombreCliente",
              rv.fecha_inicio::text AS "fechaInicio",
              rv.fecha_fin::text AS "fechaFin",
              TO_CHAR(rv.hora_entrega, 'HH24:MI') AS "horaEntrega",
              TO_CHAR(rv.hora_devolucion, 'HH24:MI') AS "horaDevolucion",
              rv.notas, rv.estado, rv.creado_en AS "creadoEn",
              v.marca, v.modelo, v.anio, v.placa
       FROM public.reservas_vehiculos AS rv
       INNER JOIN public.vehiculos AS v ON v.id = rv.vehiculo_id
       LEFT JOIN public.clientes AS cl ON cl.id = rv.cliente_id
       ORDER BY
         CASE WHEN rv.estado = 'confirmada' THEN 0 ELSE 1 END,
         rv.fecha_inicio DESC, rv.id DESC
       LIMIT 300`
    );
    return NextResponse.json(
      resultado.rows.map((fila: Record<string, unknown>) => ({
        ...fila,
        id: Number(fila.id),
        vehiculoId: Number(fila.vehiculoId),
        clienteId: fila.clienteId === null ? null : Number(fila.clienteId),
        anio: Number(fila.anio),
      }))
    );
  } catch (error) {
    console.error("Error al cargar reservas:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las reservas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let client: PoolClient | undefined;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
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

    const vehiculoId = enteroPositivo(body.vehiculoId);
    const clienteId = body.clienteId ? enteroPositivo(body.clienteId) : null;
    const clienteNombreManual =
      typeof body.clienteNombreManual === "string"
        ? body.clienteNombreManual.trim()
        : "";
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const horaEntrega = body.horaEntrega;
    const horaDevolucion = body.horaDevolucion;
    const notas = typeof body.notas === "string" ? body.notas.trim() : "";

    if (
      !vehiculoId ||
      !validarRangoFechas(fechaInicio, fechaFin) ||
      !validarHora(horaEntrega) ||
      !validarHora(horaDevolucion) ||
      (clienteId !== null && !enteroPositivo(body.clienteId)) ||
      (clienteId !== null && clienteNombreManual !== "") ||
      (clienteId === null && !clienteNombreManual) ||
      clienteNombreManual.length > 200 ||
      notas.length > 2000
    ) {
      return NextResponse.json(
        { error: "Completa un rango válido, vehículo y nombre del cliente." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");

    const vehiculo = await client.query(
      "SELECT id FROM public.vehiculos WHERE id = $1 FOR UPDATE",
      [vehiculoId]
    );
    if (vehiculo.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El vehículo no existe." }, { status: 404 });
    }

    if (clienteId !== null) {
      const cliente = await client.query(
        "SELECT id FROM public.clientes WHERE id = $1",
        [clienteId]
      );
      if (cliente.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 404 });
      }
    }

    const disponibilidad = await client.query(
      `SELECT v.id
       FROM public.vehiculos AS v
       WHERE v.id = $1
         AND ${condicionDisponibilidadFechas("v", "$2", "$3")}`,
      [vehiculoId, fechaInicio, fechaFin]
    );
    if (disponibilidad.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El vehículo no está disponible durante esas fechas." },
        { status: 409 }
      );
    }

    const creada = await client.query(
      `INSERT INTO public.reservas_vehiculos (
         vehiculo_id, cliente_id, cliente_nombre_manual,
         fecha_inicio, fecha_fin, hora_entrega, hora_devolucion, notas
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        vehiculoId,
        clienteId,
        clienteNombreManual || null,
        fechaInicio,
        fechaFin,
        horaEntrega,
        horaDevolucion,
        notas || null,
      ]
    );

    await client.query("COMMIT");
    return NextResponse.json(
      { id: Number(creada.rows[0].id), mensaje: "Reserva registrada." },
      { status: 201 }
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al crear reserva:", error);
    return NextResponse.json({ error: "No se pudo registrar la reserva." }, { status: 500 });
  } finally {
    client?.release();
  }
}
