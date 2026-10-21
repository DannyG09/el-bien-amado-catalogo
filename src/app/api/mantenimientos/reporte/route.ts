import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import { crearReporteMantenimientoPdf } from "../../../lib/reporte-mantenimiento-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const mes = new URL(request.url).searchParams.get("mes") ?? "";
    const coincidencia = /^(\d{4})-(\d{2})$/.exec(mes);
    if (!coincidencia) {
      return NextResponse.json(
        { error: "Selecciona un mes válido para el reporte." },
        { status: 400 }
      );
    }

    const anio = Number(coincidencia[1]);
    const numeroMes = Number(coincidencia[2]);
    if (anio < 1900 || anio > 9999 || numeroMes < 1 || numeroMes > 12) {
      return NextResponse.json(
        { error: "El mes seleccionado no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const [mantenimientosResultado, recurrentesResultado] = await Promise.all([
      pool.query(
        `SELECT
           m.fecha::text AS fecha,
           CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
           COALESCE(v.placa, '') AS placa,
           m.categoria,
           m.monto,
           m.kilometraje,
           m.descripcion,
           m.factura_public_id IS NOT NULL AS "tieneFactura"
         FROM public.mantenimientos AS m
         INNER JOIN public.vehiculos AS v ON v.id = m.vehiculo_id
         WHERE m.fecha >= $1::date
           AND m.fecha < ($1::date + INTERVAL '1 month')
         ORDER BY m.fecha ASC, m.id ASC`,
        [`${mes}-01`]
      ),
      pool.query(
        `WITH periodo AS (
           SELECT
             $1::date AS inicio,
             ($1::date + INTERVAL '1 month')::date AS fin
         ),
         cargos_programados AS (
           SELECT
             g.id,
             g.nombre,
             g.categoria,
             g.frecuencia,
             g.fecha_inicio,
             g.monto,
             CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
             COALESCE(v.placa, '') AS placa,
             CASE
               WHEN g.frecuencia = 'mensual' THEN make_date(
                 EXTRACT(YEAR FROM p.inicio)::integer,
                 EXTRACT(MONTH FROM p.inicio)::integer,
                 LEAST(
                   EXTRACT(DAY FROM g.fecha_inicio)::integer,
                   EXTRACT(DAY FROM (p.fin - 1)::date)::integer
                 )
               )
               ELSE make_date(
                 EXTRACT(YEAR FROM p.inicio)::integer,
                 EXTRACT(MONTH FROM g.fecha_inicio)::integer,
                 LEAST(
                   EXTRACT(DAY FROM g.fecha_inicio)::integer,
                   EXTRACT(
                     DAY FROM (
                       make_date(
                         EXTRACT(YEAR FROM p.inicio)::integer,
                         EXTRACT(MONTH FROM g.fecha_inicio)::integer,
                         1
                       ) + INTERVAL '1 month - 1 day'
                     )::date
                   )::integer
                 )
               )
             END AS fecha_programada,
             p.inicio,
             p.fin
           FROM public.vehiculo_gastos_recurrentes AS g
           INNER JOIN public.vehiculos AS v ON v.id = g.vehiculo_id
           CROSS JOIN periodo AS p
         )
         SELECT
           fecha_programada::text AS "fechaProgramada",
           vehiculo,
           placa,
           nombre,
           categoria,
           frecuencia,
           monto
         FROM cargos_programados
         WHERE fecha_inicio < fin
           AND fecha_programada >= fecha_inicio
           AND (
             frecuencia = 'mensual'
             OR EXTRACT(MONTH FROM fecha_inicio) =
                EXTRACT(MONTH FROM inicio)
           )
         ORDER BY fecha_programada ASC, vehiculo ASC, id ASC`,
        [`${mes}-01`]
      ),
    ]);

    const mantenimientos = mantenimientosResultado.rows.map(
      (fila: Record<string, unknown>) => ({
        fecha: String(fila.fecha),
        vehiculo: String(fila.vehiculo),
        placa: String(fila.placa),
        categoria: String(fila.categoria),
        monto: Number(fila.monto),
        kilometraje: Number(fila.kilometraje),
        descripcion:
          typeof fila.descripcion === "string" ? fila.descripcion : null,
        tieneFactura: fila.tieneFactura === true,
      })
    );
    const recurrentes = recurrentesResultado.rows.map(
      (fila: Record<string, unknown>) => ({
        fechaProgramada: String(fila.fechaProgramada),
        vehiculo: String(fila.vehiculo),
        placa: String(fila.placa),
        nombre: String(fila.nombre),
        categoria: String(fila.categoria),
        frecuencia:
          fila.frecuencia === "anual"
            ? ("anual" as const)
            : ("mensual" as const),
        monto: Number(fila.monto),
      })
    );
    const pdf = await crearReporteMantenimientoPdf(
      mes,
      mantenimientos,
      recurrentes
    );
    const contenidoPdf = new Uint8Array(pdf.length);
    contenidoPdf.set(pdf);

    return new NextResponse(contenidoPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gastos-${mes}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error al generar el reporte mensual de mantenimiento:", error);
    return NextResponse.json(
      { error: "No se pudo generar el reporte mensual de gastos." },
      { status: 500 }
    );
  }
}
