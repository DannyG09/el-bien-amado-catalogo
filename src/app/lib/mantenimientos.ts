export const CATEGORIAS_MANTENIMIENTO = [
  "Aceite",
  "Mantenimiento general",
  "Bandas de freno",
  "Combustible",
  "Otro",
] as const;

export type DatosMantenimiento = {
  vehiculoId: number;
  fecha: string;
  categoria: (typeof CATEGORIAS_MANTENIMIENTO)[number];
  monto: number;
  kilometraje: number;
  descripcion: string | null;
};

type ResultadoValidacion =
  | { valido: true; datos: DatosMantenimiento }
  | { valido: false; error: string };

export function validarDatosMantenimiento(
  entrada: unknown
): ResultadoValidacion {
  if (
    typeof entrada !== "object" ||
    entrada === null ||
    Array.isArray(entrada)
  ) {
    return { valido: false, error: "Los datos del mantenimiento no son válidos." };
  }

  const datos = entrada as Record<string, unknown>;
  const vehiculoId =
    typeof datos.vehiculoId === "number" ? datos.vehiculoId : Number.NaN;
  const monto = typeof datos.monto === "number" ? datos.monto : Number.NaN;
  const kilometraje =
    typeof datos.kilometraje === "number" ? datos.kilometraje : Number.NaN;
  const fecha = datos.fecha;
  const categoria = datos.categoria;
  const descripcion = datos.descripcion;

  if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
    return { valido: false, error: "Selecciona un vehículo válido." };
  }

  if (
    typeof categoria !== "string" ||
    !CATEGORIAS_MANTENIMIENTO.includes(
      categoria as (typeof CATEGORIAS_MANTENIMIENTO)[number]
    )
  ) {
    return {
      valido: false,
      error: "Selecciona una categoría de mantenimiento válida.",
    };
  }

  if (
    typeof fecha !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) ||
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha
  ) {
    return { valido: false, error: "Ingresa una fecha válida." };
  }

  if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99) {
    return {
      valido: false,
      error: "El monto debe ser mayor que cero y válido en DOP.",
    };
  }

  if (!Number.isSafeInteger(kilometraje) || kilometraje < 0) {
    return {
      valido: false,
      error:
        "El kilometraje debe ser un número entero igual o mayor que cero.",
    };
  }

  if (
    (descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== "string") ||
    (typeof descripcion === "string" && descripcion.trim().length > 500)
  ) {
    return {
      valido: false,
      error: "La descripción no puede superar los 500 caracteres.",
    };
  }

  return {
    valido: true,
    datos: {
      vehiculoId,
      fecha,
      categoria: categoria as DatosMantenimiento["categoria"],
      monto,
      kilometraje,
      descripcion:
        typeof descripcion === "string" && descripcion.trim()
          ? descripcion.trim()
          : null,
    },
  };
}
