import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type GastoMantenimientoReporte = {
  fecha: string;
  vehiculo: string;
  placa: string;
  categoria: string;
  monto: number;
  kilometraje: number;
  descripcion: string | null;
  tieneFactura: boolean;
};

export type GastoRecurrenteReporte = {
  fechaProgramada: string;
  vehiculo: string;
  placa: string;
  nombre: string;
  categoria: string;
  frecuencia: "mensual" | "anual";
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

function separarLineas(
  texto: string,
  fuente: PDFFont,
  tamano: number,
  anchoMaximo: number
) {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let linea = "";

  for (const palabra of palabras) {
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

export async function crearReporteMantenimientoPdf(
  mes: string,
  mantenimientos: GastoMantenimientoReporte[],
  recurrentes: GastoRecurrenteReporte[]
) {
  const documento = await PDFDocument.create();
  const regular = await documento.embedFont(StandardFonts.Helvetica);
  const negrita = await documento.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(join(process.cwd(), "public", "logo.jpeg"));
  const logo = await documento.embedJpg(logoBytes);
  const rojo = rgb(0.82, 0.12, 0.17);
  const negro = rgb(0.11, 0.12, 0.13);
  const gris = rgb(0.38, 0.4, 0.42);
  const claro = rgb(0.91, 0.92, 0.93);
  const ancho = 612;
  const alto = 792;
  const margen = 36;
  const anchoTexto = ancho - margen * 2;
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
    const mesFecha = new Date(`${mes}-01T00:00:00Z`);
    const tituloMes = new Intl.DateTimeFormat("es-DO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(mesFecha);
    pagina.drawText("Reporte mensual de gastos", {
      x: margen,
      y,
      size: 18,
      font: negrita,
      color: negro,
    });
    y -= 18;
    pagina.drawText(
      `Periodo: ${tituloMes.charAt(0).toUpperCase()}${tituloMes.slice(1)}`,
      {
        x: margen,
        y,
        size: 10,
        font: regular,
        color: gris,
      }
    );
    y -= 20;
  }

  function asegurarEspacio(altura: number) {
    if (y - altura < margen + 20) {
      nuevaPagina();
    }
  }

  function dibujarTituloSeccion(titulo: string, descripcion?: string) {
    asegurarEspacio(descripcion ? 44 : 30);
    pagina.drawText(titulo, {
      x: margen,
      y,
      size: 12,
      font: negrita,
      color: negro,
    });
    y -= 15;
    if (descripcion) {
      pagina.drawText(descripcion, {
        x: margen,
        y,
        size: 8,
        font: regular,
        color: gris,
      });
      y -= 13;
    }
  }

  function dibujarParrafo(texto: string, tamano = 8, color = gris) {
    const lineas = separarLineas(texto, regular, tamano, anchoTexto - 8);
    asegurarEspacio(lineas.length * 11 + 2);
    for (const linea of lineas) {
      pagina.drawText(linea, {
        x: margen + 8,
        y,
        size: tamano,
        font: regular,
        color,
      });
      y -= 11;
    }
  }

  const totalReal = mantenimientos.reduce((total, gasto) => total + gasto.monto, 0);
  const totalProgramado = recurrentes.reduce(
    (total, gasto) => total + gasto.monto,
    0
  );

  nuevaPagina();
  const tarjetas = [
    { titulo: "Gastos realizados", monto: totalReal },
    { titulo: "Recurrentes previstos", monto: totalProgramado },
    { titulo: "Total del periodo", monto: totalReal + totalProgramado },
  ];
  const tarjetaSeparacion = 12;
  const tarjetaAncho =
    (anchoTexto - tarjetaSeparacion * (tarjetas.length - 1)) /
    tarjetas.length;
  const tarjetaAlto = 48;
  const tarjetaY = y - tarjetaAlto + 4;
  tarjetas.forEach((tarjeta, indice) => {
    const x = margen + indice * (tarjetaAncho + tarjetaSeparacion);
    pagina.drawRectangle({
      x,
      y: tarjetaY,
      width: tarjetaAncho,
      height: tarjetaAlto,
      color: rgb(1, 1, 1),
      borderColor: claro,
      borderWidth: 0.8,
    });
    pagina.drawRectangle({
      x,
      y: tarjetaY + tarjetaAlto - 4,
      width: tarjetaAncho,
      height: 4,
      color: rojo,
    });
    pagina.drawText(tarjeta.titulo, {
      x: x + 8,
      y: tarjetaY + 28,
      size: 8,
      font: regular,
      color: negro,
      maxWidth: tarjetaAncho - 16,
    });
    pagina.drawText(
      `DOP ${tarjeta.monto.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      {
        x: x + 8,
        y: tarjetaY + 11,
        size: 9,
        font: negrita,
        color: negro,
        maxWidth: tarjetaAncho - 16,
      }
    );
  });
  y = tarjetaY - 18;

  dibujarTituloSeccion(
    "Mantenimientos registrados",
    "Gastos realizados durante el mes seleccionado."
  );
  if (mantenimientos.length === 0) {
    dibujarParrafo("No hay mantenimientos registrados en este periodo.");
    y -= 7;
  } else {
    for (const gasto of mantenimientos) {
      const titulo = `${fechaLegible(gasto.fecha)} | ${gasto.vehiculo} | ${
        gasto.categoria
      }`;
      const detalle = `Placa: ${gasto.placa || "Pendiente"} | Km: ${gasto.kilometraje.toLocaleString(
        "es-DO"
      )} | DOP ${gasto.monto.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} | Factura: ${gasto.tieneFactura ? "Adjunta" : "No adjunta"}`;
      const descripcion = gasto.descripcion
        ? `Detalle: ${gasto.descripcion}`
        : null;
      const lineasDescripcion = descripcion
        ? separarLineas(descripcion, regular, 8, anchoTexto - 8)
        : [];
      asegurarEspacio(38 + lineasDescripcion.length * 10);
      pagina.drawText(titulo, {
        x: margen + 8,
        y,
        size: 8,
        font: negrita,
        color: negro,
        maxWidth: anchoTexto - 8,
      });
      y -= 12;
      pagina.drawText(detalle, {
        x: margen + 8,
        y,
        size: 8,
        font: regular,
        color: gris,
        maxWidth: anchoTexto - 8,
      });
      y -= 12;
      for (const linea of lineasDescripcion) {
        pagina.drawText(linea, {
          x: margen + 8,
          y,
          size: 8,
          font: regular,
          color: gris,
        });
        y -= 10;
      }
      y -= 5;
    }
  }

  y -= 4;
  dibujarTituloSeccion(
    "Gastos recurrentes programados",
    "Cargos previstos para el mes; no implica que hayan sido pagados."
  );
  if (recurrentes.length === 0) {
    dibujarParrafo("No hay gastos recurrentes programados para este periodo.");
  } else {
    for (const gasto of recurrentes) {
      asegurarEspacio(30);
      pagina.drawText(
        `${fechaLegible(gasto.fechaProgramada)} | ${gasto.vehiculo} | ${gasto.nombre} (${gasto.categoria})`,
        {
          x: margen + 8,
          y,
          size: 8,
          font: negrita,
          color: negro,
          maxWidth: anchoTexto - 8,
        }
      );
      y -= 12;
      pagina.drawText(
        `Placa: ${gasto.placa || "Pendiente"} | Frecuencia: ${
          gasto.frecuencia === "mensual" ? "Mensual" : "Anual"
        } | DOP ${gasto.monto.toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        {
          x: margen + 8,
          y,
          size: 8,
          font: regular,
          color: gris,
          maxWidth: anchoTexto - 8,
        }
      );
      y -= 17;
    }
  }

  for (const [indice, paginaActual] of documento.getPages().entries()) {
    paginaActual.drawLine({
      start: { x: margen, y: margen },
      end: { x: ancho - margen, y: margen },
      thickness: 0.75,
      color: claro,
    });
    paginaActual.drawText(
      `Reporte administrativo | Pagina ${indice + 1} de ${
        documento.getPageCount()
      }`,
      {
        x: margen,
        y: margen - 13,
        size: 7,
        font: regular,
        color: gris,
      }
    );
  }

  return documento.save();
}
