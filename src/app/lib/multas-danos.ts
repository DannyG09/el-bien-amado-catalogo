export const TIPOS_MULTA_DANO = ["multa", "dano"] as const;
export const ESTADOS_MULTA_DANO = ["pendiente", "pagado"] as const;

export type TipoMultaDano = (typeof TIPOS_MULTA_DANO)[number];
export type EstadoMultaDano = (typeof ESTADOS_MULTA_DANO)[number];

export type DatosMultaDano = {
  vehiculoId: number;
  clienteId: number | null;
  nombreClienteManual: string | null;
  contratoId: number | null;
  tipo: TipoMultaDano;
  fecha: string;
  descripcion: string;
  monto: number;
  estado: EstadoMultaDano;
  fechaPago: string | null;
};

type ValidacionDatosMultaDano =
  | { valido: true; datos: DatosMultaDano }
  | { valido: false; error: string };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function validarFecha(valor: unknown): valor is string {
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

function validarIdOpcional(valor: unknown): number | null | undefined {
  if (valor === undefined || valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : undefined;
}

export function validarDatosMultaDano(
  valor: unknown
): ValidacionDatosMultaDano {
  if (!esObjeto(valor)) {
    return { valido: false, error: "Los datos del registro no son válidos." };
  }

  const vehiculoId = Number(valor.vehiculoId);
  const clienteId = validarIdOpcional(valor.clienteId);
  const contratoId = validarIdOpcional(valor.contratoId);
  const montoTexto = String(valor.monto ?? "").trim();
  const monto = Number(montoTexto);
  const descripcion =
    typeof valor.descripcion === "string" ? valor.descripcion.trim() : "";
  const nombreClienteManual =
    typeof valor.nombreClienteManual === "string"
      ? valor.nombreClienteManual.trim()
      : "";
  const fechaPago =
    valor.fechaPago === null || valor.fechaPago === ""
      ? null
      : valor.fechaPago;

  if (!Number.isSafeInteger(vehiculoId) || vehiculoId <= 0) {
    return { valido: false, error: "Selecciona un vehículo válido." };
  }
  if (clienteId === undefined || contratoId === undefined) {
    return {
      valido: false,
      error: "El cliente o el contrato seleccionado no es válido.",
    };
  }
  if (
    valor.nombreClienteManual !== undefined &&
    valor.nombreClienteManual !== null &&
    typeof valor.nombreClienteManual !== "string"
  ) {
    return {
      valido: false,
      error: "El nombre manual del cliente no es válido.",
    };
  }
  if (
    nombreClienteManual.length > 200 ||
    (nombreClienteManual !== "" &&
      (clienteId !== null || contratoId !== null))
  ) {
    return {
      valido: false,
      error:
        "Usa un cliente registrado o un nombre manual, pero no ambos. El nombre admite hasta 200 caracteres.",
    };
  }
  if (
    typeof valor.tipo !== "string" ||
    !TIPOS_MULTA_DANO.includes(valor.tipo as TipoMultaDano)
  ) {
    return { valido: false, error: "Selecciona un tipo de incidente válido." };
  }
  if (!validarFecha(valor.fecha)) {
    return { valido: false, error: "La fecha del incidente no es válida." };
  }
  if (descripcion.length < 1 || descripcion.length > 1000) {
    return {
      valido: false,
      error: "La descripción debe tener entre 1 y 1000 caracteres.",
    };
  }
  if (
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(montoTexto) ||
    !Number.isFinite(monto) ||
    monto <= 0
  ) {
    return {
      valido: false,
      error: "El monto debe ser mayor que cero y tener hasta dos decimales.",
    };
  }
  if (
    typeof valor.estado !== "string" ||
    !ESTADOS_MULTA_DANO.includes(valor.estado as EstadoMultaDano)
  ) {
    return { valido: false, error: "Selecciona un estado de pago válido." };
  }
  if (valor.estado === "pagado" && !validarFecha(fechaPago)) {
    return {
      valido: false,
      error: "Indica una fecha válida para el pago.",
    };
  }

  return {
    valido: true,
    datos: {
      vehiculoId,
      clienteId,
      nombreClienteManual: nombreClienteManual || null,
      contratoId,
      tipo: valor.tipo as TipoMultaDano,
      fecha: valor.fecha,
      descripcion,
      monto,
      estado: valor.estado as EstadoMultaDano,
      fechaPago:
        valor.estado === "pagado" && typeof fechaPago === "string"
          ? fechaPago
          : null,
    },
  };
}
