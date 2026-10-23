import { CODIGOS_NACIONALIDAD } from "./nacionalidades";

export type DatosCliente = {
  nombre: string;
  apellido: string;
  cedula: string;
  nacionalidad: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  vencimientoLicencia: string;
  direccion: string;
  notas: string | null;
};

export function validarDatosCliente(body: unknown):
  | { valido: true; datos: DatosCliente }
  | { valido: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valido: false, error: "Los datos del cliente no son válidos." };
  }
  const datos = body as Record<string, unknown>;
  const texto = (campo: string, maximo: number) => {
    const valor = datos[campo];
    return typeof valor === "string" && valor.trim().length <= maximo
      ? valor.trim()
      : null;
  };
  const nombre = texto("nombre", 100);
  const apellido = texto("apellido", 100);
  const cedula = texto("cedula", 50);
  const nacionalidad = texto("nacionalidad", 2);
  const vencimientoLicencia = texto("vencimientoLicencia", 10);
  const direccion = texto("direccion", 2000);
  const telefono = datos.telefono == null ? "" : texto("telefono", 40);
  const whatsapp = datos.whatsapp == null ? "" : texto("whatsapp", 40);
  const email = datos.email == null ? "" : texto("email", 254);
  const notas = datos.notas == null ? "" : texto("notas", 5000);

  if (
    !nombre ||
    !apellido ||
    !cedula ||
    !nacionalidad ||
    !CODIGOS_NACIONALIDAD.has(nacionalidad) ||
    !vencimientoLicencia ||
    !direccion ||
    telefono === null ||
    whatsapp === null ||
    email === null ||
    notas === null
  ) {
    return {
      valido: false,
      error: "Completa los datos requeridos y verifica la longitud de los campos.",
    };
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(vencimientoLicencia) ||
    Number.isNaN(Date.parse(`${vencimientoLicencia}T00:00:00Z`)) ||
    new Date(`${vencimientoLicencia}T00:00:00Z`)
      .toISOString()
      .slice(0, 10) !== vencimientoLicencia
  ) {
    return {
      valido: false,
      error: "El vencimiento de la licencia no es válido.",
    };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valido: false, error: "El email no tiene un formato válido." };
  }

  return {
    valido: true,
    datos: {
      nombre,
      apellido,
      cedula,
      nacionalidad,
      telefono: telefono || null,
      whatsapp: whatsapp || null,
      email: email || null,
      vencimientoLicencia,
      direccion,
      notas: notas || null,
    },
  };
}
