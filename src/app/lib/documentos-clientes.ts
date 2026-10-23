import { v2 as cloudinary } from "cloudinary";

export const TIPOS_DOCUMENTO_CLIENTE = [
  "foto_perfil",
  "cedula",
  "licencia",
  "otro",
] as const;

export type TipoDocumentoCliente =
  (typeof TIPOS_DOCUMENTO_CLIENTE)[number];
export type TipoRecursoDocumento = "image" | "raw";

const FORMATOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_TAMANO = 8 * 1024 * 1024;

function configurarCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("El servicio de archivos no está configurado.");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function validarArchivoCliente(
  tipo: string,
  bytes: Buffer
): tipo is keyof typeof FORMATOS_PERMITIDOS {
  if (bytes.length === 0 || bytes.length > MAX_TAMANO) return false;
  if (tipo === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (tipo === "image/png") {
    return bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (tipo === "image/webp") {
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return (
    tipo === "application/pdf" &&
    bytes.toString("ascii", 0, 5) === "%PDF-"
  );
}

export function formatoArchivoCliente(tipo: string) {
  return FORMATOS_PERMITIDOS[tipo];
}

export async function subirDocumentoCliente(
  bytes: Buffer,
  mimeType: string
): Promise<{
  publicId: string;
  formato: string;
  version: number;
  resourceType: TipoRecursoDocumento;
}> {
  configurarCloudinary();
  const resourceType: TipoRecursoDocumento =
    mimeType === "application/pdf" ? "raw" : "image";
  const resultado = await new Promise<{
    public_id: string;
    format: string;
    version: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "rent-a-car/clientes",
        resource_type: resourceType,
        type: "authenticated",
        access_mode: "authenticated",
        allowed_formats: [FORMATOS_PERMITIDOS[mimeType]],
        unique_filename: true,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else if (!uploadResult) {
          reject(new Error("Cloudinary no devolvió el archivo subido."));
        } else resolve(uploadResult);
      }
    );
    stream.end(bytes);
  });
  const formato = FORMATOS_PERMITIDOS[mimeType];
  if (resultado.format !== formato) {
    await eliminarDocumentoCliente(resultado.public_id, resourceType);
    throw new Error("Cloudinary devolvió un formato no permitido.");
  }
  return {
    publicId: resultado.public_id,
    formato,
    version: resultado.version,
    resourceType,
  };
}

export function crearUrlPrivadaDocumento(
  publicId: string,
  formato: string,
  version: number,
  resourceType: TipoRecursoDocumento
) {
  configurarCloudinary();
  return cloudinary.url(publicId, {
    secure: true,
    type: "authenticated",
    sign_url: true,
    resource_type: resourceType,
    version,
    format: formato,
  });
}

export async function eliminarDocumentoCliente(
  publicId: string,
  resourceType: TipoRecursoDocumento
) {
  configurarCloudinary();
  const resultado = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    invalidate: true,
  });
  if (resultado.result !== "ok" && resultado.result !== "not found") {
    throw new Error("No se pudo eliminar el archivo almacenado.");
  }
}
