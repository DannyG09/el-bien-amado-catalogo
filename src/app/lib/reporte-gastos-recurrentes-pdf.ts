import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type GastoRecurrentePdf = {
  vehiculo: string;
  placa: string;
  nombre: string;
  categoria: string;
  frecuencia: "mensual" | "anual";
  fechaProxima: string;
  diasVigencia: number;
  monto: number;
};

function fechaLegible(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function dividirTexto(
  texto: string,
  fuente: PDFFont,
  tamano: number,
  anchoMaximo: number
) {
  const lineas: string[] = [];
  let linea = "";
  for (const palabra of texto.split(/\s+/)) {
    const candidata = linea ? `${linea} ${palabra}` : palabra;
    if (linea && fuente.widthOfTextAtSize(candidata, tamano) > anchoMaximo) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = candidata;
    }
  }
  if (linea) lineas.push(linea);
  return lineas;
}

export async function crearReporteGastosRecurrentesPdf(
  anio: number,
  gastos: GastoRecurrentePdf[]
) {
  const documento = await PDFDocument.create();
  const regular = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(join(process.cwd(), "public", "logo.jpeg"));
  const logo = await documento.embedJpg(logoBytes);
  const rojo = rgb(0.83, 0.125, 0.173);
  const negro = rgb(0.11, 0.12, 0.13);
  const gris = rgb(0.38, 0.4, 0.42);
  const claro = rgb(0.91, 0.92, 0.93);
  const ancho = 612;
  const alto = 792;
  const margen = 44;
  let pagina!: PDFPage;
  let y = 0;

  function nuevaPagina() {
    pagina = documento.addPage([ancho, alto]);
    pagina.drawRectangle({
      x: 0,
      y: alto - 96,
      width: ancho,
      height: 96,
      color: rgb(0.035, 0.035, 0.035),
    });
    pagina.drawCircle({
      x: 82,
      y: alto - 48,
      size: 44,
      color: rgb(0.035, 0.035, 0.035),
      borderColor: rojo,
      borderWidth: 2.5,
    });
    pagina.drawImage(logo, {
      x: 44,
      y: alto - 86,
      width: 76,
      height: 76,
    });
    pagina.drawText("EL BIEN AMADO RENT A CAR", {
      x: 137,
      y: alto - 47,
      size: 17,
      font: negrita,
      color: rgb(1, 1, 1),
    });
    pagina.drawText("RNC: 133-34865-9", {
      x: 137,
      y: alto - 69,
      size: 11,
      font: regular,
      color: rgb(1, 1, 1),
    });

    y = alto - 126;
    pagina.drawText("Gastos recurrentes · Proyección anual", {
      x: margen,
      y,
      size: 18,
      font: negrita,
      color: negro,
    });
    y -= 20;
    pagina.drawText(
      `Plan registrado para ${anio} · Importes previstos, no necesariamente pagados`,
      { x: margen, y, size: 9, font: regular, color: gris }
    );
    y -= 23;
  }

  function asegurarEspacio(altura: number) {
    if (y - altura < margen + 24) nuevaPagina();
  }

  function dibujarParrafo(texto: string, size = 9, color = gris) {
    const lineas = dividirTexto(texto, regular, size, ancho - margen * 2);
    asegurarEspacio(lineas.length * 13 + 5);
    for (const linea of lineas) {
      pagina.drawText(linea, { x: margen, y, size, font: regular, color });
      y -= 13;
    }
    y -= 5;
  }

  nuevaPagina();
  const totalAnual = gastos.reduce(
    (total, gasto) =>
      total + gasto.monto * (gasto.frecuencia === "mensual" ? 12 : 1),
    0
  );
  pagina.drawText(
    `Proyección anual total: DOP ${totalAnual.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    { x: margen, y, size: 12, font: negrita, color: negro }
  );
  y -= 26;

  if (gastos.length === 0) {
    dibujarParrafo("No hay gastos recurrentes registrados para la flota.");
  } else {
    for (const gasto of gastos) {
      const anualizado =
        gasto.monto * (gasto.frecuencia === "mensual" ? 12 : 1);
      const dias =
        gasto.diasVigencia < 0
          ? `Vencido hace ${Math.abs(gasto.diasVigencia)} días`
          : gasto.diasVigencia === 0
            ? "Vence hoy"
            : `Vence en ${gasto.diasVigencia} días`;
      const detalles = [
        `${gasto.vehiculo}${gasto.placa ? ` · ${gasto.placa}` : ""}`,
        `${gasto.categoria.toLocaleUpperCase("es-DO")} · ${gasto.nombre}`,
        `Frecuencia: ${gasto.frecuencia === "mensual" ? "mensual" : "anual"} · Próxima fecha: ${fechaLegible(gasto.fechaProxima)}`,
        `${dias} · Monto: DOP ${gasto.monto.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} · Proyección anual: DOP ${anualizado.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ];
      const lineas = detalles.flatMap((detalle, indice) =>
        dividirTexto(
          detalle,
          indice === 0 ? negrita : regular,
          9,
          ancho - margen * 2 - 16
        )
      );
      asegurarEspacio(lineas.length * 13 + 17);
      pagina.drawRectangle({
        x: margen,
        y: y - lineas.length * 13 - 7,
        width: ancho - margen * 2,
        height: lineas.length * 13 + 14,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: claro,
        borderWidth: 0.7,
      });
      let indiceLinea = 0;
      for (const detalle of detalles) {
        const lineasDetalle = dividirTexto(
          detalle,
          indiceLinea === 0 ? negrita : regular,
          9,
          ancho - margen * 2 - 16
        );
        for (const linea of lineasDetalle) {
          pagina.drawText(linea, {
            x: margen + 8,
            y,
            size: 9,
            font: indiceLinea === 0 ? negrita : regular,
            color: indiceLinea === 0 ? negro : gris,
          });
          y -= 13;
          indiceLinea += 1;
        }
      }
      y -= 13;
    }
  }

  for (const [indice, paginaPdf] of documento.getPages().entries()) {
    paginaPdf.drawLine({
      start: { x: margen, y: margen },
      end: { x: ancho - margen, y: margen },
      thickness: 0.75,
      color: claro,
    });
    paginaPdf.drawText(
      `Documento administrativo · Página ${indice + 1} de ${documento.getPageCount()}`,
      {
        x: margen,
        y: 25,
        size: 8,
        font: regular,
        color: gris,
      }
    );
  }

  return documento.save();
}
