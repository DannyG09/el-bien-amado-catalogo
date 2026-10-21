import { NextResponse } from "next/server";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";
import {
  calcularDiasVigencia,
  calcularFechaProxima,
} from "../../../lib/gastos-recurrentes";
import { crearReporteGastosRecurrentesPdf } from "../../../lib/reporte-gastos-recurrentes-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión como administrador." },
        { status: 401 }
      );
    }

    const anio = new URL(request.url).searchParams.get("anio") ?? "";
    if (!/^\d{4}$/.test(anio) || Number(anio) < 1900 || Number(anio) > 9999) {
      return NextResponse.json(
        { error: "Selecciona un año válido para el reporte." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await pool.query(
      `SELECT
         CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
         COALESCE(v.placa, '') AS placa,
         g.nombre,
         g.categoria,
         g.frecuencia,
         g.fecha_inicio::text AS "fechaInicio",
         g.monto
       FROM public.vehiculo_gastos_recurrentes AS g
       INNER JOIN public.vehiculos AS v ON v.id = g.vehiculo_id
       ORDER BY v.marca ASC, v.modelo ASC, g.fecha_inicio ASC, g.id ASC`
    );
    const gastos = resultado.rows.map((fila: Record<string, unknown>) => {
      const frecuencia: "anual" | "mensual" =
        fila.frecuencia === "anual" ? "anual" : "mensual";
      const fechaProxima = calcularFechaProxima(
        String(fila.fechaInicio),
        frecuencia
      );
      return {
        vehiculo: String(fila.vehiculo),
        placa: String(fila.placa),
        nombre: String(fila.nombre),
        categoria: String(fila.categoria),
        frecuencia,
        fechaProxima,
        diasVigencia: calcularDiasVigencia(fechaProxima),
        monto: Number(fila.monto),
      };
    });
    const pdf = await crearReporteGastosRecurrentesPdf(Number(anio), gastos);
    const contenidoPdf = new Uint8Array(pdf.length);
    contenidoPdf.set(pdf);

    return new NextResponse(contenidoPdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gastos-recurrentes-${anio}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error al generar reporte de gastos recurrentes:", error);
    return NextResponse.json(
      { error: "No se pudo generar el reporte de gastos recurrentes." },
      { status: 500 }
    );
  }
}
