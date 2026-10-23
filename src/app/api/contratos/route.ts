import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getConnection } from "../../lib/db";
import { isAdminAuthenticated } from "../../lib/auth";
import { validarNuevoContrato } from "../../lib/contratos";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const estado = new URL(request.url).searchParams.get("estado");
    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         c.id,
         c.cliente_id AS "clienteId",
         c.vehiculo_id AS "vehiculoId",
         c.moneda,
         c.fecha_inicio::text AS "fechaInicio",
         c.fecha_fin::text AS "fechaFin",
         c.precio_dia AS "precioDia",
         c.deposito,
         c.total,
         c.estado,
         c.firmado_en AS "firmadoEn",
         c.firma_cliente IS NOT NULL AS firmado,
         c.cliente_nombre AS "nombreCliente",
         c.cliente_apellido AS "apellidoCliente",
         c.cliente_cedula AS cedula,
         c.cliente_whatsapp AS whatsapp,
         c.vehiculo_marca AS marca,
         c.vehiculo_modelo AS modelo,
         c.vehiculo_anio AS anio,
         c.vehiculo_placa AS placa,
         COALESCE(p.pagado, 0) AS pagado,
         COALESCE(p.depositado, 0) AS depositado
       FROM public.contratos AS c
       LEFT JOIN (
         SELECT contrato_id,
           SUM(monto) FILTER (WHERE tipo = 'renta') AS pagado,
           SUM(monto) FILTER (WHERE tipo = 'deposito') AS depositado
         FROM public.contrato_pagos
         GROUP BY contrato_id
       ) AS p ON p.contrato_id = c.id
       WHERE $1::text IS NULL OR c.estado = $1
       ORDER BY c.creado_en DESC, c.id DESC`,
      [estado || null]
    );
    return NextResponse.json(
      resultado.rows.map((row: Record<string, unknown>) => ({
        ...row,
        id: Number(row.id),
        clienteId: Number(row.clienteId),
        vehiculoId: Number(row.vehiculoId),
        precioDia: Number(row.precioDia),
        deposito: Number(row.deposito),
        total: Number(row.total),
        pagado: Number(row.pagado),
        depositado: Number(row.depositado),
      })),
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error al consultar contratos:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los contratos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let client: PoolClient | null = null;
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "La solicitud no contiene JSON válido." },
        { status: 400 }
      );
    }
    const validacion = validarNuevoContrato(body);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }
    const { datos } = validacion;
    const pool = await getConnection();
    client = await pool.connect();
    await client.query("BEGIN");

    const [cliente, vehiculo, configuracion] = await Promise.all([
      client.query(
        `SELECT nombre, apellido, cedula, nacionalidad, telefono, whatsapp,
                email, direccion,
                vencimiento_licencia::text AS "vencimientoLicencia"
         FROM public.clientes WHERE id = $1`,
        [datos.clienteId]
      ),
      client.query(
        `SELECT id, estado, marca, modelo, anio, placa,
                EXISTS (
                  SELECT 1 FROM public.contratos AS c
                  WHERE c.vehiculo_id = vehiculos.id
                    AND c.estado IN ('pendiente_firma', 'activo')
                ) AS "tieneContratoActivo"
         FROM public.vehiculos WHERE id = $1 FOR UPDATE`,
        [datos.vehiculoId]
      ),
      client.query(
        `SELECT nombre_empresa, telefono, email, terminos,
                firma_empresa, firma_mime
         FROM public.contrato_configuracion WHERE id = 1`
      ),
    ]);
    if (cliente.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El cliente seleccionado no existe." },
        { status: 404 }
      );
    }
    if (vehiculo.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El vehículo seleccionado no existe." },
        { status: 404 }
      );
    }
    if (
      vehiculo.rows[0].estado !== "disponible" ||
      vehiculo.rows[0].tieneContratoActivo
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "El vehículo ya no está disponible para crear el contrato." },
        { status: 409 }
      );
    }
    if (cliente.rows[0].vencimientoLicencia < datos.fechaInicio) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "La licencia del cliente vence antes de la fecha de entrega." },
        { status: 400 }
      );
    }
    if (configuracion.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Configura los datos y términos de la empresa antes de crear contratos." },
        { status: 409 }
      );
    }

    const creado = await client.query(
      `INSERT INTO public.contratos (
         cliente_id, vehiculo_id,
         cliente_nombre, cliente_apellido, cliente_cedula, cliente_nacionalidad,
         cliente_telefono, cliente_whatsapp, cliente_email, cliente_direccion,
         vehiculo_marca, vehiculo_modelo, vehiculo_anio, vehiculo_placa,
         empresa_nombre, empresa_telefono, empresa_email, terminos_snapshot,
         empresa_firma, empresa_firma_mime,
         moneda, fecha_inicio, fecha_fin, hora_entrega, hora_devolucion,
         precio_dia, deposito, tipo_descuento, valor_descuento, total,
         lugar_entrega, lugar_devolucion, notas
       )
       SELECT
         $1, $2,
         cl.nombre, cl.apellido, cl.cedula, cl.nacionalidad,
         cl.telefono, cl.whatsapp, cl.email, cl.direccion,
         v.marca, v.modelo, v.anio, v.placa,
         cfg.nombre_empresa, cfg.telefono, cfg.email, cfg.terminos,
         cfg.firma_empresa, cfg.firma_mime,
         $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
       FROM public.clientes AS cl
       INNER JOIN public.vehiculos AS v ON v.id = $2
       CROSS JOIN public.contrato_configuracion AS cfg
       WHERE cl.id = $1 AND cfg.id = 1
       RETURNING id, estado`,
      [
        datos.clienteId,
        datos.vehiculoId,
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
    if (creado.rows.length === 0) {
      throw new Error("No se pudo asociar el contrato a los datos seleccionados.");
    }
    await client.query(
      `UPDATE public.vehiculos SET estado = 'reservado', disponible = FALSE
       WHERE id = $1`,
      [datos.vehiculoId]
    );
    await client.query("COMMIT");
    return NextResponse.json(creado.rows[0], { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error al crear contrato:", error);
    return NextResponse.json(
      { error: "No se pudo crear el contrato." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
