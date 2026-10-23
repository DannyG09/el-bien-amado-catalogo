export const MONEDAS_CONTRATO = ["DOP", "USD"] as const;
export const TIPOS_DESCUENTO = ["fijo", "porcentaje"] as const;
export const TIPOS_PAGO_CONTRATO = ["renta", "deposito"] as const;
export const ESTADOS_CONTRATO = [
  "pendiente_firma",
  "activo",
  "completado",
  "cancelado",
] as const;

export type MonedaContrato = (typeof MONEDAS_CONTRATO)[number];
export type TipoDescuentoContrato = (typeof TIPOS_DESCUENTO)[number];
export type TipoPagoContrato = (typeof TIPOS_PAGO_CONTRATO)[number];
export type EstadoContrato = (typeof ESTADOS_CONTRATO)[number];

export type DatosNuevoContrato = {
  clienteId: number;
  vehiculoId: number;
  moneda: MonedaContrato;
  fechaInicio: string;
  fechaFin: string;
  horaEntrega: string;
  horaDevolucion: string;
  precioDia: number;
  deposito: number;
  tipoDescuento: TipoDescuentoContrato;
  valorDescuento: number;
  lugarEntrega: string | null;
  lugarDevolucion: string | null;
  notas: string | null;
  total: number;
};

function idPositivo(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function montoNoNegativo(valor: unknown): number | null {
  if (
    (typeof valor !== "number" && typeof valor !== "string") ||
    String(valor).trim() === ""
  ) {
    return null;
  }
  const monto = Number(valor);
  return Number.isFinite(monto) && monto >= 0 && monto <= 1_000_000_000
    ? Math.round(monto * 100) / 100
    : null;
}

function textoOpcional(valor: unknown, maximo: number): string | null | false {
  if (valor == null || valor === "") return null;
  if (typeof valor !== "string" || valor.trim().length > maximo) return false;
  return valor.trim() || null;
}

function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function horaValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

export function validarNuevoContrato(
  entrada: unknown
): { valido: true; datos: DatosNuevoContrato } | { valido: false; error: string } {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { valido: false, error: "Completa los datos del contrato." };
  }
  const datos = entrada as Record<string, unknown>;
  const clienteId = idPositivo(datos.clienteId);
  const vehiculoId = idPositivo(datos.vehiculoId);
  const moneda = datos.moneda;
  const tipoDescuento = datos.tipoDescuento;
  const fechaInicio = datos.fechaInicio;
  const fechaFin = datos.fechaFin;
  const horaEntrega = datos.horaEntrega;
  const horaDevolucion = datos.horaDevolucion;
  const precioDia = montoNoNegativo(datos.precioDia);
  const deposito = montoNoNegativo(datos.deposito);
  const valorDescuento = montoNoNegativo(datos.valorDescuento);
  const lugarEntrega = textoOpcional(datos.lugarEntrega, 500);
  const lugarDevolucion = textoOpcional(datos.lugarDevolucion, 500);
  const notas = textoOpcional(datos.notas, 5000);

  if (!clienteId || !vehiculoId) {
    return { valido: false, error: "Selecciona un cliente y un vehículo." };
  }
  if (!MONEDAS_CONTRATO.includes(moneda as MonedaContrato)) {
    return { valido: false, error: "Selecciona DOP o USD como moneda." };
  }
  if (!TIPOS_DESCUENTO.includes(tipoDescuento as TipoDescuentoContrato)) {
    return { valido: false, error: "El tipo de descuento no es válido." };
  }
  if (
    !fechaValida(fechaInicio) ||
    !fechaValida(fechaFin) ||
    fechaFin < fechaInicio
  ) {
    return {
      valido: false,
      error: "Las fechas deben ser válidas y la devolución no puede ser anterior a la entrega.",
    };
  }
  if (!horaValida(horaEntrega) || !horaValida(horaDevolucion)) {
    return { valido: false, error: "Indica horas válidas de entrega y devolución." };
  }
  if (
    fechaInicio === fechaFin &&
    horaDevolucion <= horaEntrega
  ) {
    return {
      valido: false,
      error: "La hora de devolución debe ser posterior a la hora de entrega.",
    };
  }
  if (
    precioDia === null ||
    precioDia <= 0 ||
    deposito === null ||
    valorDescuento === null
  ) {
    return {
      valido: false,
      error: "El precio por día debe ser mayor que cero y los demás montos no pueden ser negativos.",
    };
  }
  if (tipoDescuento === "porcentaje" && valorDescuento > 100) {
    return { valido: false, error: "El descuento porcentual no puede superar 100%." };
  }
  if (
    lugarEntrega === false ||
    lugarDevolucion === false ||
    notas === false
  ) {
    return { valido: false, error: "Uno de los textos del contrato supera el límite permitido." };
  }

  const dias = diasDeRenta(fechaInicio, fechaFin);
  const subtotal = dias * precioDia;
  const descuento =
    tipoDescuento === "porcentaje"
      ? (subtotal * valorDescuento) / 100
      : valorDescuento;
  const total = Math.round(Math.max(0, subtotal - descuento) * 100) / 100;
  if (total > 9_999_999_999.99) {
    return {
      valido: false,
      error: "El total calculado supera el monto máximo permitido para el contrato.",
    };
  }

  return {
    valido: true,
    datos: {
      clienteId,
      vehiculoId,
      moneda: moneda as MonedaContrato,
      fechaInicio,
      fechaFin,
      horaEntrega,
      horaDevolucion,
      precioDia,
      deposito,
      tipoDescuento: tipoDescuento as TipoDescuentoContrato,
      valorDescuento,
      lugarEntrega,
      lugarDevolucion,
      notas,
      total,
    },
  };
}

export function diasDeRenta(inicio: string, fin: string) {
  const [anioInicio, mesInicio, diaInicio] = inicio.split("-").map(Number);
  const [anioFin, mesFin, diaFin] = fin.split("-").map(Number);
  const diferencia =
    Date.UTC(anioFin, mesFin - 1, diaFin) -
    Date.UTC(anioInicio, mesInicio - 1, diaInicio);
  return Math.max(1, Math.ceil(diferencia / 86_400_000));
}

export function validarImagenFirma(
  mime: string,
  bytes: Buffer
): mime is "image/png" | "image/jpeg" {
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) return false;
  if (mime === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  return (
    mime === "image/jpeg" &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}
