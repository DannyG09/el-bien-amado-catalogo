import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { isAdminAuthenticated } from "../../../../../lib/auth";
import {
  condicionDisponibilidadFechas,
} from "../../../../../lib/disponibilidad-vehiculos";
import { getConnection } from "../../../../../lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string; extensionId: string }> };

function enteroPositivo(valor: string) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function sumarDia(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaSiguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return `${fechaSiguiente.getUTCFullYear()}-${String(
    fechaSiguiente.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(fechaSiguiente.getUTCDate()).padStart(2, "0")}`;
}

export async function PATCH(request: Request, { params }: Params) {
  let client: PoolClient | undefined;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const { id: contratoIdParam, extensionId: extensionIdParam } = await params;
    const contratoId = enteroPositivo(contratoIdParam);
    const extensionId = enteroPositivo(extensionIdParam);
    if (!contratoId || !extensionId) {
      return NextResponse.json({ error: "El contrato o extensión no es válido." }, { status: 400 });
    }
    let body: { estado?: unknown; confirmacionCliente?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
    }
    if (body.estado !== "aprobada" && body.estado !== "rechazada") {
      return NextResponse.json({ error: "El estado de aprobación no es válido." }, { status: 400 });
    }
    if (body.estado === "aprobada" && body.confirmacionCliente !== true) {
      return NextResponse.json(
        { error: "Confirma que el cliente aceptó la extensión antes de aprobarla." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const inicial = await client.query(
      `SELECT c.vehiculo_id AS "vehiculoId"
       FROM public.contrato_extensiones AS ce
       INNER JOIN public.contratos AS c ON c.id = ce.contrato_id
       WHERE ce.id = $1 AND ce.contrato_id = $2`,
      [extensionId, contratoId]
    );
    if (inicial.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La extensión no existe." }, { status: 404 });
    }
    const vehiculoId = Number(inicial.rows[0].vehiculoId);
    await client.query(
      "SELECT id FROM public.vehiculos WHERE id = $1 FOR UPDATE",
      [vehiculoId]
    );
    const contrato = await client.query(
      "SELECT estado FROM public.contratos WHERE id = $1 FOR UPDATE",
      [contratoId]
    );
    const extension = await client.query(
      `SELECT fecha_fin_anterior::text AS "fechaFinAnterior",
              fecha_fin_nueva::text AS "fechaFinNueva", estado
       FROM public.contrato_extensiones
       WHERE id = $1 AND contrato_id = $2
       FOR UPDATE`,
      [extensionId, contratoId]
    );
    if (extension.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La extensión no existe." }, { status: 404 });
    }
    if (
      contrato.rows[0].estado !== "activo" ||
      extension.rows[0].estado !== "pendiente_aprobacion"
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El contrato o la extensión ya no permite esta acción." },
        { status: 409 }
      );
    }

    if (body.estado === "aprobada") {
      const disponible = await client.query(
        `SELECT v.id
         FROM public.vehiculos AS v
         WHERE v.id = $1
           AND ${condicionDisponibilidadFechas(
             "v",
             "$2",
             "$3",
             "$4"
           )}`,
        [
          vehiculoId,
          sumarDia(extension.rows[0].fechaFinAnterior as string),
          extension.rows[0].fechaFinNueva,
          contratoId,
        ]
      );
      if (disponible.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Ya existe otra reserva o contrato en las fechas extendidas." },
          { status: 409 }
        );
      }
    }

    await client.query(
      `UPDATE public.contrato_extensiones
       SET estado = $2,
           aprobada_en = CASE WHEN $2 = 'aprobada' THEN NOW() ELSE NULL END
       WHERE id = $1`,
      [extensionId, body.estado]
    );
    await client.query("COMMIT");
    return NextResponse.json({
      mensaje:
        body.estado === "aprobada"
          ? "Extensión aprobada y registrada."
          : "Extensión rechazada.",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al responder extensión:", error);
    return NextResponse.json({ error: "No se pudo actualizar la extensión." }, { status: 500 });
  } finally {
    client?.release();
  }
}
