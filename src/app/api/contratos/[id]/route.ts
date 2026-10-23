import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { validarNuevoContrato } from "../../../lib/contratos";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function leerId(valor: string) {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const id = leerId((await params).id);
    if (id === null) {
      return NextResponse.json({ error: "El contrato indicado no es válido." }, { status: 400 });
    }
    const pool = await getConnection();
    const [contrato, pagos] = await Promise.all([
      pool.query(
        `SELECT
           c.id, c.cliente_id AS "clienteId", c.vehiculo_id AS "vehiculoId",
           c.moneda, c.fecha_inicio::text AS "fechaInicio",
           c.fecha_fin::text AS "fechaFin",
           to_char(c.hora_entrega, 'HH24:MI') AS "horaEntrega",
           to_char(c.hora_devolucion, 'HH24:MI') AS "horaDevolucion",
           c.precio_dia AS "precioDia", c.deposito,
           c.tipo_descuento AS "tipoDescuento",
           c.valor_descuento AS "valorDescuento", c.total,
           c.lugar_entrega AS "lugarEntrega",
           c.lugar_devolucion AS "lugarDevolucion",
           c.notas, c.estado, c.firmado_en AS "firmadoEn",
           c.firma_cliente IS NOT NULL AS "tieneFirma",
           c.cliente_nombre AS "nombreCliente",
           c.cliente_apellido AS "apellidoCliente",
           c.cliente_cedula AS cedula,
           c.cliente_whatsapp AS whatsapp,
           c.cliente_telefono AS telefono,
           c.cliente_email AS email,
           c.vehiculo_marca AS marca,
           c.vehiculo_modelo AS modelo,
           c.vehiculo_anio AS anio,
           c.vehiculo_placa AS placa
         FROM public.contratos AS c
         WHERE c.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT id, tipo, monto, metodo, fecha::text AS fecha, referencia, notas
         FROM public.contrato_pagos
         WHERE contrato_id = $1
         ORDER BY fecha DESC, id DESC`,
        [id]
      ),
    ]);
    if (contrato.rows.length === 0) {
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    const fila = contrato.rows[0] as Record<string, unknown>;
    const rentas = pagos.rows
      .filter((pago: Record<string, unknown>) => pago.tipo === "renta")
      .reduce((suma: number, pago: Record<string, unknown>) => suma + Number(pago.monto), 0);
    const depositos = pagos.rows
      .filter((pago: Record<string, unknown>) => pago.tipo === "deposito")
      .reduce((suma: number, pago: Record<string, unknown>) => suma + Number(pago.monto), 0);
    return NextResponse.json(
      {
        ...fila,
        id: Number(fila.id),
        clienteId: Number(fila.clienteId),
        vehiculoId: Number(fila.vehiculoId),
        precioDia: Number(fila.precioDia),
        deposito: Number(fila.deposito),
        valorDescuento: Number(fila.valorDescuento),
        total: Number(fila.total),
        pagado: rentas,
        depositado: depositos,
        saldo: Math.max(0, Number(fila.total) - rentas),
        pagos: pagos.rows.map((pago: Record<string, unknown>) => ({
          ...pago,
          id: Number(pago.id),
          monto: Number(pago.monto),
        })),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error al consultar contrato:", error);
    return NextResponse.json({ error: "No se pudo obtener el contrato." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
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
    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const actual = await client.query(
      `SELECT c.cliente_id AS "clienteId", c.vehiculo_id AS "vehiculoId",
              c.estado, c.firma_cliente IS NOT NULL AS "tieneFirma",
              cl.vencimiento_licencia::text AS "vencimientoLicencia"
       FROM public.contratos AS c
       INNER JOIN public.clientes AS cl ON cl.id = c.cliente_id
       WHERE c.id = $1
       FOR UPDATE OF c`,
      [id]
    );
    if (actual.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    if (actual.rows[0].estado !== "pendiente_firma" || actual.rows[0].tieneFirma) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Solo se pueden editar contratos pendientes de firma." },
        { status: 409 }
      );
    }
    const validacion = validarNuevoContrato({
      ...(body as Record<string, unknown>),
      clienteId: actual.rows[0].clienteId,
      vehiculoId: actual.rows[0].vehiculoId,
    });
    if (!validacion.valido) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }
    const { datos } = validacion;
    if (actual.rows[0].vencimientoLicencia < datos.fechaInicio) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "La licencia del cliente vence antes de la fecha de entrega." },
        { status: 400 }
      );
    }
    const pagosActuales = await client.query(
      `SELECT
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'renta'), 0) AS pagado,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'deposito'), 0) AS depositado
       FROM public.contrato_pagos WHERE contrato_id = $1`,
      [id]
    );
    if (
      Number(pagosActuales.rows[0].pagado) > datos.total ||
      Number(pagosActuales.rows[0].depositado) > datos.deposito
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Los nuevos montos no pueden ser inferiores a los pagos ya registrados." },
        { status: 409 }
      );
    }
    const resultado = await client.query(
      `UPDATE public.contratos SET
         moneda = $2, fecha_inicio = $3, fecha_fin = $4,
         hora_entrega = $5, hora_devolucion = $6, precio_dia = $7,
         deposito = $8, tipo_descuento = $9, valor_descuento = $10,
         total = $11, lugar_entrega = $12, lugar_devolucion = $13,
         notas = $14, actualizado_en = NOW()
       WHERE id = $1 AND estado = 'pendiente_firma'
       RETURNING id`,
      [
        id,
        datos.moneda,
        datos.fechaInicio,
        datos.fechaFin,
        datos.horaEntrega,
        datos.horaDevolucion,
        datos.precioDia,
        datos.deposito,
        datos.tipoDescuento,
        datos.valorDescuento,
        datos.total,
        datos.lugarEntrega,
        datos.lugarDevolucion,
        datos.notas,
      ]
    );
    if (resultado.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El contrato cambió de estado y ya no se puede editar." },
        { status: 409 }
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({ mensaje: "Contrato actualizado." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al editar contrato:", error);
    return NextResponse.json({ error: "No se pudo actualizar el contrato." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(request: Request, { params }: Params) {
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
    const estado = (body as { estado?: unknown })?.estado;
    if (estado !== "completado" && estado !== "cancelado") {
      return NextResponse.json(
        { error: "El contrato solo se puede completar o cancelar desde esta acción." },
        { status: 400 }
      );
    }
    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");
    const actual = await client.query(
      `SELECT vehiculo_id AS "vehiculoId", estado
       FROM public.contratos WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (actual.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    const estadoActual = actual.rows[0].estado as string;
    const transicionValida =
      (estado === "completado" && estadoActual === "activo") ||
      (estado === "cancelado" &&
        (estadoActual === "pendiente_firma" || estadoActual === "activo"));
    if (!transicionValida) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El estado actual del contrato no permite esa acción." },
        { status: 409 }
      );
    }
    const vehiculoId = Number(actual.rows[0].vehiculoId);
    await client.query(
      `UPDATE public.contratos SET estado = $2, actualizado_en = NOW()
       WHERE id = $1`,
      [id, estado]
    );
    await client.query(
      `UPDATE public.vehiculos
       SET estado = 'disponible', disponible = TRUE
       WHERE id = $1 AND estado IN ('reservado', 'rentado')`,
      [vehiculoId]
    );
    await client.query("COMMIT");
    return NextResponse.json({ mensaje: "Estado del contrato actualizado." });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al cambiar estado del contrato:", error);
    return NextResponse.json({ error: "No se pudo cambiar el estado del contrato." }, { status: 500 });
  } finally {
    client?.release();
  }
}
