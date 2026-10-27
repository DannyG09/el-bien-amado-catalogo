import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { isAdminAuthenticated } from "../../../lib/auth";
import { getConnection } from "../../../lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let client: PoolClient | undefined;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "La reserva indicada no es válida." }, { status: 400 });
    }

    let body: { estado?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
    }
    if (body.estado !== "cancelada") {
      return NextResponse.json({ error: "Solo se permite cancelar una reserva." }, { status: 400 });
    }

    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const actual = await client.query(
      `SELECT vehiculo_id AS "vehiculoId", estado
       FROM public.reservas_vehiculos WHERE id = $1`,
      [id]
    );
    if (actual.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La reserva no existe." }, { status: 404 });
    }
    await client.query(
      "SELECT id FROM public.vehiculos WHERE id = $1 FOR UPDATE",
      [Number(actual.rows[0].vehiculoId)]
    );
    const reserva = await client.query(
      "SELECT estado FROM public.reservas_vehiculos WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (reserva.rows[0].estado !== "confirmada") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La reserva ya no está confirmada." }, { status: 409 });
    }
    await client.query(
      `UPDATE public.reservas_vehiculos
       SET estado = 'cancelada', actualizado_en = NOW()
       WHERE id = $1`,
      [id]
    );
    await client.query("COMMIT");
    return NextResponse.json({ mensaje: "Reserva cancelada." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al cancelar reserva:", error);
    return NextResponse.json({ error: "No se pudo cancelar la reserva." }, { status: 500 });
  } finally {
    client?.release();
  }
}
