import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getConnection } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const params = new URL(request.url).searchParams;
    const anio = Number(params.get("anio"));
    const categoria = params.get("categoria") ?? "marbete";
    const soloFinAnio = params.get("finAnio") === "1";
    if (!Number.isInteger(anio) || anio < 1900 || anio > 9999) {
      return NextResponse.json({ error: "Año no válido." }, { status: 400 });
    }
    if (!/^[a-z_]{1,40}$/.test(categoria)) {
      return NextResponse.json({ error: "Categoría no válida." }, { status: 400 });
    }
    const pool = await getConnection();
    const resultado = await pool.query(`
      SELECT CONCAT_WS(' ', v.marca, v.modelo, v.anio) AS vehiculo,
             COALESCE(v.color, '') AS color,
             COALESCE(v.placa, '') AS placa,
             g.nombre, g.frecuencia, g.fecha_inicio::text AS fecha_inicio,
             g.monto
      FROM public.vehiculo_gastos_recurrentes g
      JOIN public.vehiculos v ON v.id = g.vehiculo_id
      WHERE g.categoria = $1
      ORDER BY v.marca, v.modelo, v.anio, g.id
    `, [categoria]);
    type Fila = { vehiculo: string; color: string; placa: string; nombre: string; fecha: string; monto: number };
    const filas: Fila[] = [];
    for (const r of resultado.rows) {
      const inicio = String(r.fecha_inicio).slice(0, 10);
      const [inicioAnio, mes, dia] = inicio.split("-").map(Number);
      const monto = Number(r.monto);
      if (!Number.isFinite(monto) || !mes || !dia || inicioAnio > anio) continue;
      if (soloFinAnio && mes < 11) continue;
      if (r.frecuencia === "mensual") {
        // Una fila por mes aplicable en el año seleccionado.
        for (let m = Math.max(inicioAnio === anio ? mes : 1, soloFinAnio ? 11 : 1); m <= 12; m++) {
          filas.push({ vehiculo: String(r.vehiculo), color: String(r.color), placa: String(r.placa), nombre: String(r.nombre), fecha: `${anio}-${String(m).padStart(2, "0")}-${String(Math.min(dia, new Date(Date.UTC(anio, m, 0)).getUTCDate())).padStart(2, "0")}`, monto });
        }
      } else {
        const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(Math.min(dia, new Date(Date.UTC(anio, mes, 0)).getUTCDate())).padStart(2, "0")}`;
        filas.push({ vehiculo: String(r.vehiculo), color: String(r.color), placa: String(r.placa), nombre: String(r.nombre), fecha, monto });
      }
    }
    filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.vehiculo.localeCompare(b.vehiculo));
    const total = filas.reduce((s, f) => s + f.monto, 0);
    const dinero = (n: number) => `RD$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ancho = 595, alto = 842;
    let pagina = pdf.addPage([ancho, alto]);
    let y = 790;
    function escribir(texto: string, x: number, size = 10, negrita = false) {
      pagina.drawText(normalizar(texto), { x, y, size, font: negrita ? bold : regular, color: rgb(0.12, 0.12, 0.12), maxWidth: ancho - x - 30 });
    }
    function cabecera() {
      pagina.drawRectangle({ x: 0, y: alto - 18, width: ancho, height: 18, color: rgb(0.831, 0.125, 0.173) });
      y = 790;
      escribir("EL BIEN AMADO RENT A CAR", 35, 16, true); y -= 29;
      escribir(`Reporte de ${categoria.toUpperCase()} - ${anio}${soloFinAnio ? " (noviembre-diciembre)" : ""}`, 35, 12, true); y -= 24;
      escribir(`Registros programados: ${filas.length}    Total previsto: ${dinero(total)}`, 35, 10, true); y -= 32;
      escribir("VEHICULO / PLACA", 35, 9, true);
      escribir("RENOVACION", 310, 9, true);
      escribir("MONTO", 445, 9, true);
      y -= 16;
      pagina.drawLine({ start: { x: 35, y }, end: { x: 560, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
      y -= 20;
    }
    cabecera();
    for (const fila of filas) {
      if (y < 80) { pagina = pdf.addPage([ancho, alto]); cabecera(); }
      const vehiculo = `${fila.vehiculo} ${fila.color}`.slice(0, 42);
      escribir(vehiculo, 35, 9, true);
      escribir(fila.fecha, 310, 9);
      escribir(dinero(fila.monto), 445, 9);
      y -= 14;
      escribir(`Placa: ${fila.placa || "Sin placa"}  |  ${fila.nombre}`.slice(0, 80), 35, 8);
      y -= 25;
    }
    if (y < 95) { pagina = pdf.addPage([ancho, alto]); y = 790; }
    escribir(`TOTAL PREVISTO: ${dinero(total)}`, 35, 13, true); y -= 25;
    escribir("Proyeccion basada en fechas y montos registrados; no acredita pagos.", 35, 8);
    const bytes = await pdf.save();
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="reporte-${categoria}-${anio}.pdf"`, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error en reporte por categoria:", error);
    return NextResponse.json({ error: "No se pudo generar el reporte." }, { status: 500 });
  }
}
