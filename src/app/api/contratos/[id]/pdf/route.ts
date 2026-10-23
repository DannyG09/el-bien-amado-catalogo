import { NextResponse } from "next/server";
import { getConnection } from "../../../../lib/db";
import { isAdminAuthenticated } from "../../../../lib/auth";
import {
  crearPdfContrato,
  type ConfiguracionPdfContrato,
  type DatosPdfContrato,
} from "../../../../lib/contrato-pdf";

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
    const [contratoResultado, pagosResultado] =
      await Promise.all([
        pool.query(
          `SELECT
             c.id, c.estado, c.moneda, c.fecha_inicio::text AS "fechaInicio",
             c.fecha_fin::text AS "fechaFin",
             to_char(c.hora_entrega, 'HH24:MI') AS "horaEntrega",
             to_char(c.hora_devolucion, 'HH24:MI') AS "horaDevolucion",
             c.precio_dia AS "precioDia", c.deposito,
             c.tipo_descuento AS "tipoDescuento",
             c.valor_descuento AS "valorDescuento", c.total,
             c.lugar_entrega AS "lugarEntrega",
             c.lugar_devolucion AS "lugarDevolucion",
             c.notas, c.firmado_en AS "firmadoEn",
             c.firma_cliente AS "firmaCliente",
             c.firma_mime AS "firmaMimeCliente",
             c.cliente_nombre AS "nombreCliente",
             c.cliente_apellido AS "apellidoCliente",
             c.cliente_cedula AS cedula,
             c.cliente_nacionalidad AS nacionalidad,
             c.cliente_telefono AS telefono,
             c.cliente_email AS email,
             c.cliente_direccion AS direccion,
             c.vehiculo_marca AS marca, c.vehiculo_modelo AS modelo,
             c.vehiculo_anio AS anio, c.vehiculo_placa AS placa,
             c.empresa_nombre AS "nombreEmpresa",
             c.empresa_telefono AS "telefonoEmpresa",
             c.empresa_email AS "emailEmpresa",
             c.terminos_snapshot AS terminos,
             c.empresa_firma AS "firmaEmpresa",
             c.empresa_firma_mime AS "firmaMimeEmpresa"
           FROM public.contratos AS c
           WHERE c.id = $1`,
          [id]
        ),
        pool.query(
          `SELECT tipo, monto, metodo, fecha::text AS fecha
           FROM public.contrato_pagos WHERE contrato_id = $1
           ORDER BY fecha, id`,
          [id]
        ),
      ]);
    if (contratoResultado.rows.length === 0) {
      return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
    }
    const fila = contratoResultado.rows[0] as Record<string, unknown>;
    const contrato: DatosPdfContrato = {
      id: Number(fila.id),
      estado: String(fila.estado),
      moneda: fila.moneda === "USD" ? "USD" : "DOP",
      fechaInicio: String(fila.fechaInicio),
      fechaFin: String(fila.fechaFin),
      horaEntrega: String(fila.horaEntrega),
      horaDevolucion: String(fila.horaDevolucion),
      precioDia: Number(fila.precioDia),
      deposito: Number(fila.deposito),
      tipoDescuento: String(fila.tipoDescuento),
      valorDescuento: Number(fila.valorDescuento),
      total: Number(fila.total),
      lugarEntrega: fila.lugarEntrega ? String(fila.lugarEntrega) : null,
      lugarDevolucion: fila.lugarDevolucion ? String(fila.lugarDevolucion) : null,
      notas: fila.notas ? String(fila.notas) : null,
      firmadoEn: fila.firmadoEn ? String(fila.firmadoEn) : null,
      cliente: {
        nombre: String(fila.nombreCliente),
        apellido: String(fila.apellidoCliente),
        cedula: String(fila.cedula),
        nacionalidad: String(fila.nacionalidad),
        telefono: fila.telefono ? String(fila.telefono) : null,
        email: fila.email ? String(fila.email) : null,
        direccion: String(fila.direccion),
      },
      vehiculo: {
        marca: String(fila.marca),
        modelo: String(fila.modelo),
        anio: Number(fila.anio),
        placa: fila.placa ? String(fila.placa) : null,
      },
      pagos: pagosResultado.rows.map((pago: Record<string, unknown>) => ({
        tipo: String(pago.tipo),
        monto: Number(pago.monto),
        metodo: String(pago.metodo),
        fecha: String(pago.fecha),
      })),
    };
    const firmaCliente =
      fila.firmaCliente && fila.firmaMimeCliente
        ? {
            bytes: fila.firmaCliente as Buffer,
            mime: fila.firmaMimeCliente as "image/png" | "image/jpeg",
          }
        : null;
    const configuracion: ConfiguracionPdfContrato = {
      nombreEmpresa: String(fila.nombreEmpresa),
      telefono: fila.telefonoEmpresa ? String(fila.telefonoEmpresa) : null,
      email: fila.emailEmpresa ? String(fila.emailEmpresa) : null,
      terminos: String(fila.terminos),
      firmaEmpresa:
        fila.firmaEmpresa && fila.firmaMimeEmpresa
          ? {
              bytes: fila.firmaEmpresa as Buffer,
              mime: fila.firmaMimeEmpresa as "image/png" | "image/jpeg",
            }
          : null,
    };
    const contenido = await crearPdfContrato(
      contrato,
      configuracion,
      firmaCliente
    );
    const respuestaPdf = new Uint8Array(contenido.length);
    respuestaPdf.set(contenido);
    return new NextResponse(respuestaPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrato-${id}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error al generar PDF de contrato:", error);
    return NextResponse.json({ error: "No se pudo generar el PDF del contrato." }, { status: 500 });
  }
}
