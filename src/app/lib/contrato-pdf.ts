import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";

type ImagenFirma = {
  bytes: Buffer | Uint8Array;
  mime: "image/png" | "image/jpeg";
};

export type DatosPdfContrato = {
  id: number;
  estado: string;
  moneda: "DOP" | "USD";
  cliente: {
    nombre: string;
    apellido: string;
    cedula: string;
    nacionalidad: string;
    telefono: string | null;
    direccion: string;
    email: string | null;
  };
  vehiculo: {
    marca: string;
    modelo: string;
    anio: number;
    placa: string | null;
  };
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  precioDia: number;
  deposito: number;
  tipoDescuento: string;
  valorDescuento: number;
  total: number;
  lugarEntrega: string | null;
  lugarDevolucion: string | null;
  notas: string | null;
  firmadoEn: string | null;
  pagos: {
    tipo: string;
    monto: number;
    metodo: string;
    fecha: string;
  }[];
};

export type ConfiguracionPdfContrato = {
  nombreEmpresa: string;
  telefono: string | null;
  email: string | null;
  terminos: string;
  firmaEmpresa: ImagenFirma | null;
};

function moneda(valor: number, codigo: string) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: codigo,
    minimumFractionDigits: 2,
  }).format(valor);
}

function fecha(valor: string) {
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

function textoSeguro(valor: string) {
  return valor.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export async function crearPdfContrato(
  contrato: DatosPdfContrato,
  configuracion: ConfiguracionPdfContrato,
  firmaCliente: ImagenFirma | null
) {
  const pdf = await PDFDocument.create();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina: PDFPage = pdf.addPage([612, 792]);
  let y = 748;

  const nuevaPagina = () => {
    pagina = pdf.addPage([612, 792]);
    y = 748;
  };
  const espacio = (cantidad: number) => {
    y -= cantidad;
    if (y < 55) nuevaPagina();
  };
  const linea = (texto: string, opciones?: { bold?: boolean; size?: number }) => {
    const size = opciones?.size ?? 10;
    if (y < 55) nuevaPagina();
    pagina.drawText(textoSeguro(texto), {
      x: 48,
      y,
      size,
      font: opciones?.bold ? negrita : fuente,
      color: rgb(0.12, 0.15, 0.2),
      maxWidth: 516,
    });
    y -= size + 7;
  };
  const seccion = (titulo: string) => {
    espacio(12);
    linea(titulo, { bold: true, size: 12 });
    pagina.drawLine({
      start: { x: 48, y: y + 2 },
      end: { x: 564, y: y + 2 },
      thickness: 0.7,
      color: rgb(0.82, 0.85, 0.89),
    });
    y -= 9;
  };
  const dibujarFirma = async (imagen: ImagenFirma | null, x: number, top: number) => {
    if (!imagen) return;
    const incrustada =
      imagen.mime === "image/png"
        ? await pdf.embedPng(imagen.bytes)
        : await pdf.embedJpg(imagen.bytes);
    const escalado = incrustada.scaleToFit(190, 65);
    pagina.drawImage(incrustada, {
      x,
      y: top - escalado.height,
      width: escalado.width,
      height: escalado.height,
    });
  };

  linea(configuracion.nombreEmpresa, { bold: true, size: 18 });
  if (configuracion.telefono) linea(`Teléfono: ${configuracion.telefono}`);
  if (configuracion.email) linea(`Correo: ${configuracion.email}`);
  espacio(7);
  linea(`CONTRATO DE RENTA DE VEHÍCULO #${contrato.id}`, {
    bold: true,
    size: 15,
  });
  linea(`Estado: ${contrato.estado.replaceAll("_", " ").toUpperCase()}`);

  seccion("DATOS DEL CLIENTE");
  linea(`Nombre: ${contrato.cliente.nombre} ${contrato.cliente.apellido}`);
  linea(`Cédula: ${contrato.cliente.cedula}`);
  linea(`Nacionalidad: ${contrato.cliente.nacionalidad}`);
  linea(`Teléfono: ${contrato.cliente.telefono ?? "No registrado"}`);
  linea(`Correo: ${contrato.cliente.email ?? "No registrado"}`);
  linea(`Dirección: ${contrato.cliente.direccion}`);

  seccion("VEHÍCULO Y PERÍODO");
  linea(
    `Vehículo: ${contrato.vehiculo.marca} ${contrato.vehiculo.modelo} ${contrato.vehiculo.anio}`
  );
  linea(`Placa: ${contrato.vehiculo.placa ?? "No registrada"}`);
  linea(`Entrega: ${fecha(contrato.fechaInicio)} a las ${contrato.horaEntrega}`);
  linea(`Devolución: ${fecha(contrato.fechaFin)} a las ${contrato.horaDevolucion}`);
  linea(`Lugar de entrega: ${contrato.lugarEntrega ?? "No especificado"}`);
  linea(`Lugar de devolución: ${contrato.lugarDevolucion ?? "No especificado"}`);

  seccion("DETALLE DE RENTA");
  linea(`Precio diario: ${moneda(contrato.precioDia, contrato.moneda)}`);
  linea(
    `Descuento: ${contrato.tipoDescuento === "porcentaje" ? `${contrato.valorDescuento}%` : moneda(contrato.valorDescuento, contrato.moneda)}`
  );
  linea(`Depósito/garantía: ${moneda(contrato.deposito, contrato.moneda)}`);
  linea(`Total de renta: ${moneda(contrato.total, contrato.moneda)}`, {
    bold: true,
  });

  if (contrato.pagos.length > 0) {
    seccion("PAGOS REGISTRADOS");
    contrato.pagos.forEach((pago) =>
      linea(
        `${fecha(pago.fecha)} · ${pago.tipo} · ${moneda(pago.monto, contrato.moneda)} · ${pago.metodo}`
      )
    );
  }
  if (contrato.notas) {
    seccion("NOTAS");
    contrato.notas.split(/\r?\n/).forEach((texto) => linea(texto));
  }

  seccion("TÉRMINOS Y CONDICIONES");
  configuracion.terminos.split(/\r?\n/).forEach((parrafo) => {
    if (!parrafo.trim()) {
      espacio(4);
      return;
    }
    let restante = parrafo;
    while (restante.length > 88) {
      let corte = restante.lastIndexOf(" ", 88);
      if (corte <= 0) corte = 88;
      linea(restante.slice(0, corte));
      restante = restante.slice(corte).trimStart();
    }
    linea(restante);
  });

  seccion("FIRMAS");
  const yFirma = y - 3;
  await dibujarFirma(configuracion.firmaEmpresa, 58, yFirma);
  await dibujarFirma(firmaCliente, 355, yFirma);
  const yLinea = yFirma - 75;
  pagina.drawLine({
    start: { x: 48, y: yLinea },
    end: { x: 275, y: yLinea },
    thickness: 0.8,
    color: rgb(0.35, 0.38, 0.42),
  });
  pagina.drawLine({
    start: { x: 337, y: yLinea },
    end: { x: 564, y: yLinea },
    thickness: 0.8,
    color: rgb(0.35, 0.38, 0.42),
  });
  pagina.drawText(textoSeguro(configuracion.nombreEmpresa), {
    x: 48,
    y: yLinea - 14,
    size: 8,
    font: fuente,
  });
  pagina.drawText(
    textoSeguro(`${contrato.cliente.nombre} ${contrato.cliente.apellido}`),
    { x: 337, y: yLinea - 14, size: 8, font: fuente }
  );
  if (contrato.firmadoEn) {
    pagina.drawText(`Firmado: ${fecha(contrato.firmadoEn)}`, {
      x: 337,
      y: yLinea - 26,
      size: 8,
      font: fuente,
    });
  }

  return pdf.save();
}
