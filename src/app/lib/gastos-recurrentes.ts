export const FRECUENCIAS_GASTO = ["mensual", "anual"] as const;

export type DatosGastoRecurrente = {
  nombre: string;
  frecuencia: (typeof FRECUENCIAS_GASTO)[number];
  fechaInicio: string;
  monto: number;
};

export type GastoRecurrente = DatosGastoRecurrente & {
  id: number;
  vehiculoId: number;
  fechaProxima: string;
};

type ResultadoValidacion =
  | { valido: true; datos: DatosGastoRecurrente }
  | { valido: false; error: string };

export function validarGastoRecurrente(
  entrada: unknown
): ResultadoValidacion {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    return { valido: false, error: "Los datos del gasto no son válidos." };
  }

  const datos = entrada as Record<string, unknown>;
  const nombre =
    typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const frecuencia = datos.frecuencia;
  const fechaInicio = datos.fechaInicio;
  const monto = typeof datos.monto === "number" ? datos.monto : Number.NaN;

  if (nombre.length < 1 || nombre.length > 120) {
    return {
      valido: false,
      error: "El nombre debe tener entre 1 y 120 caracteres.",
    };
  }
  if (
    typeof frecuencia !== "string" ||
    !FRECUENCIAS_GASTO.includes(
      frecuencia as (typeof FRECUENCIAS_GASTO)[number]
    )
  ) {
    return { valido: false, error: "Selecciona una frecuencia válida." };
  }
  if (
    typeof fechaInicio !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) ||
    Number.isNaN(Date.parse(`${fechaInicio}T00:00:00Z`)) ||
    new Date(`${fechaInicio}T00:00:00Z`).toISOString().slice(0, 10) !==
      fechaInicio
  ) {
    return { valido: false, error: "Ingresa una fecha válida." };
  }
  if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) {
    return {
      valido: false,
      error: "El monto debe ser mayor que cero y válido en DOP.",
    };
  }

  return {
    valido: true,
    datos: {
      nombre,
      frecuencia: frecuencia as DatosGastoRecurrente["frecuencia"],
      fechaInicio,
      monto,
    },
  };
}

function fechaEnPeriodo(
  fechaInicio: string,
  frecuencia: DatosGastoRecurrente["frecuencia"],
  periodos: number
): string {
  const [anioInicial, mesInicial, diaInicial] = fechaInicio
    .split("-")
    .map(Number);
  const mesesPorPeriodo = frecuencia === "mensual" ? 1 : 12;
  const mesAbsoluto = anioInicial * 12 + mesInicial - 1 + periodos * mesesPorPeriodo;
  const anio = Math.floor(mesAbsoluto / 12);
  const mes = mesAbsoluto % 12;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const dia = Math.min(diaInicial, ultimoDia);
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(
    2,
    "0"
  )}`;
}

export function calcularFechaProxima(
  fechaInicio: string,
  frecuencia: DatosGastoRecurrente["frecuencia"],
  hoy = new Date().toISOString().slice(0, 10)
): string {
  if (fechaInicio >= hoy) return fechaInicio;

  const [anioHoy, mesHoy] = hoy.split("-").map(Number);
  const [anioInicio, mesInicio] = fechaInicio.split("-").map(Number);
  const mesesPorPeriodo = frecuencia === "mensual" ? 1 : 12;
  const diferenciaMeses =
    (anioHoy - anioInicio) * 12 + (mesHoy - mesInicio);
  let periodos = Math.max(0, Math.floor(diferenciaMeses / mesesPorPeriodo));
  let proximaFecha = fechaEnPeriodo(fechaInicio, frecuencia, periodos);

  while (proximaFecha < hoy) {
    periodos += 1;
    proximaFecha = fechaEnPeriodo(fechaInicio, frecuencia, periodos);
  }

  return proximaFecha;
}
