import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import { TIPOS_PAGO_CONTRATO } from "../../../../lib/contratos";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function fechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export async function POST(request: Request, { params }: Params) {
  let client: PoolClient | null = null;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json({ error: "El contrato indicado no es válido." }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
    }
    const datos = body as Record<string, unknown>;
    const tipo = datos?.tipo;
    const metodo = typeof datos?.metodo === "string" ? datos.metodo.trim() : "";
    const monto = Number(datos?.monto);
    const fecha =
      typeof datos?.fecha === "string" ? datos.fecha : new Date().toISOString().slice(0, 10);
    const referencia = typeof datos?.referencia === "string" ? datos.referencia.trim() : "";
    const notas = typeof datos?.notas === "string" ? datos.notas.trim() : "";
    if (
      !TIPOS_PAGO_CONTRATO.includes(tipo as (typeof TIPOS_PAGO_CONTRATO)[number]) ||
      (typeof datos?.monto !== "number" && typeof datos?.monto !== "string") ||
      (typeof datos?.monto === "string" && datos.monto.trim() === "") ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      monto > 1_000_000_000 ||
      Math.round(monto * 100) !== monto * 100 ||
      metodo.length === 0 ||
      metodo.length > 80 ||
      referencia.length > 255 ||
      notas.length > 2000 ||
      !fechaValida(fecha)
    ) {
      return NextResponse.json({ error: "Revisa el tipo, monto, método y fecha del pago." }, { status: 400 });
    }

    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const contrato = await client.query(
      `SELECT estado, total, deposito FROM public.contratos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (contrato.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    if (!["pendiente_firma", "activo"].includes(contrato.rows[0].estado)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No se aceptan pagos en un contrato cerrado." }, { status: 409 });
    }
    const pagado = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS monto
       FROM public.contrato_pagos WHERE contrato_id = $1 AND tipo = $2`,
      [id, tipo]
    );
    const limite = Number(tipo === "renta" ? contrato.rows[0].total : contrato.rows[0].deposito);
    const montoExistente = Number(pagado.rows[0].monto);
    if (montoExistente + monto > limite + 0.005) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `El monto supera el saldo disponible de ${(limite - montoExistente).toFixed(2)}.` },
        { status: 400 }
      );
    }
    const resultado = await client.query(
      `INSERT INTO public.contrato_pagos
         (contrato_id, tipo, monto, metodo, fecha, referencia, notas)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''))
       RETURNING id, tipo, monto, metodo, fecha::text AS fecha, referencia, notas`,
      [id, tipo, monto, metodo, fecha, referencia, notas]
    );
    await client.query("COMMIT");
    return NextResponse.json(
      { ...resultado.rows[0], id: Number(resultado.rows[0].id), monto: Number(resultado.rows[0].monto) },
      { status: 201 }
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al registrar pago del contrato:", error);
    return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  } finally {
    client?.release();
  }
}
